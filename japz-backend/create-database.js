import { Sequelize } from "sequelize";
import "dotenv/config";

const databaseName = process.env.DB_DATABASE || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || "japz_pos";

if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
  throw new Error("Database name may contain only letters, numbers, and underscores");
}

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;
let connection;

if (databaseUrl) {
  const url = new URL(databaseUrl);
  connection = new Sequelize("", decodeURIComponent(url.username), decodeURIComponent(url.password), {
    host: url.hostname,
    port: Number.parseInt(url.port, 10) || 3306,
    dialect: "mysql",
    dialectOptions: {
      ssl: process.env.NODE_ENV === "production"
        ? { require: true, rejectUnauthorized: false }
        : false,
    },
    logging: false,
  });
} else {
  const host = process.env.MYSQLHOST || process.env.MYSQL_HOST || process.env.DB_HOST || "localhost";
  const user = process.env.MYSQLUSER || process.env.MYSQL_USER || process.env.DB_USER || "root";
  const password = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || "";
  const port = process.env.MYSQLPORT || process.env.MYSQL_PORT || process.env.DB_PORT || "3306";

  connection = new Sequelize("", user, password, {
    host,
    port: Number.parseInt(port, 10),
    dialect: "mysql",
    logging: false,
  });
}

try {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`Database '${databaseName}' is ready.`);
} catch (error) {
  console.error(`Could not create database '${databaseName}': ${error.message}`);
  process.exitCode = 1;
} finally {
  await connection.close();
}