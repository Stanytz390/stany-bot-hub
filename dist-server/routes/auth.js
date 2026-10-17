import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import axios from "axios";
import { validateRealEmail } from "../utils/emailValidation.js";
import { User } from "../models/User.js";
import { Package } from "../models/Package.js";
import { Referral } from "../models/Referral.js";
import { authRateLimit } from "../middleware/rateLimit.js";
import { authGuard } from "../middleware/auth.js";
import { getClientIP, generateReferralCode, canRegisterWithIP, recordIPAndFingerprint } from "../utils/fingerprint.js";
import { IPRecord } from "../models/IPRecord.js";
import { sendMail, welcomeEmailHtml } from "../services/mailer.js";
import { roleOf } from "../middleware/roleGuard.js";
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "";
// ============================================================
// SCHEMAS
// ============================================================
const signupSchema = z.object({
    email: z.string().email(),
    username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/i),
    password: z.string().min(6),
    referralCode: z.string().optional(),
    fingerprint: z.string().optional()
});
const loginSchema = z.object({
    usernameOrEmail: z.string().min(1),
    password: z.string()
});
// ============================================================
// HELPERS
// ============================================================
function generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}
async function syncDefaultPackages() {
    try {
        const packages = [
            { name: "Starter", tzsPrice: 1009, txAmount: 10, bonusTx: 0, isBestDeal: false, order: 1, active: true },
            { name: "Basic", tzsPrice: 2000, txAmount: 20, bonusTx: 0, isBestDeal: false, order: 2, active: true },
            { name: "Standard", tzsPrice: 3000, txAmount: 30, bonusTx: 0, isBestDeal: false, order: 3, active: true },
            { name: "Pro", tzsPrice: 5000, txAmount: 50, bonusTx: 5, isBestDeal: true, order: 4, active: true },
            { name: "Elite", tzsPrice: 10000, txAmount: 100, bonusTx: 10, isBestDeal: false, order: 5, active: true },
            { name: "Ultimate", tzsPrice: 20000, txAmount: 200, bonusTx: 20, isBestDeal: false, order: 6, active: true },
        ];
        for (const pkg of packages) {
            await Package.findOneAndUpdate({ order: pkg.order }, { $set: pkg }, { upsert: true });
        }
    }
    catch (error) {
        console.error("Package sync error:", error);
    }
}
// ============================================================
// SIGNUP - BILA VERIFICATION
// ============================================================
router.post("/signup", authRateLimit, async (req, res) => {
    try {
        await syncDefaultPackages();
        const parsed = signupSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                error: "Invalid input. Username must be 3-20 chars, letters/numbers/underscores only."
            });
            return;
        }
        const { username, password, referralCode, fingerprint } = parsed.data;
        const emailCheck = validateRealEmail(parsed.data.email);
        if (!emailCheck.valid) {
            res.status(400).json({ error: emailCheck.reason || "Please use a real email address" });
            return;
        }
        const email = emailCheck.normalized;
        const uname = username.toLowerCase();
        const ip = getClientIP(req);
        const ipCheck = await canRegisterWithIP(ip, fingerprint || "");
        if (!ipCheck.allowed) {
            res.status(403).json({ error: ipCheck.reason });
            return;
        }
        const [existingEmail, existingUsername] = await Promise.all([
            User.findOne({ email }),
            User.findOne({ username: uname })
        ]);
        if (existingEmail) {
            res.status(409).json({ error: "Email already registered" });
            return;
        }
        if (existingUsername) {
            res.status(409).json({ error: "Username already taken" });
            return;
        }
        const passwordHash = await bcrypt.hash(password, 12);
        const refCode = generateReferralCode();
        let referrerId = null;
        if (referralCode) {
            const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
            if (referrer)
                referrerId = referrer._id;
        }
        const user = await User.create({
            email,
            username: uname,
            passwordHash,
            txCoins: 0,
            referralCode: refCode,
            referredBy: referrerId,
            emailVerified: true,
            verificationRequired: false
        });
        await recordIPAndFingerprint(ip, user._id.toString(), fingerprint || "");
        // Referral bonus
        if (referrerId) {
            try {
                const existingReferral = await Referral.findOne({ referredId: user._id });
                if (!existingReferral) {
                    const { Transaction } = await import("../models/Transaction.js");
                    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
                    const referrerIPRecords = await IPRecord.find({ userId: referrerId.toString() }, { ip: 1 }).lean();
                    const recentReferralCount = await Referral.countDocuments({ referrerId, createdAt: { $gte: hourAgo } });
                    const referrerIPs = new Set(referrerIPRecords.map((r) => r.ip));
                    const sameIP = referrerIPs.has(ip);
                    const isAbuse = sameIP || recentReferralCount >= 3;
                    if (isAbuse) {
                        const flagReason = sameIP ? "referrer_ip_match" : "referral_rate_limit";
                        await Referral.create({ referrerId, referredId: user._id, txRewarded: 0, flagged: true, flagReason });
                        if (sameIP) {
                            await User.findByIdAndUpdate(referrerId, {
                                $set: { isBanned: true, banReason: "Referral abuse detected: same-IP self-referral" }
                            });
                        }
                    }
                    else {
                        await Referral.create({ referrerId, referredId: user._id, txRewarded: 2 });
                        await User.findByIdAndUpdate(referrerId, { $inc: { txCoins: 2 } });
                        await Transaction.create({ userId: referrerId, type: "admin_grant", txAmount: 2, tzsAmount: 0, status: "success" });
                        await User.findByIdAndUpdate(user._id, { $inc: { txCoins: 2 } });
                        await Transaction.create({ userId: user._id, type: "admin_grant", txAmount: 2, tzsAmount: 0, status: "success" });
                    }
                }
            }
            catch (refError) {
                console.error("Referral error:", refError);
            }
        }
        // Tuma welcome email
        try {
            const updatedUser = await User.findById(user._id);
            const welcomeHtml = welcomeEmailHtml(uname, updatedUser?.txCoins || 0, refCode);
            await sendMail(email, "Welcome to STANY Host", welcomeHtml);
            console.log(`[Auth] Welcome email sent to ${email}`);
        }
        catch (emailError) {
            console.error("[Auth] Welcome email failed:", emailError);
        }
        const token = generateToken(user._id.toString());
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                txCoins: user.txCoins,
                isBanned: user.isBanned || false,
                referralCode: user.referralCode,
                emailVerified: true,
                role: roleOf(user)
            },
            message: "Account created successfully!"
        });
    }
    catch (error) {
        console.error("SIGNUP ERROR:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
});
// ============================================================
// LOGIN
// ============================================================
router.post("/login", authRateLimit, async (req, res) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input" });
            return;
        }
        const { usernameOrEmail, password } = parsed.data;
        const isEmail = usernameOrEmail.includes("@");
        const user = isEmail
            ? await User.findOne({ email: usernameOrEmail.toLowerCase() })
            : await User.findOne({ username: usernameOrEmail.toLowerCase() });
        if (!user) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        if (user.isBanned) {
            res.status(403).json({ error: "Your account has been banned. Contact support for assistance." });
            return;
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        const token = generateToken(user._id.toString());
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                txCoins: user.txCoins,
                isBanned: user.isBanned || false,
                referralCode: user.referralCode,
                emailVerified: true,
                role: roleOf(user)
            }
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: error.message || "Server error" });
    }
});
// ============================================================
// GITHUB OAUTH
// ============================================================
router.get("/github", (req, res) => {
    try {
        const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
        const redirectUri = process.env.GITHUB_REDIRECT_URI || "https://host.stanymaxhub.online/api/auth/github/callback";
        if (!GITHUB_CLIENT_ID) {
            console.error("GITHUB_CLIENT_ID not configured");
            res.redirect("/login?error=github_not_configured");
            return;
        }
        res.redirect(`https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`);
    }
    catch (error) {
        console.error("GitHub redirect error:", error);
        res.redirect("/login?error=github_error");
    }
});
router.get("/github/callback", async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            res.redirect("/login?error=no_code");
            return;
        }
        const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
        const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
        const redirectUri = process.env.GITHUB_REDIRECT_URI || "https://host.stanymaxhub.online/api/auth/github/callback";
        // Exchange code for access token
        const tokenResponse = await axios.post("https://github.com/login/oauth/access_token", {
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: redirectUri
        }, {
            headers: { Accept: "application/json" }
        });
        const tokenData = tokenResponse.data;
        const accessToken = tokenData.access_token;
        if (!accessToken) {
            res.redirect("/login?error=no_token");
            return;
        }
        // Get user data from GitHub
        const userResponse = await axios.get("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        // Get user emails from GitHub
        const emailResponse = await axios.get("https://api.github.com/user/emails", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const userData = userResponse.data;
        const emailData = emailResponse.data;
        const primaryEmail = emailData.find((e) => e.primary)?.email || userData.email || "";
        const githubId = userData.id.toString();
        const githubUsername = userData.login;
        if (!primaryEmail) {
            res.redirect("/login?error=no_email");
            return;
        }
        let user = await User.findOne({ githubId });
        if (!user) {
            const existingUser = await User.findOne({ email: primaryEmail });
            if (existingUser) {
                existingUser.githubId = githubId;
                existingUser.githubUsername = githubUsername;
                await existingUser.save();
                user = existingUser;
            }
            else {
                const refCode = generateReferralCode();
                user = await User.create({
                    email: primaryEmail,
                    username: githubUsername.toLowerCase() + Math.floor(Math.random() * 1000),
                    passwordHash: await bcrypt.hash(Math.random().toString(36), 12),
                    txCoins: 0,
                    referralCode: refCode,
                    githubId,
                    githubUsername,
                    emailVerified: true,
                    verificationRequired: false
                });
            }
        }
        const token = generateToken(user._id.toString());
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        const frontendUrl = process.env.FRONTEND_URL || "https://host.stanymaxhub.online";
        res.redirect(`${frontendUrl}/dashboard`);
    }
    catch (error) {
        console.error("GitHub callback error:", error);
        res.redirect("/login?error=github_auth_failed");
    }
});
router.get("/github/status", (req, res) => {
    const hasConfig = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    res.json({ configured: hasConfig });
});
// ============================================================
// OTHER ROUTES
// ============================================================
router.get("/me", authGuard, async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        let referralCode = user.referralCode || "";
        if (!referralCode) {
            referralCode = generateReferralCode();
            await User.updateOne({ _id: user._id }, { $set: { referralCode } });
        }
        res.json({
            id: user._id,
            email: user.email,
            username: user.username,
            txCoins: user.txCoins,
            usedFreeTrial: user.usedFreeTrial || false,
            isBanned: user.isBanned || false,
            referralCode,
            emailVerified: true,
            role: roleOf(user)
        });
    }
    catch (error) {
        console.error("Me error:", error);
        res.status(500).json({ error: error.message || "Server error" });
    }
});
router.patch("/username", authGuard, async (req, res) => {
    try {
        const schema = z.object({
            username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/i)
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Username must be 3-20 characters (letters, numbers, underscores only)" });
            return;
        }
        const user = req.user;
        const uname = parsed.data.username.toLowerCase();
        const existing = await User.findOne({ username: uname, _id: { $ne: user._id } });
        if (existing) {
            res.status(409).json({ error: "Username already taken" });
            return;
        }
        await User.updateOne({ _id: user._id }, { $set: { username: uname } });
        res.json({ success: true, username: uname });
    }
    catch (error) {
        console.error("Username update error:", error);
        res.status(500).json({ error: error.message || "Server error" });
    }
});
router.post("/logout", (_req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
});
export default router;
