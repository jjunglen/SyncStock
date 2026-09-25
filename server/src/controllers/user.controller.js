const { Account, User } = require("../models/index.js");
const { isValidEmail } = require("../utils/validate.js");

const resolveMembership = async (req, res) => {
  if (!req.account || !req.store) {
    res.status(401).json({ success: false, message: "Not logged in" });
    return null;
  }
  const membership = await User.findOne({
    where: { account_id: req.account.id, store_id: req.store.id },
  });
  if (!membership) {
    res
      .status(403)
      .json({ success: false, message: "Not a member of this store" });
    return null;
  }
  return membership;
};

const getProfile = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;
    return res.status(200).json({
      success: true,
      data: {
        id: req.account.id,
        email: req.account.email,
        full_name: req.account.full_name,
        avatar_url: req.account.avatar_url,
        sizes: req.account.sizes,
        phone_number: req.account.phone_number,
        phone_verified: req.account.phone_verified,
        notify_email: membership.notify_email,
        notify_inapp: membership.notify_inapp,
        notify_size_alerts: membership.notify_size_alerts,
        notify_sms: membership.notify_sms,
        role: membership.role,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch profile" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;

    const {
      full_name,
      email,
      sizes,
      notify_email,
      notify_inapp,
      notify_size_alerts,
      notify_sms,
    } = req.body;

    if (email && email !== req.account.email) {
      if (!isValidEmail(email)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid email address" });
      }
      const existing = await Account.findOne({ where: { email } });
      if (existing) {
        return res
          .status(400)
          .json({ success: false, message: "Email is already in use" });
      }
    }

    if (sizes && !Array.isArray(sizes)) {
      return res
        .status(400)
        .json({ success: false, message: "Sizes must be an array" });
    }

    await req.account.update({
      full_name: full_name ?? req.account.full_name,
      email: email ?? req.account.email,
      sizes: sizes ?? req.account.sizes,
    });

    await membership.update({
      notify_email: notify_email ?? membership.notify_email,
      notify_inapp: notify_inapp ?? membership.notify_inapp,
      notify_size_alerts: notify_size_alerts ?? membership.notify_size_alerts,
      notify_sms: notify_sms ?? membership.notify_sms,
    });

    return res.status(200).json({
      success: true,
      data: {
        id: req.account.id,
        email: req.account.email,
        full_name: req.account.full_name,
        sizes: req.account.sizes,
        notify_email: membership.notify_email,
        notify_inapp: membership.notify_inapp,
        notify_size_alerts: membership.notify_size_alerts,
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update profile" });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const membership = await resolveMembership(req, res);
    if (!membership) return;
    await membership.destroy();
    return res.status(200).json({
      success: true,
      message: "Your account has been removed from this store",
    });
  } catch (error) {
    console.error("Delete account error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete account" });
  }
};

module.exports = { getProfile, updateProfile, deleteAccount };
