const { verifyToken } = require("../utils/jwt.js");
const { Account } = require("../models/index.js");

const authenticateAccount = async (req, res, next) => {
    try {
        const token = req.cookies.session_token;

        if (!token) {
            return res.status(401).json({ success: false, message: "Not logged in"});

        }

        const decoded = verifyToken(token);

        if (!decoded) { 
            return res.status(401).json({ success: false, message: "Invalid or expired session"})
        }

        const account = await Account.findByPk(decoded.id);

        if (!account) {
            return res.status(401).json({ success: false, message: "Account no longer exists" });

        }

        req.account = account;
        next();

    } catch (error) {
        return res.status(401).json({ success: false, message: "Authentication failed" });

    }
}

module.exports = { authenticateAccount };
