/**
 * Role-based access middleware
 * Usage: app.use(route, auth, allowRole('provider'))
 */

function allowRole(role) {
  return (req, res, next) => {
    // req.user is populated by auth middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized. No user info.' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: `Access denied. ${role} only.` });
    }

    next(); // user has required role
  };
}

module.exports = allowRole;
