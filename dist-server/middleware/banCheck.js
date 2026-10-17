export const banCheck = (req, res, next) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const isBanned = user.isBanned;
    if (isBanned) {
        res.status(403).json({ error: "Your account has been banned. Contact support for assistance." });
        return;
    }
    next();
};
