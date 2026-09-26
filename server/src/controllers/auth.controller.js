const bcrypt = require("bcryptjs");
const { Account, User, Store } = require("../models/index.js");
const {
    signToken,
    signEmailVerifyToken,
    verifyEmailVerifyToken,
} = require("../utils/jwt.js");
const crypto = require("crypto");
const {
    sendPasswordResetEmail,
    sendVerificationEmail,
} = require("../services/email.service.js");
const { storeBaseUrl, safeRedirectPath } = require("../utils/storeUrl.js");

const NOT_VERIFIED = {
    success: false,
    code: "EMAIL_NOT_VERIFIED",
    message: "You need to verify your email using the link sent to your email.",
};

// Email/password accounts must verify before logging in (Google sign-ins
// are verified by Google)
const needsVerification = (account) => !!account.password && !account.email_verified;

const sendVerificationLink = async (account, { store = null, merchant = false, redirect = null } = {}) => {
    const token = signEmailVerifyToken(account.id, {
        storeId: store?.id || null,
        merchant,
        redirect: safeRedirectPath(redirect),
    });
    const verifyUrl = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    await sendVerificationEmail({ store, account, verifyUrl, merchant });
};

// A signup on an unfinished store (onboarding) is the merchant creating
// their account; anywhere else it's a shopper
const isMerchantSignup = (store) => !!store && store.onboarding_step === "account";

const { setSessionCookie, clearSessionCookies } = require("../utils/session.js");

const ensureMembership = async (account, store) => {
  let membership = await User.findOne({
    where: { account_id: account.id, store_id: store.id },
  });

  if (!membership) {
    const existingMemberCount = await User.count({ where: { store_id: store.id } });
    const isFirstDuringOnboarding = existingMemberCount === 0 && store.status === "pending";

    membership = await User.create({
        account_id: account.id,
        store_id: store.id,
        role: isFirstDuringOnboarding ? "admin" : "user",

    });

    // The store's owner now exists; onboarding moves on to the subdomain
    // (the store goes live at the last step, not here)
    if (isFirstDuringOnboarding && store.onboarding_step === "account") {
        await store.update({ onboarding_step: "subdomain" });
    }

  }

  return membership;
};


const signup = async (req, res) => {
     try {
        const { email, password, full_name } = req.body;

        // Validation

        if (!req.store) {
            return res.status(400).json({ success: false, message: "Store not resolved"});

        }

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password required" });

        }

        let account = await Account.findOne({ where: {email} } );

        if (account) {
            // Already exists globally - this is really a login, not a new signup
            if (!account.password) {
                return res.status(400).json({
                    success: false,
                    message: "This email uses Google sign-in. Please continue with Google instead",

                })
            }

            const validPassword = await bcrypt.compare(password, account.password);
            if (!validPassword) {
                return res.status(401).json({ success: false, message: "Incorrect password"})
            }
        } else {
            const hashPassword = await bcrypt.hash(password, 10);
            account = await Account.create({
                email,
                password: hashPassword,
                full_name: full_name || null,
                email_verified: false,
            });
        }

        const merchant = isMerchantSignup(req.store);
        await ensureMembership(account, req.store);

        // Unverified (new, or signed up before and never verified): send the
        // link instead of logging in. /email-verification comes next.
        if (needsVerification(account)) {
            await sendVerificationLink(account, {
                store: req.store,
                merchant,
                redirect: req.body.redirect,
            });
            return res.status(200).json({
                success: true,
                data: { needs_verification: true, email: account.email, merchant },
            });
        }

        const token = signToken(account);
        setSessionCookie(res, token);

        return res.status(200).json({ success: true, data: { id: account.id, email: account.email, full_name: account.full_name}});

     } catch(error) {
        console.error("Signup error:", error.message);
        return res.status(500).json({ success: false, message: "Signup failed"})
     }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const account = await Account.findOne({ where: { email} })

        if (!account || !account.password) {
            return res.status(401).json({ success: false, message: "Invalid email or password"});
        }

        const validPassword = await bcrypt.compare(password, account.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: "Invalid email or password"})
        }
        if (needsVerification(account)) return res.status(403).json(NOT_VERIFIED);

        if (req.store) {
          await ensureMembership(account, req.store);
        }

        const token = signToken(account);
        setSessionCookie(res, token);

        return res.status(200).json({ success: true, data: { id: account.id, email: account.email, full_name: account.full_name } });

    } catch(error) {
        console.error("Login error:", error.message);
        return res.status(500).json({ success: false, message: "Login failed"});
    }
}


// Merchant login (syncstock.io/login). Accounts are shared across
// stores, so a customer's email/password is valid here too — only
// accounts that own a store (admin membership) get a session.
const merchantLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const account = await Account.findOne({ where: { email } });
        const validPassword =
            account?.password && (await bcrypt.compare(password, account.password));
        if (!validPassword) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const adminMembership = await User.findOne({
            where: { account_id: account.id, role: "admin" },
            include: [{ model: Store, attributes: ["onboarding_step"] }],
        });
        if (!adminMembership) {
            return res.status(403).json({
                success: false,
                message: "This isn't a merchant account. Shoppers sign in on their store's page.",
            });
        }
        if (needsVerification(account)) return res.status(403).json(NOT_VERIFIED);

        const token = signToken(account);
        setSessionCookie(res, token);

        return res.status(200).json({
            success: true,
            data: {
                id: account.id,
                email: account.email,
                full_name: account.full_name,
                // Not "complete" -> the client resumes onboarding
                onboarding_step: adminMembership.Store?.onboarding_step || "complete",
            },
        });

    } catch (error) {
        console.error("Merchant login error:", error.message);
        return res.status(500).json({ success: false, message: "Login failed" });
    }
};

// GET /api/auth/verify-email?token=... — the link in the verification
// email. Marks the email verified, logs them in, and sends them on:
// merchants back into onboarding, shoppers to their store (sizes first).
const verifyEmail = async (req, res) => {
    const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
    const claims = verifyEmailVerifyToken(req.query.token);
    const account = claims ? await Account.findByPk(claims.id).catch(() => null) : null;
    const store = claims?.store_id ? await Store.findByPk(claims.store_id).catch(() => null) : null;

    if (!account) {
        const base = store && !claims?.merchant ? storeBaseUrl(store) : frontend;
        return res.redirect(`${base}/email-verification?status=invalid`);
    }

    try {
        if (!account.email_verified) await account.update({ email_verified: true });
        setSessionCookie(res, signToken(account));

        if (claims.merchant || !store) {
            return res.redirect(`${frontend}/onboarding/setup`);
        }
        const next = safeRedirectPath(claims.redirect) || "/store/dashboard";
        const needsSizes = !account.sizes || account.sizes.length === 0;
        const destination = needsSizes
            ? `/onboarding/size?redirect=${encodeURIComponent(next)}`
            : next;
        return res.redirect(`${storeBaseUrl(store)}${destination}`);
    } catch (error) {
        console.error("Verify email error:", error.message);
        return res.redirect(`${frontend}/email-verification?status=error`);
    }
};

// POST /api/auth/resend-verification { email, redirect? } — always the
// same answer, so it can't be used to check which emails have accounts
const resendVerification = async (req, res) => {
    try {
        const email = String(req.body.email || "").trim();
        const account = email ? await Account.findOne({ where: { email } }) : null;
        if (account && needsVerification(account)) {
            const adminMembership = await User.findOne({
                where: { account_id: account.id, role: "admin" },
                include: [{ model: Store, attributes: ["id", "onboarding_step"] }],
            });
            const merchant = !!adminMembership && adminMembership.Store?.onboarding_step !== "complete";
            await sendVerificationLink(account, {
                store: merchant ? adminMembership.Store : req.store || null,
                merchant,
                redirect: req.body.redirect,
            });
        }
    } catch (error) {
        console.error("Resend verification error:", error.message);
    }
    return res.status(200).json({
        success: true,
        message: "If that account needs verifying, a new link is on its way.",
    });
};

const logout = async (req, res) => {
    clearSessionCookies(res);

    return res.status(200).json({ success: true, message: "Successfully logged out"});

};

const getMe = async (req, res) => {
    try {
        if (!req.account) {
            return res
                .status(401)
                .json({ success: false, message: "Not logged in" });
        }

        // Owns at least one store — decides access to merchant pages
        const adminMembership = await User.findOne({
            where: { account_id: req.account.id, role: "admin" },
            include: [{ model: Store, attributes: ["onboarding_step"] }],
        });
        const isMerchant = !!adminMembership;

        let membership = null;
        if (req.store) {
            membership = await User.findOne({
                where: { account_id: req.account.id, store_id: req.store.id },
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                id: req.account.id,
                email: req.account.email,
                full_name: req.account.full_name,
                avatar_url: req.account.avatar_url,
                sizes: req.account.sizes,
                is_merchant: isMerchant,
                merchant_onboarding_step: adminMembership?.Store?.onboarding_step || null,
                membership: membership
                ? {
                    role: membership.role,
                    notify_email: membership.notify_email,
                    notify_inapp: membership.notify_inapp,
                    notify_size_alerts: membership.notify_size_alerts,
                    }
                : null,
            },
        });

    } catch (error) {
        console.error("Get me error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch account"});

    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required"});

        }

        const account = await Account.findOne({ where: { email} });

        const genericResponse = {
            success: true,
            message: "If that email is registered, a reset link has been sent.",

        }

        if (!account) {
            return res.status(200).json(genericResponse);

        }

        if (!account.password) {
            // Google-only account - no password to reset
            await sendPasswordResetEmail({
                store: req.store,
                account,
                googleOnly: true,

            }).catch((error) => console.error("Password reset email error:", error.message))

            return res.status(200).json(genericResponse);

        }

        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        
        await account.update({ reset_token: token, reset_token_expires: expires });

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        await sendPasswordResetEmail({
            store: req.store,
            account,
            resetUrl,
        }).catch((error) => console.error("Password reset email error:", error.message));

        return res.status(200).json(genericResponse);


    } catch(error) {
        console.error("Password reset error:", error.message);
        return res.status(500).json({ success: false, message: "Something went wrong"});

    }
}

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
        return res
            .status(400)
            .json({
            success: false,
            message: "Token and new password are required",
            });

    }

    const account = await Account.findOne({ where: { reset_token: token } });
    
    if (
      !account ||
      !account.reset_token_expires ||
      account.reset_token_expires < new Date()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }
    const hashPassword = await bcrypt.hash(password, 10);
    await account.update({
      password: hashPassword,
      reset_token: null,
      reset_token_expires: null,
    });
    return res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

module.exports = {
  signup,
  login,
  merchantLogin,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  ensureMembership, // used by the Google sign-in callback
  verifyEmail,
  resendVerification,
};