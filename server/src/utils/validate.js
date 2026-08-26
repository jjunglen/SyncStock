// Checks if real email
const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);

};

// Checks if password meets min requirements
const isValidPassword = (password) => {
  if (typeof password !== "string") return false;
  if (password.length < 8) return false;

  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return hasNumber && hasSymbol;
};

// Check if a shoe size is valid
const isValidSize = (size) => {
    const validSizes = [
    // Mens/Womens
    "4M/5.5W", "4.5M/6W", "5M/6.5W", "5.5M/7W",
    "6M/7.5W", "6.5M/8W", "7M/8.5W", "7.5M/9W",
    "8M/9.5W", "8.5M/10W", "9M/10.5W", "9.5M/11W",
    "10M/11.5W", "10.5M/12W", "11M/12.5W", "11.5M/13W",
    "12M/13.5W", "12.5M/14W", "13M/14.5W", "14M/15.5W",
    "15M/16.5W", "16M/17.5W", "17M/18.5W", "18M/19.5W",
    // Grade School
    "3.5Y", "4Y", "4.5Y", "5Y", "5.5Y", "6Y", "6.5Y", "7Y",
    // Toddler
    "1C", "2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C", "10C",
    ];
    return validSizes.includes(String(size));
}

// Checks that a price is a positive number
const isValidPrice = (price) => {
    return price === null || price === undefined || Number(price) >= 0;
};

// Checks that condition preference is valid
const isValidCondition = (condition) => {
    return ["brand_new", "pre_owned", "either"].includes(condition);

}

// Checks that box preference is valid
const isValidBoxPreference = (box) => {
    return ["original_good", "any", "no_preference"].includes(box);

}

// Checks required fields
const requireFields = (body, fields) => {
    const missing = fields.filter((field) => {
        return (
            body[field] === undefined || body[field] === null || body[field] === ""
        );
    });
    return missing;
}

module.exports = {
    isValidEmail,
    isValidPassword,
    isValidPrice,
    isValidSize,
    requireFields,
    isValidCondition,
    isValidBoxPreference,
}