
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize database schema
const schema = fs.readFileSync(
  path.join(__dirname, "../database/schema.sql"),
  "utf8"
);
db.exec(schema);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "success", message: "ERP server running" });
});

// Dashboard summary
app.get("/api/dashboard", (req, res) => {
  const products = db.prepare(
    "SELECT COUNT(*) AS count, COALESCE(SUM(stock), 0) AS stock FROM products"
  ).get();

  const materials = db.prepare(
    "SELECT COUNT(*) AS count, COALESCE(SUM(stock), 0) AS stock FROM raw_materials"
  ).get();

  const orders = db.prepare(
    "SELECT COUNT(*) AS count FROM purchase_orders WHERE status = 'Pending'"
  ).get();

  const sales = db.prepare(
    "SELECT COALESCE(SUM(grand_total), 0) AS total FROM sales"
  ).get();

  res.json({
    finishedGoods: products,
    rawMaterials: materials,
    pendingOrders: orders.count,
    totalSales: sales.total
  });
});

// Inventory: raw materials
app.get("/api/inventory/raw-materials", (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM raw_materials ORDER BY name"
  ).all();

  res.json(rows);
});

// Inventory: finished goods
app.get("/api/inventory/finished-goods", (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM products ORDER BY name"
  ).all();

  res.json(rows);
});

// Add raw material
app.post("/api/inventory/raw-materials", (req, res) => {
  const { name, sku, stock, unit, cost } = req.body;

  if (!name || stock == null || Number(stock) < 0) {
    return res.status(400).json({ error: "Invalid material details" });
  }

  const result = db.prepare(`
    INSERT INTO raw_materials (name, sku, stock, unit, cost)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, sku || null, Number(stock), unit || "Units", Number(cost || 0));

  res.status(201).json({
    id: result.lastInsertRowid,
    message: "Raw material added"
  });
});

// Add finished product
app.post("/api/inventory/finished-goods", (req, res) => {
  const { name, sku, stock, price } = req.body;

  if (!name || stock == null || Number(stock) < 0) {
    return res.status(400).json({ error: "Invalid product details" });
  }

  const result = db.prepare(`
    INSERT INTO products (name, sku, stock, price)
    VALUES (?, ?, ?, ?)
  `).run(name, sku || null, Number(stock), Number(price || 0));

  res.status(201).json({
    id: result.lastInsertRowid,
    message: "Product added"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Manufacturer ERP API running on port ${PORT}`);
});
