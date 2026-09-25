const { Account } = require("../models/index.js");
const { findSessionAccount } = require("../utils/session.js");

const MESSAGES = {
    missing: "Not logged in",
    invalid: "Invalid or expired session",
    deleted: "Account no longer exists",
};

const authenticateAccount = async (req, res, next) => {
    try {
        const { account, reason } = await findSessionAccount(req, Account);
        if (!account) {
            return res.status(401).json({ success: false, message: MESSAGES[reason] });
        }

        req.account = account;
        next();

    } catch (error) {
        return res.status(401).json({ success: false, message: "Authentication failed" });

    }
}

module.exports = { authenticateAccount };
