// Rules for a store's subdomain (<subdomain>.syncstock.io), shared by
// onboarding and the platform admin's "Change subdomain"

const RESERVED_SUBDOMAINS = ["www", "api", "app", "admin", "mail", "syncstock", "store"];

const isValidSubdomainFormat = (value) => {
  if (!value || value.length < 3 || value.length > 30) return false;
  if (!/^[a-z0-9-]+$/.test(value)) return false;
  if (value.startsWith("-") || value.endsWith("-")) return false;
  if (RESERVED_SUBDOMAINS.includes(value)) return false;
  return true;
};

module.exports = { RESERVED_SUBDOMAINS, isValidSubdomainFormat };

// In use by another store, now or as one of its old subdomains (those
// still forward to that store, so they can't be given away)
const subdomainTaken = async (value, exceptStoreId = null) => {
  const { Op } = require("sequelize");
  const { Store } = require("../models/index.js"); // loaded late: models load before routes
  const other = await Store.findOne({
    where: {
      [Op.or]: [{ subdomain: value }, { former_subdomains: { [Op.contains]: [value] } }],
      ...(exceptStoreId && { id: { [Op.ne]: exceptStoreId } }),
    },
    attributes: ["id"],
  });
  return !!other;
};

module.exports.subdomainTaken = subdomainTaken;
