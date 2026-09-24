const path = require("path");

// Replaces a module in require's cache so code under test gets a stub
// instead of hitting the real database / email / SMS providers.
const stubModule = (relPath, exports) => {
  const full = require.resolve(path.join(__dirname, "..", relPath));
  require.cache[full] = { id: full, filename: full, loaded: true, exports };
  return exports;
};

const mockRes = () => {
  const res = { statusCode: 200, body: undefined, redirectedTo: undefined };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  res.redirect = (u) => ((res.redirectedTo = u), res);
  return res;
};

module.exports = { stubModule, mockRes };
