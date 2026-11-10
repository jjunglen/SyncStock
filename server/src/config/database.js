const { Sequelize } = require("sequelize");
require("dotenv").config();

// Create new sequelize instance using the DATABASEURL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      // supabase requires ssl
      require: true,
      rejectUnauthorized: false,
    },
    // Keeps idle connections from being silently dropped on the way
    // to Supabase
    keepAlive: true,
  },
  // Connections idle a while are closed before the network drops them,
  // and a query that hits a dropped connection is retried on a fresh
  // one instead of failing (which used to look like "logged out")
  pool: { max: 10, min: 0, idle: 10000, acquire: 30000, evict: 10000 },
  retry: {
    max: 3,
    match: [
      /ConnectionError/,
      /SequelizeConnection/,
      /Connection terminated/,
      /ECONNRESET/,
      /ETIMEDOUT/,
      /EPIPE/,
    ],
  },
  logging: false,
});

// connection testing
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Supabase PostgreSQL connect successfully");
  } catch (error) {
    console.error("Database failed connection:", error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };