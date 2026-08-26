const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// Parses and caps page/limit query params
const getPagination = (query) => {
  let page = parseInt(query.page, 10) || 1;
  let limit = parseInt(query.limit, 10) || DEFAULT_LIMIT;

  if (page < 1) page = 1;
  if (limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return { page, limit, offset: (page - 1) * limit };
};

const buildMeta = (count, page, limit) => ({
  total: count,
  page,
  limit,
  totalPages: Math.ceil(count / limit),
});

module.exports = { getPagination, buildMeta, DEFAULT_LIMIT };
