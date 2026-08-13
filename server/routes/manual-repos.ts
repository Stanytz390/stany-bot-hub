import { Router } from "express";
import { z } from "zod";
import { ManualRepo, BlockedRepo, repoKeyFromUrl } from "../models/ManualRepo.js";
import { Bot } from "../models/Bot.js";
import { User } from "../models/User.js";
import { Team } from "../models/Team.js";
import { Transaction } from "../models/Transaction.js";
import { getSetting } from "../models/AppSetting.js";
import { authGuard, type AuthRequest } from "../middleware/auth.js";
import { banCheck } from "../middleware/banCheck.js";
import { superAdminGuard } from "../middleware/roleGuard.js";
import { deployBotApp, findBestTeam, getSetupStatus, appExists, deleteApp } from "../services/heroku.js";
import { notifyOwner } from "../services/notify.js";
import { writeAudit } from "../models/AuditLog.js";


const router = Router();

interface RepoMeta {
  ok: boolean;
  name: string;
  description: string;
  imageUrl: string;
  branch: string;
  vars: { key: string; description: string; required: boolean; value: string }[];
}

const AUTO_VARS = new Set([
  "SESSION", "SESSION_ID", "SESSION_TOKEN", "SESSION_DATA", "CREDS", "AUTH_CREDS",
  "BOT_NAME", "HEROKU_APP_NAME", "HEROKU_API_KEY", "EXPIRY_NOTICE",
]);

async function inspectRepo(repoUrl: string): Promise<RepoMeta> {
  const empty: RepoMeta = { ok: false, name: "", description: "", imageUrl: "", branch: "", vars: [] };
  const key = repoKeyFromUrl(repoUrl);
  if (!key) return empty;

  const api = await fetch(`https://api.github.com/repos/${key}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "Stany-Hosting" },
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (!api || !api.ok) return empty;
  const repo = (await api.json().catch(() => null)) as { name?: string; description?: string; default_branch?: string; private?: boolean } | null;
  if (!repo || repo.private) return empty;

  const branch = repo.default_branch || "main";
  let name = repo.name || key.split("/")[1];
  let description = repo.description || "";
  let imageUrl = "";
  let vars: RepoMeta["vars"] = [];

  const appRes = await fetch(`https://raw.githubusercontent.com/${key}/${branch}/app.json`, { signal: AbortSignal.timeout(10000) }).catch(() => null);
  if (appRes && appRes.ok) {
    const appJson = (await appRes.json().catch(() => null)) as
      | { name?: string; description?: string; logo?: string; image?: string; env?: Record<string, { description?: string; required?: boolean; value?: string; generator?: string }> }
      | null;
    if (appJson) {
      name = appJson.name || name;
      description = appJson.description || description;
      imageUrl = appJson.logo || appJson.image || "";
      if (appJson.env) {
        vars = Object.entries(appJson.env)
          .filter(([k]) => !AUTO_VARS.has(k))
          .map(([k, v]) => ({ key: k, description: v.description || k, required: v.required !== false && !v.value && !v.generator, value: v.value || "" }));
      }
    }
  }

  return { ok: true, name, description, imageUrl, branch, vars };
}

/** Preview a user-supplied repo before paying. */
router.post("/inspect", authGuard, banCheck, async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({ repoUrl: z.string().url() }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Enter a valid GitHub repository URL" }); return; }
    const key = repoKeyFromUrl(parsed.data.repoUrl);
    if (!key) { res.status(400).json({ error: "Only github.com repositories are supported" }); return; }
    if (await BlockedRepo.findOne({ repoKey: key }).lean()) {
      res.status(403).json({ error: "This repository has been blocked by the admin" });
      return;
    }
    const meta = await inspectRepo(parsed.data.repoUrl);
    if (!meta.ok) { res.status(404).json({ error: "Repository not found or is private" }); return; }
    const costTx = Number(await getSetting<number>("manualDeployCostTx")) || 20;
    res.json({ ...meta, repoKey: key, costTx });
  } catch {
    res.status(500).json({ error: "Could not inspect repository" });
  }
});

/** Deploy a user-supplied repo. */
router.post("/deploy", authGuard, banCheck, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      repoUrl: z.string().url(),
      appName: z.string().min(5).max(30).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes"),
      sessionVar: z.string().min(1),
      months: z.number().min(1).max(12).default(1),
      extraVars: z.record(z.string(), z.string()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" }); return; }
    const { repoUrl, appName, sessionVar, months, extraVars } = parsed.data;

    if ((await getSetting<boolean>("manualDeployEnabled")) === false) {
      res.status(403).json({ error: "Manual repository deployment is currently disabled" });
      return;
    }

    const repoKey = repoKeyFromUrl(repoUrl);
    if (!repoKey) { res.status(400).json({ error: "Only github.com repositories are supported" }); return; }
    if (await BlockedRepo.findOne({ repoKey }).lean()) {
      res.status(403).json({ error: "This repository has been blocked by the admin" });
      return;
    }

    const meta = await inspectRepo(repoUrl);
    if (!meta.ok) { res.status(404).json({ error: "Repository not found or is private" }); return; }

    if (await Bot.findOne({ herokuAppName: appName })) {
      res.status(400).json({ error: "That app name is already taken" });
      return;
    }

    const costPerMonth = Number(await getSetting<number>("manualDeployCostTx")) || 20;
    const cost = costPerMonth * months;

    const user = await User.findById(req.user!._id);
    if (!user) { res.status(404).json({ error: "Account not found" }); return; }
    if (user.txCoins < cost) { res.status(403).json({ error: "Insufficient SQ Coins", code: "INSUFFICIENT_COINS" }); return; }

    const teams = await Team.find({ active: true });
    const teamNames = teams.length > 0 ? teams.map((t) => t.name) : ["toxicxtech254"];
    const bestTeam = await findBestTeam(teamNames);
    if (!bestTeam) { res.status(500).json({ error: "No available teams for deployment" }); return; }

    const deployedAt = new Date();
    const expiresAt = new Date(deployedAt.getTime() + months * 30 * 24 * 60 * 60 * 1000);
    const bot = await Bot.create({
      userId: user._id, herokuAppName: appName, phoneNumber: "", sessionVar,
      deployedAt, expiresAt, isTrial: false, status: "building", teamName: bestTeam,
      templateId: "", templateName: `Custom: ${meta.name}`, sessionIdUrl: "", source: "manual",
    });

    user.txCoins -= cost;
    user.bots.push(bot._id);
    await user.save();
    await Transaction.create({ userId: user._id, type: "deploy", txAmount: cost, tzsAmount: 0, status: "success" });

    const record = await ManualRepo.create({
      userId: user._id,
      userEmail: user.email,
      username: (user as unknown as { username?: string }).username || "",
      repoUrl, repoKey, appName, botId: bot._id, costTx: cost,
    });

    writeAudit({
      action: "repo.deploy",
      actorId: user._id,
      actorEmail: user.email,
      actorRole: (user as unknown as { role?: string }).role || "user",
      targetLabel: appName,
      after: `${repoKey} · ${months}m · ${cost} SQ`,
      meta: `coins:-${cost}`,
      ip: (req.headers["x-forwarded-for"] as string) || req.ip || "",
    }).catch(() => {});

    res.json({ success: true, bot, repo: record });



    (async () => {
      try {
        const tarballUrl = `https://api.github.com/repos/${repoKey}/tarball/${meta.branch}`;
        const envOverrides: Record<string, string> = {
          ...(extraVars || {}),
          SESSION: sessionVar,
          BOT_NAME: appName,
          HEROKU_APP_NAME: appName,
          HEROKU_API_KEY: process.env.HEROKU_API_KEY || "",
        };
        const deployed = await deployBotApp(appName, bestTeam, sessionVar, "", false, tarballUrl, envOverrides);
        if (deployed.success && deployed.setupId) {
          await Bot.findByIdAndUpdate(bot._id, { setupId: deployed.setupId });
          let attempts = 0;
          const poll = async (): Promise<void> => {
            if (attempts >= 24) {
              const exists = await appExists(appName).catch(() => false);
              await Bot.findByIdAndUpdate(bot._id, {
                status: exists ? "running" : "stopped",
                failReason: exists ? "" : "Build timed out on Heroku — the app was never created.",
              });
              return;
            }
            attempts++;
            const { status } = await getSetupStatus(deployed.setupId!).catch(() => ({ status: "unknown" }));
            if (status === "succeeded") {
              await Bot.findByIdAndUpdate(bot._id, { status: "running", failReason: "" });
              notifyOwner(`🚀 *Custom Repo Deployed*\n\nUser: \`${user.email}\`\nApp: \`${appName}\`\nRepo: ${repoUrl}\nCost: ${cost} SQ`).catch(() => {});
            } else if (status === "failed") {
              await Bot.findByIdAndUpdate(bot._id, { status: "stopped", failReason: "Build failed — this repository could not be deployed." });
            } else {
              setTimeout(() => { poll().catch(() => {}); }, 15000);
            }
          };
          setTimeout(() => { poll().catch(() => {}); }, 15000);
        } else {
          await Bot.findByIdAndUpdate(bot._id, {
            status: deployed.success ? "running" : "stopped",
            failReason: deployed.success ? "" : "Heroku rejected the deployment request.",
          });

        }
      } catch { /* deployment errors surface through bot status */ }
    })();
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

/** My custom repos. */
router.get("/mine", authGuard, async (req: AuthRequest, res) => {
  res.json(await ManualRepo.find({ userId: req.user!._id }).sort({ createdAt: -1 }).lean());
});

// ===== Admin =====
router.get("/admin/all", authGuard, superAdminGuard, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 30);
  const search = String(req.query.search || "").trim();
  const filter = search
    ? { $or: [{ repoKey: new RegExp(search, "i") }, { userEmail: new RegExp(search, "i") }, { appName: new RegExp(search, "i") }] }
    : {};
  const [items, total] = await Promise.all([
    ManualRepo.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ManualRepo.countDocuments(filter),
  ]);
  const blocked = await BlockedRepo.find().lean();
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1, blocked });
});

/** Actor details for audit rows written from admin endpoints. */
function actorOf(req: AuthRequest) {
  const u = req.user as unknown as { _id?: unknown; email?: string; role?: string } | undefined;
  return {
    actorId: u?._id,
    actorEmail: u?.email || "",
    actorRole: u?.role || "admin",
    ip: (req.headers["x-forwarded-for"] as string) || req.ip || "",
  };
}

/** Block a repo globally (optionally tearing down the deployed app). */
router.post("/admin/:id/block", authGuard, superAdminGuard, async (req: AuthRequest, res) => {
  try {
    const reason = String((req.body as { reason?: string })?.reason || "Blocked by admin");
    const repo = await ManualRepo.findById(req.params.id);
    if (!repo) { res.status(404).json({ error: "Not found" }); return; }
    repo.blocked = true;
    repo.blockReason = reason;
    await repo.save();
    await BlockedRepo.findOneAndUpdate({ repoKey: repo.repoKey }, { repoKey: repo.repoKey, reason }, { upsert: true });
    writeAudit({ action: "repo.block", ...actorOf(req), targetId: repo._id, targetLabel: repo.repoKey, before: "allowed", after: "blocked", meta: reason }).catch(() => {});
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Server error" }); }
});

router.post("/admin/:id/unblock", authGuard, superAdminGuard, async (req: AuthRequest, res) => {
  const repo = await ManualRepo.findById(req.params.id);
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  repo.blocked = false;
  repo.blockReason = "";
  await repo.save();
  await BlockedRepo.deleteOne({ repoKey: repo.repoKey });
  writeAudit({ action: "repo.unblock", ...actorOf(req), targetId: repo._id, targetLabel: repo.repoKey, before: "blocked", after: "allowed" }).catch(() => {});
  res.json({ ok: true });
});

/** Delete the record and tear down the deployed app. */
router.delete("/admin/:id", authGuard, superAdminGuard, async (req: AuthRequest, res) => {
  try {
    const repo = await ManualRepo.findById(req.params.id);
    if (!repo) { res.status(404).json({ error: "Not found" }); return; }
    if (repo.appName) {
      await deleteApp(repo.appName).catch(() => {});
      await Bot.findOneAndUpdate({ herokuAppName: repo.appName }, { status: "deleted", failReason: "Removed by admin" });
    }
    await ManualRepo.findByIdAndDelete(repo._id);
    writeAudit({ action: "repo.delete", ...actorOf(req), targetId: repo._id, targetLabel: repo.repoKey, before: repo.appName, after: "deleted" }).catch(() => {});
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Server error" }); }
});


export default router;
