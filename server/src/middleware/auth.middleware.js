const { Account } = require("../models/index.js");
const { findSessionAccount, renewSession } = require("../utils/session.js");

const MESSAGES = {
    missing: "Not logged in",
    invalid: "Invalid or expired session",
    deleted: "Account no longer exists",
};

const authenticateAccount = async (req, res, next) => {
    try {
        const { account, session, reason } = await findSessionAccount(req, Account);
        if (!account) {
            return res.status(401).json({ success: false, message: MESSAGES[reason] });
        }

        req.account = account;
        req.sessionVia = session?.via || null;
        renewSession(res, account, session);
        next();

    } catch (error) {
        return res.status(401).json({ success: false, message: "Authentication failed" });

    }
}

// For changing the email or phone, or deleting the account: a login from
// an alert-email link isn't enough — log in with password or Google
const requireFullLogin = (req, res, next) => {
    if (req.sessionVia === "email-link") {
        return res.status(403).json({
            success: false,
            code: "FULL_LOGIN_REQUIRED",
            message: "For your security, log out and log back in with your password or Google to change this.",
        });
    }
    next();
};

module.exports = { authenticateAccount, requireFullLogin };
