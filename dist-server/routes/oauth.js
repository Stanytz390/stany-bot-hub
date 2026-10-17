import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/User.js";
import { getClientIP, generateReferralCode, recordIPAndFingerprint } from "../utils/fingerprint.js";
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
function appOrigin(req) {
    return (process.env.APP_URL ||
        process.env.FRONTEND_ORIGIN ||
        `${req.headers["x-forwarded-proto"] || req.protocol}://${req.headers.host}`);
}
function generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}
// Is GitHub login available?
router.get("/github/status", (_req, res) => {
    res.json({ enabled: Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) });
});
// STEP 1 — send the user to GitHub
router.get("/github", (req, res) => {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
        res.status(503).json({ error: "GitHub login is not configured" });
        return;
    }
    const state = crypto.randomBytes(16).toString("hex");
    res.cookie("gh_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60 * 1000,
    });
    const redirectUri = `${appOrigin(req)}/api/auth/github/callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(GITHUB_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent("read:user user:email")}` +
        `&state=${state}&allow_signup=true`;
    res.redirect(url);
});
// STEP 2 — GitHub sends the user back here
router.get("/github/callback", async (req, res) => {
    const origin = appOrigin(req);
    const fail = (msg) => res.redirect(`/login?error=${encodeURIComponent(msg)}`);
    try {
        const code = typeof req.query.code === "string" ? req.query.code : "";
        const state = typeof req.query.state === "string" ? req.query.state : "";
        const cookieState = req.cookies?.gh_state;
        if (!code) {
            fail("GitHub login cancelled");
            return;
        }
        if (!state || !cookieState || state !== cookieState) {
            fail("Invalid GitHub session, try again");
            return;
        }
        res.clearCookie("gh_state");
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: `${origin}/api/auth/github/callback`,
            }),
        });
        const tokenData = (await tokenRes.json());
        if (!tokenData.access_token) {
            fail("GitHub authentication failed");
            return;
        }
        const ghHeaders = {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "STANY-Hosting",
        };
        const [profileRes, emailsRes] = await Promise.all([
            fetch("https://api.github.com/user", { headers: ghHeaders }),
            fetch("https://api.github.com/user/emails", { headers: ghHeaders }),
        ]);
        const profile = (await profileRes.json());
        const emails = (await emailsRes.json().catch(() => []));
        const primary = Array.isArray(emails)
            ? emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified)
            : null;
        if (!profile?.login || !primary?.email) {
            fail("Your GitHub account needs a verified email address");
            return;
        }
        // Anti-fake: GitHub account must be at least 7 days old.
        if (profile.created_at && Date.now() - new Date(profile.created_at).getTime() < 7 * 24 * 60 * 60 * 1000) {
            fail("Your GitHub account is too new to be used for login");
            return;
        }
        const email = primary.email.toLowerCase();
        let user = await User.findOne({ $or: [{ email }, { githubId: String(profile.id) }] });
        if (user) {
            if (user.isBanned) {
                fail("Your account has been banned");
                return;
            }
            await User.updateOne({ _id: user._id }, { $set: { githubId: String(profile.id), githubUsername: profile.login, emailVerified: true } });
        }
        else {
            let username = profile.login.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
            if (username.length < 3)
                username = `gh_${username}`;
            while (await User.findOne({ username })) {
                username = `${username.slice(0, 16)}${Math.floor(Math.random() * 999)}`;
            }
            const passwordHash = await import("bcryptjs").then((b) => b.default.hash(crypto.randomBytes(24).toString("hex"), 12));
            user = await User.create({
                email,
                username,
                passwordHash,
                txCoins: 0,
                referralCode: generateReferralCode(),
                githubId: String(profile.id),
                githubUsername: profile.login,
                emailVerified: true,
                authProvider: "github",
            });
            await recordIPAndFingerprint(getClientIP(req), user._id.toString(), "");
        }
        const token = generateToken(user._id.toString());
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        // Hand the token to the SPA so localStorage-based auth keeps working.
        res.redirect(`/login?gh_token=${encodeURIComponent(token)}`);
    }
    catch {
        fail("GitHub login failed, please try again");
    }
});
export default router;
