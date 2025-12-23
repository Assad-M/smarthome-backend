// middleware/roleCheck.js
export default function roleCheck(allowedRoles) {
  return function (req, res, next) {
    // req.user should already exist from JWT authentication middleware
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
    next();
  };
}
