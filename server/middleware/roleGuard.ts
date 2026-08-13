import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.js";

export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "stanytzhosting@gmail.com").toLowerCase();

export type Role = "user" | "subadmin" | "admin";

export function roleOf(user: { email?: string; role?: string } | undefined): Role {
  if (!user) return "user";
  if ((user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL) return "admin";
  const r = user.role;
  return r === "admin" || r === "subadmin" ? r : "user";
}

/** Super admin only (the owner email or role=admin). */
export const superAdminGuard = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (roleOf(req.user as unknown as { email?: string; role?: string }) !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

/** Admin OR sub-admin (staff). */
export const staffGuard = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = roleOf(req.user as unknown as { email?: string; role?: string });
  if (role !== "admin" && role !== "subadmin") {
    res.status(403).json({ error: "Staff access required" });
    return;
  }
  next();
};
