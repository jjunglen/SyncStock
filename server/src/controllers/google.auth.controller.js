const { Account, Store } = require("../models/index.js");
const { signToken } = require("../utils/jwt.js");
const { ensureMembership, COOKIE_OPTIONS} = require("./auth.controller.js");

const googleCallback = async (req, res) => {
    try {
        const { id, emails, displayName, photos } = req.user;
        const email = emails[0].value;
        const avatarUrl = photos?.[0]?.value || null;

        // Which store this login started from - carries through google's Oauth roundtrip via the state param
        let storeId = null;
        try {
            storeId = JSON.parse(req.query.state || "{}").store_id;

        } catch(error) {
            storeId = null;

        }

        if (!storeId) {
            return res.redirect(`${process.env.FRONTEND_URL}/auth?error=missing_store`)
        }

        const store = await Store.findByPk(storeId);
        if (!store) { 
            return res.redirect(`${process.env.FRONTEND_URL}/auth?error=invalid_store`);

        }

        let account = await Account.findOne({ where: { email } });

        if (!account) {
            account = await Account.create({
                email,
                full_name: displayName,
                avatar_url: avatarUrl,
                auth_id: id,
                email_verified: true,
            });
        } else if (!account.auth_id) {
          // Existing email/password account signing in with Google for
            await account.update({
                auth_id: id,
                avatar_url: account.avatar_url || avatarUrl,
            });
        }
        
        await ensureMembership(account, store);

        const token = signToken(account);
        res.cookie("session_token", token, COOKIE_OPTIONS);

        const needsSizes = !account.sizes || account.sizes.length === 0;
        const destination = needsSizes
            ? "onboarding/size"
            : "dashboard?verified=true";

        // Redirect back to the SAME store's subdomain, not a generic page
        const protocol =
            process.env.NODE_ENV === "production" ? "https" : "http";
        const host =
            process.env.NODE_ENV === "production"
                ? `${store.subdomain}.syncstock.io`
                : "localhost:5173";

        return res.redirect(`${protocol}://${host}/${destination}`);

    } catch (error) {
        console.error("Google callback error:", error.message);
        return res.redirect(`${process.env.FRONTEND_URL}/auth?error=google_failed`)
    }
}

module.exports = { googleCallback };
