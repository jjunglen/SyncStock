const { User } = require("../models/index.js");

// Checks that the logged-in Account has admin privileges at the
// CURRENT store — not globally. Requires auth.middleware.js
// (sets req.account) and tenant.middleware.js (sets req.store)
// to have already run before this.
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.account || !req.store) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const membership = await User.findOne({
      where: { account_id: req.account.id, store_id: req.store.id },
    });

    if (!membership || membership.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }

    req.membership = membership;
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ success: false, message: "Authorization failed" });
  }
};

module.exports = { requireAdmin };
