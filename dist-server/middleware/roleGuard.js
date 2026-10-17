export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "stanytzhosting@gmail.com").toLowerCase();
export function roleOf(user) {
    if (!user)
        return "user";
    if ((user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL)
        return "admin";
    const r = user.role;
    return r === "admin" || r === "subadmin" ? r : "user";
}
/** Super admin only (the owner email or role=admin). */
export const superAdminGuard = (req, res, next) => {
    if (roleOf(req.user) !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
    }
    next();
};
/** Admin OR sub-admin (staff). */
export const staffGuard = (req, res, next) => {
    const role = roleOf(req.user);
    if (role !== "admin" && role !== "subadmin") {
        res.status(403).json({ error: "Staff access required" });
        return;
    }
    next();
};
