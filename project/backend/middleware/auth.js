import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";
import { error } from "../utils/response.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return error(res, "Not authenticated. Please log in.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return error(res, "User no longer exists.", 401);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") return error(res, "Invalid token.", 401);
    if (err.name === "TokenExpiredError") return error(res, "Token expired. Please log in again.", 401);
    return error(res, "Authentication error.", 401);
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return error(res, "You do not have permission to perform this action.", 403);
    }
    next();
  };
};
