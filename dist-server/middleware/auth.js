import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
const JWT_SECRET = process.env.JWT_SECRET || "";
export const authGuard = async (req, res, next) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).lean();
        if (!user) {
            res.status(401).json({ error: "User not found" });
            return;
        }
        req.user = user;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid token" });
    }
};
