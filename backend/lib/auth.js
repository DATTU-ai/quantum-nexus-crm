import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const DEFAULT_SECRET = "change-this-demo-secret";
const TOKEN_EXPIRES_IN = "7d";

export const hashPassword = (value) => bcrypt.hash(value, 10);
export const verifyPassword = (value, hash) => bcrypt.compare(value, hash);

export const signToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET || DEFAULT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN },
  );

export const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET || DEFAULT_SECRET);

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  try {
    req.auth = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired authentication token." });
  }
};

export const authorizeRole = (allowedRoles = []) => {
  const normalized = new Set(allowedRoles.map((role) => String(role).toLowerCase()));

  return (req, res, next) => {
    const role = String(req.auth?.role || "").toLowerCase();
    if (!role) {
      return res.status(403).json({ message: "Access denied." });
    }
    if (role === "admin") {
      return next();
    }
    if (normalized.has(role)) {
      return next();
    }
    return res.status(403).json({ message: "Insufficient role permissions." });
  };
};
