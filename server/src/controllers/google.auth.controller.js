const { Account, Store } = require("../models/index.js");
const { signToken } = require("../utils/jwt.js");
const { storeBaseUrl, safeRedirectPath } = require("../utils/storeUrl.js");
const { ensureMembership, COOKIE_OPTIONS} = require("./auth.controller.js");

// Which store this login started from and the page to return to
// afterwards — both carried through Google's OAuth roundtrip in state
const readState = (req) => {
    try {
        const state = JSON.parse(req.query.state || "{}");
        return {
            storeId: state.store_id || null,
            redirectPath: safeRedirectPath(state.redirect),
        };
    } catch (error) {
        return { storeId: null, redirectPath: null };
    }
};

// Sends the user back to the store's customer login with an error to
// show, keeping ?redirect= so a retry still lands on the right page
const redirectToLogin = async (req, res, error) => {
    const { storeId, redirectPath } = readState(req);
    const store = storeId ? await Store.findByPk(storeId).catch(() => null) : null;
    const params = new URLSearchParams({ error });
    if (redirectPath) params.set("redirect", redirectPath);
    return res.redirect(`${storeBaseUrl(store)}/store/login?${params.toString()}`);
};

const googleCallback = async (req, res) => {
    try {
        const { id, emails, displayName, photos } = req.user;
        const email = emails[0].value;
        const avatarUrl = photos?.[0]?.value || null;

        const { storeId, redirectPath } = readState(req);

        const store = storeId ? await Store.findByPk(storeId) : null;
        if (!store) {
            return redirectToLogin(req, res, "invalid_store");
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

        // New customers pick their sizes first, then continue on to
        // wherever they were headed
        const needsSizes = !account.sizes || account.sizes.length === 0;
        const destination = needsSizes
            ? `/onboarding/size${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`
            : redirectPath || "/store/dashboard";

        // Redirect back to the SAME store's subdomain, not a generic page
        return res.redirect(`${storeBaseUrl(store)}${destination}`);

    } catch (error) {
        console.error("Google callback error:", error.message);
        return redirectToLogin(req, res, "google_failed");
    }
}

module.exports = { googleCallback, redirectToLogin };
