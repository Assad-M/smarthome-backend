import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

function auth(req, res, next) {
  const token = req.header("Authorization");

  console.log("Auth header:", token);

  if (!token) {
    console.log("Auth failed: no token");
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const jwtToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    console.log("jwtToken (truncated):", jwtToken ? jwtToken.slice(0, 40) + "..." : jwtToken);

    try {
      const decodedUnverified = jwt.decode(jwtToken);
      console.log("jwt decode (no verify):", decodedUnverified);
    } catch (e) {
      console.log("jwt.decode error:", e && e.message ? e.message : e);
    }

    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    console.log("Token decoded:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("Token verify error:", err && err.message ? err.message : err);
    res.status(400).json({ message: "Invalid token" });
  }
}

// Export as default for ES modules
export default auth;
