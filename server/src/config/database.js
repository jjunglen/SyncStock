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