require("dotenv").config();
const jwt = require("jsonwebtoken");

// Creates a JWT for an Account after login.
// tenant.middleware.js.
const signToken = (account) => {
  return jwt.sign(
    {
      id: account.id,
      email: account.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const signOnboardingToken = (storeId) => {
  return jwt.sign({ store_id: storeId, purpose: "onboarding"}, process.env.JWT_SECRET, {
    expiresIn: "10m",

  })
}

const verifyOnboardingToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== "onboarding") return { valid: false, expired: false };
    
    return { valid: true, storeId: decoded.store_id };

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return { valid: false, expired: true };
    }
    return { valid: false, expired: false };
  }
};

module.exports = { signToken, verifyToken, signOnboardingToken, verifyOnboardingToken };
