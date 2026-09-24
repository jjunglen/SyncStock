const bcrypt = require("bcryptjs");
const { Account, User } = require("../models/index.js");
const { signToken } = require("../utils/jwt.js");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../services/email.service.js");

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    domain: process.env.NODE_ENV === "production" ? ".syncstock.io" : undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days expire time

};

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

    // This is the final onboarding step
    if (isFirstDuringOnboarding) {
        await store.update({ status: "active" });
        
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

            });            
        }

        await ensureMembership(account, req.store);

        const token = signToken(account);
        res.cookie("session_token", token, COOKIE_OPTIONS);

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

        if (req.store) {
          await ensureMembership(account, req.store);
        }

        const token = signToken(account);
        res.cookie("session_token", token, COOKIE_OPTIONS);

        return res.status(200).json({ success: true, data: { id: account.id, email: account.email, full_name: account.full_name } });

    } catch(error) {
        console.error("Login error:", error.message);
        return res.status(500).json({ success: false, message: "Login failed"});
    }
}


const logout = async (req, res) => {
    res.clearCookie("session_token", COOKIE_OPTIONS);

    return res.status(200).json({ success: true, message: "Successfully logged out"});

};

const getMe = async (req, res) => {
    try {
        if (!req.account) {
            return res
                .status(401)
                .json({ success: false, message: "Not logged in" });
        }

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
  logout,
  getMe,
  forgotPassword,
  resetPassword,
};