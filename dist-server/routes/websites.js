import { Router } from "express";
import { z } from "zod";
import { Website } from "../models/Website.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { authGuard } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
import { deployWebsiteApp, getSetupStatus, deleteApp, restartApp, addCustomDomain, listCustomDomains, appExists } from "../services/heroku.js";
const router = Router();
/** SQ prices for website hosting. */
export const WEBSITE_PRICE_SQ = Number(process.env.WEBSITE_PRICE_SQ || 50);
export const DOMAIN_PRICE_SQ = Number(process.env.DOMAIN_PRICE_SQ || 20);
function mapSite(s) {
    return {
        _id: String(s._id),
        appName: s.appName,
        sourceUrl: s.sourceUrl,
        herokuUrl: s.herokuUrl,
        customDomain: s.customDomain,
        dnsTarget: s.dnsTarget,
        domainStatus: s.domainStatus,
        status: s.status,
        priceSq: s.priceSq,
        createdAt: s.createdAt
    };
}
router.get("/pricing", (_req, res) => res.json({ websiteSq: WEBSITE_PRICE_SQ, domainSq: DOMAIN_PRICE_SQ }));
router.get("/my", authGuard, async (req, res) => {
    const sites = await Website.find({ userId: req.user._id, status: { $ne: "deleted" } }).sort({ createdAt: -1 }).lean();
    res.json({ sites: sites.map(mapSite), pricing: { websiteSq: WEBSITE_PRICE_SQ, domainSq: DOMAIN_PRICE_SQ } });
});
const createSchema = z.object({
    appName: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
    sourceUrl: z.string().url().max(300)
});
/** Deploy a website from a GitHub tarball URL. SQ is refunded when Heroku refuses. */
router.post("/", authGuard, banCheck, async (req, res) => {
    const parsed = createSchema.safeParse(req.body || {});
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid details" });
        return;
    }
    if (await appExists(parsed.data.appName)) {
        res.status(409).json({ error: "That app name is already taken" });
        return;
    }
    const debited = await User.findOneAndUpdate({ _id: req.user._id, txCoins: { $gte: WEBSITE_PRICE_SQ } }, { $inc: { txCoins: -WEBSITE_PRICE_SQ } }, { new: true });
    if (!debited) {
        res.status(402).json({ error: `Insufficient SQ. Website hosting costs ${WEBSITE_PRICE_SQ} SQ.` });
        return;
    }
    const result = await deployWebsiteApp(parsed.data.appName, parsed.data.sourceUrl).catch(() => ({ success: false }));
    if (!result.success) {
        await User.updateOne({ _id: req.user._id }, { $inc: { txCoins: WEBSITE_PRICE_SQ } });
        res.status(502).json({ error: "Heroku refused the deployment. Your SQ was refunded automatically." });
        return;
    }
    const site = await Website.create({
        userId: req.user._id,
        appName: parsed.data.appName,
        sourceUrl: parsed.data.sourceUrl,
        herokuUrl: `https://${parsed.data.appName}.herokuapp.com`,
        setupId: result.setupId || "",
        priceSq: WEBSITE_PRICE_SQ,
        status: "deploying"
    });
    await Transaction.create({
        userId: req.user._id, type: "website", txAmount: WEBSITE_PRICE_SQ, tzsAmount: 0,
        status: "success", itemName: `Website hosting ${parsed.data.appName}`, reference: String(site._id)
    }).catch(() => { });
    res.json({ ok: true, site: mapSite(site.toObject()), charged: WEBSITE_PRICE_SQ, balance: debited.txCoins });
});
/** Poll the build until Heroku reports success. */
router.get("/:id/status", authGuard, async (req, res) => {
    const site = await Website.findOne({ _id: req.params.id, userId: req.user._id });
    if (!site) {
        res.status(404).json({ error: "Website not found" });
        return;
    }
    if (site.status === "deploying" && site.setupId) {
        const state = await getSetupStatus(site.setupId).catch(() => ({ status: "unknown" }));
        if (state.status === "succeeded")
            site.status = "running";
        if (state.status === "failed")
            site.status = "failed";
        site.updatedAt = new Date();
        await site.save();
    }
    res.json({ site: mapSite(site.toObject()) });
});
/** Attach a custom domain. Returns the CNAME target the user must configure. */
router.post("/:id/domain", authGuard, banCheck, async (req, res) => {
    const parsed = z.object({
        domain: z.string().min(4).max(120).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Enter a valid domain")
    }).safeParse(req.body || {});
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid domain" });
        return;
    }
    const site = await Website.findOne({ _id: req.params.id, userId: req.user._id });
    if (!site) {
        res.status(404).json({ error: "Website not found" });
        return;
    }
    const debited = await User.findOneAndUpdate({ _id: req.user._id, txCoins: { $gte: DOMAIN_PRICE_SQ } }, { $inc: { txCoins: -DOMAIN_PRICE_SQ } }, { new: true });
    if (!debited) {
        res.status(402).json({ error: `Insufficient SQ. A custom domain costs ${DOMAIN_PRICE_SQ} SQ.` });
        return;
    }
    const added = await addCustomDomain(site.appName, parsed.data.domain.toLowerCase()).catch(() => null);
    if (!added) {
        await User.updateOne({ _id: req.user._id }, { $inc: { txCoins: DOMAIN_PRICE_SQ } });
        res.status(502).json({ error: "Heroku rejected that domain. Your SQ was refunded automatically." });
        return;
    }
    site.customDomain = parsed.data.domain.toLowerCase();
    site.dnsTarget = added.cname;
    site.domainStatus = "pending";
    site.updatedAt = new Date();
    await site.save();
    await Transaction.create({
        userId: req.user._id, type: "domain", txAmount: DOMAIN_PRICE_SQ, tzsAmount: 0,
        status: "success", itemName: `Custom domain ${site.customDomain}`, reference: String(site._id)
    }).catch(() => { });
    res.json({ ok: true, site: mapSite(site.toObject()), charged: DOMAIN_PRICE_SQ, balance: debited.txCoins });
});
/** Re-check DNS status of the attached domain. */
router.get("/:id/domain", authGuard, async (req, res) => {
    const site = await Website.findOne({ _id: req.params.id, userId: req.user._id });
    if (!site) {
        res.status(404).json({ error: "Website not found" });
        return;
    }
    if (site.customDomain) {
        const domains = await listCustomDomains(site.appName).catch(() => []);
        const match = domains.find((d) => d.hostname === site.customDomain);
        if (match) {
            site.dnsTarget = match.cname || site.dnsTarget;
            site.domainStatus = match.status === "succeeded" ? "active" : match.status === "failed" ? "failed" : "pending";
            await site.save();
        }
    }
    res.json({ site: mapSite(site.toObject()) });
});
router.post("/:id/restart", authGuard, async (req, res) => {
    const site = await Website.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!site) {
        res.status(404).json({ error: "Website not found" });
        return;
    }
    const ok = await restartApp(String(site.appName)).catch(() => false);
    res.json({ ok });
});
router.delete("/:id", authGuard, async (req, res) => {
    const site = await Website.findOne({ _id: req.params.id, userId: req.user._id });
    if (!site) {
        res.status(404).json({ error: "Website not found" });
        return;
    }
    await deleteApp(site.appName).catch(() => false);
    site.status = "deleted";
    await site.save();
    res.json({ ok: true });
});
export default router;
