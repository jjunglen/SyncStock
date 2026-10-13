const { Account } = require("../models/index.js");
const { findSessionAccount, renewSession, issuedBeforeCutoff } = require("../utils/session.js");
const { verifyToken } = require("../utils/jwt.js");

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

// The phone app sends its login as "Authorization: Bearer <token>" — the
// app runs on its own origin, where the site's cookies don't reach. Same
// rules as a cookie login (valid, account exists, not logged out
// everywhere); only tokens the app was given (via "app") count.
const authenticateApp = async (req, res, next) => {
    try {
        const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || "");
        const decoded = match ? verifyToken(match[1].trim()) : null;
        if (!decoded?.id || decoded.purpose || decoded.via !== "app") {
            return res.status(401).json({ success: false, message: MESSAGES[match ? "invalid" : "missing"] });
        }
        const account = await Account.findByPk(decoded.id);
        if (!account) return res.status(401).json({ success: false, message: MESSAGES.deleted });
        if (issuedBeforeCutoff(decoded, account)) {
            return res.status(401).json({ success: false, message: MESSAGES.invalid });
        }
        req.account = account;
        req.appSession = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Authentication failed" });
    }
};

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

module.exports = { authenticateAccount, authenticateApp, requireFullLogin };
