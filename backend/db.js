const Database = require("better-sqlite3");
const path = require("path");

const databaseFile = path.join(__dirname, "../database/manufacturer-erp.db");
const db = new Database(databaseFile);

db.pragma("foreign_keys = ON");

module.exports = db;
