import React, { useState, useEffect, useMemo } from "react";
import LoginScreen from "./LoginScreen";

const INITIAL_PRODUCTS = [
  { id: "prod-a", name: "Product A (Transmission Spur)", vault: 5, price: 1850 },
  { id: "prod-b", name: "Product B (Bevel Gear Set)", vault: 8, price: 2450 },
  { id: "prod-c", name: "Product C (Precision Pinion)", vault: 6, price: 1350 },
];

const INITIAL_MATERIALS = [
  { id: "mat-1", name: "High-Carbon Alloy Steel Bar", stock: 25, cost: 950 },
  { id: "mat-2", name: "CNC Hardened Gear Blank", stock: 15, cost: 1200 },
  { id: "mat-3", name: "Industrial Bearing Bush", stock: 40, cost: 450 },
];

const CUSTOMERS = [
  "Heavy Machinery Corp",
  "Apex Automotive Ltd",
  "Bharat Earth Movers",
  "Southern Tractors & Gears",
];

const VENDORS = [
  "SteelForge Alloys Pvt Ltd",
  "Precision Castings & Metals",
  "Industrial Raw Supplies Co",
  "Delta Forging Works",
];

function Workspace() {
  // Navigation Drawer / Active Module
  const [activeTab, setActiveTab] = useState("sales"); // 'sales' | 'vendor' | 'vault'
  const [menuOpen, setMenuOpen] = useState(false);

  // Products & Cart State
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem("merp_products");
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [cart, setCart] = useState({});
  const [selectedCustomer, setSelectedCustomer] = useState(CUSTOMERS[0]);

  // GST State (Sales)
  const [includeGst, setIncludeGst] = useState(true);
  const [gstRate, setGstRate] = useState(18);

  // Sales Log State
  const [salesLogs, setSalesLogs] = useState(() => {
    const saved = localStorage.getItem("merp_sales_logs");
    return saved ? JSON.parse(saved) : [];
  });
  const [salesPeriod, setSalesPeriod] = useState("daily"); // 'daily' | 'weekly' | 'monthly'
  const [customerFilter, setCustomerFilter] = useState("ALL");

  // Vendor State
  const [materials, setMaterials] = useState(() => {
    const saved = localStorage.getItem("merp_materials");
    return saved ? JSON.parse(saved) : INITIAL_MATERIALS;
  });
  const [vendorCart, setVendorCart] = useState({});
  const [selectedVendor, setSelectedVendor] = useState(VENDORS[0]);
  const [vendorGst, setVendorGst] = useState(true);
  const [vendorGstRate, setVendorGstRate] = useState(18);
  const [vendorLogs, setVendorLogs] = useState(() => {
    const saved = localStorage.getItem("merp_vendor_logs");
    return saved ? JSON.parse(saved) : [];
  });
  const [vendorPeriod, setVendorPeriod] = useState("daily"); // 'daily' | 'weekly' | 'monthly'
  const [vendorFilter, setVendorFilter] = useState("ALL");

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("merp_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("merp_sales_logs", JSON.stringify(salesLogs));
  }, [salesLogs]);

  useEffect(() => {
    localStorage.setItem("merp_materials", JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem("merp_vendor_logs", JSON.stringify(vendorLogs));
  }, [vendorLogs]);

  // Reset Entire Data to 0
  const handleResetAll = () => {
    if (!window.confirm("Reset entire vault, cart, sales & vendor logs to 0?")) return;
    const zeroProducts = INITIAL_PRODUCTS.map((p) => ({ ...p, vault: 0 }));
    const zeroMaterials = INITIAL_MATERIALS.map((m) => ({ ...m, stock: 0 }));
    setProducts(zeroProducts);
    setMaterials(zeroMaterials);
    setCart({});
    setVendorCart({});
    setSalesLogs([]);
    setVendorLogs([]);
  };

  // --- SALES QUANTITY (+ / -) HANDLERS ---
  const updateCartQty = (product, delta) => {
    setCart((prev) => {
      const currentQty = prev[product.id] || 0;
      const nextQty = currentQty + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      }
      if (nextQty > product.vault) {
        alert(`Only ${product.vault} units available in Vault!`);
        return prev;
      }
      return { ...prev, [product.id]: nextQty };
    });
  };

  // Manual Vault Stock +/- (For testing or production refill)
  const adjustVaultStock = (productId, delta) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, vault: Math.max(0, p.vault + delta) } : p
      )
    );
  };

  // --- SALES BILL CALCULATION ---
  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const prod = products.find((p) => p.id === id);
        if (!prod) return null;
        return { ...prod, qty, lineTotal: prod.price * qty };
      })
      .filter(Boolean);
  }, [cart, products]);

  const salesSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [cartItems]
  );
  const salesGstAmount = useMemo(
    () => (includeGst ? Math.round((salesSubtotal * gstRate) / 100) : 0),
    [salesSubtotal, includeGst, gstRate]
  );
  const salesGrandTotal = salesSubtotal + salesGstAmount;

  // --- CONFIRM DISPATCH ---
  const handleConfirmDispatch = () => {
    if (cartItems.length === 0) {
      alert("Please add at least 1 product to the Dispatch Manifest.");
      return;
    }

    // Deduct from Vault
    setProducts((prev) =>
      prev.map((p) => {
        const used = cart[p.id] || 0;
        return used ? { ...p, vault: Math.max(0, p.vault - used) } : p;
      })
    );

    const now = new Date();
    const newEntry = {
      id: "INV-" + Date.now().toString().slice(-6),
      timestamp: now.toISOString(),
      customer: selectedCustomer,
      items: cartItems.map((i) => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        price: i.price,
        lineTotal: i.lineTotal,
      })),
      subtotal: salesSubtotal,
      gstIncluded: includeGst,
      gstRate: includeGst ? gstRate : 0,
      gstAmount: salesGstAmount,
      grandTotal: salesGrandTotal,
    };

    setSalesLogs((prev) => [newEntry, ...prev]);
    setCart({});
  };

  // --- VENDOR QUANTITY (+ / -) HANDLERS ---
  const updateVendorCartQty = (mat, delta) => {
    setVendorCart((prev) => {
      const currentQty = prev[mat.id] || 0;
      const nextQty = currentQty + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[mat.id];
        return copy;
      }
      return { ...prev, [mat.id]: nextQty };
    });
  };

  const vendorCartItems = useMemo(() => {
    return Object.entries(vendorCart)
      .map(([id, qty]) => {
        const mat = materials.find((m) => m.id === id);
        if (!mat) return null;
        return { ...mat, qty, lineTotal: mat.cost * qty };
      })
      .filter(Boolean);
  }, [vendorCart, materials]);

  const vendorSubtotal = useMemo(
    () => vendorCartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [vendorCartItems]
  );
  const vendorGstAmount = useMemo(
    () => (vendorGst ? Math.round((vendorSubtotal * vendorGstRate) / 100) : 0),
    [vendorSubtotal, vendorGst, vendorGstRate]
  );
  const vendorGrandTotal = vendorSubtotal + vendorGstAmount;

  const handleConfirmVendorOrder = () => {
    if (vendorCartItems.length === 0) {
      alert("Please add items to procure from Vendor.");
      return;
    }

    // Increase Material Stock & Auto-add to Product Vault
    setMaterials((prev) =>
      prev.map((m) => {
        const added = vendorCart[m.id] || 0;
        return added ? { ...m, stock: m.stock + added } : m;
      })
    );

    const now = new Date();
    const newVendorLog = {
      id: "PO-" + Date.now().toString().slice(-6),
      timestamp: now.toISOString(),
      vendor: selectedVendor,
      items: vendorCartItems.map((i) => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        cost: i.cost,
        lineTotal: i.lineTotal,
      })),
      subtotal: vendorSubtotal,
      gstIncluded: vendorGst,
      gstRate: vendorGst ? vendorGstRate : 0,
      gstAmount: vendorGstAmount,
      grandTotal: vendorGrandTotal,
    };

    setVendorLogs((prev) => [newVendorLog, ...prev]);
    setVendorCart({});
  };

  // --- HELPER: GROUP LOGS BY DAILY / WEEKLY / MONTHLY ---
  const groupLogsByPeriod = (logs, period, partyKey, filterValue) => {
    const filtered =
      filterValue === "ALL"
        ? logs
        : logs.filter((l) => l[partyKey] === filterValue);

    const groups = {};

    filtered.forEach((log) => {
      const date = new Date(log.timestamp);
      let groupKey = "";
      let groupLabel = "";

      if (period === "daily") {
        groupKey = date.toISOString().split("T")[0];
        groupLabel = date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } else if (period === "weekly") {
        // Start of week (Monday)
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.setDate(diff));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        groupKey = weekStart.toISOString().split("T")[0];
        groupLabel = `Week: ${weekStart.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        })} – ${weekEnd.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`;
      } else {
        // Monthly
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        groupLabel = date.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          label: groupLabel,
          totalAmount: 0,
          totalGst: 0,
          entries: [],
        };
      }
      groups[groupKey].totalAmount += log.grandTotal;
      groups[groupKey].totalGst += log.gstAmount;
      groups[groupKey].entries.push(log);
    });

    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  };

  const groupedSales = useMemo(
    () => groupLogsByPeriod(salesLogs, salesPeriod, "customer", customerFilter),
    [salesLogs, salesPeriod, customerFilter]
  );

  const groupedVendors = useMemo(
    () => groupLogsByPeriod(vendorLogs, vendorPeriod, "vendor", vendorFilter),
    [vendorLogs, vendorPeriod, vendorFilter]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans">
      {/* Header matching screenshot */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white font-bold text-lg flex items-center justify-center shadow-sm">
            M
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight text-slate-900">
              Manufacturer ERP
            </h1>
            <p className="text-xs text-slate-400">Role: superadmin</p>
          </div>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Dropdown Navigation Menu */}
      {menuOpen && (
        <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-md space-y-2">
          <button
            onClick={() => { setActiveTab("sales"); setMenuOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold ${
              activeTab === "sales" ? "bg-sky-50 text-sky-700" : "text-slate-700"
            }`}
          >
            📦 Dispatch & Customer Sales
          </button>
          <button
            onClick={() => { setActiveTab("vendor"); setMenuOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold ${
              activeTab === "vendor" ? "bg-sky-50 text-sky-700" : "text-slate-700"
            }`}
          >
            🏭 Vendor Procurement & Logs
          </button>
        </div>
      )}

      {/* Quick Module Switcher Pills */}
      <div className="px-4 pt-3 flex gap-2">
        <button
          onClick={() => setActiveTab("sales")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
            activeTab === "sales"
              ? "bg-sky-600 text-white border-sky-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200"
          }`}
        >
          Customer Dispatch & Sales
        </button>
        <button
          onClick={() => setActiveTab("vendor")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
            activeTab === "vendor"
              ? "bg-sky-600 text-white border-sky-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200"
          }`}
        >
          Vendor & Purchase Log
        </button>
      </div>

      {/* Action Badges Row */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2">
        <button
          onClick={handleResetAll}
          className="bg-red-50 text-red-600 border border-red-200 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition"
        >
          🧹 Reset Entire Data to 0
        </button>
        <div className="bg-white text-sky-700 border border-slate-200 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-2xs">
          Oct 14, 2026 • Live Sync
        </div>
      </div>

      {/* ==================== MODULE 1: SALES & DISPATCH ==================== */}
      {activeTab === "sales" && (
        <div className="px-4 space-y-4">
          {/* Product Cards */}
          {products.map((product) => {
            const inCartQty = cart[product.id] || 0;
            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">
                      {product.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      In Vault: <span className="font-bold text-slate-700">{product.vault} Units</span>
                    </p>
                  </div>

                  {/* Quick Vault Refill (+ / -) for Production */}
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 text-xs">
                    <button
                      onClick={() => adjustVaultStock(product.id, -1)}
                      className="w-6 h-6 rounded bg-white text-slate-700 font-bold shadow-2xs"
                      title="Decrease Vault"
                    >
                      -
                    </button>
                    <span className="px-1.5 text-[11px] font-semibold text-slate-600">
                      Vault
                    </span>
                    <button
                      onClick={() => adjustVaultStock(product.id, 1)}
                      className="w-6 h-6 rounded bg-white text-emerald-700 font-bold shadow-2xs"
                      title="Add to Vault"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-lg text-slate-900">
                    ₹{product.price.toLocaleString("en-IN")}
                  </span>

                  {/* Quantity Add / Subtract Stepper */}
                  {inCartQty === 0 ? (
                    <button
                      onClick={() => updateCartQty(product, 1)}
                      disabled={product.vault === 0}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition ${
                        product.vault === 0
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-sky-600 text-white hover:bg-sky-700 active:scale-95"
                      }`}
                    >
                      <span className="text-base leading-none">+</span> Cart
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-2 py-1">
                      <button
                        onClick={() => updateCartQty(product, -1)}
                        className="w-8 h-8 rounded-lg bg-white text-sky-700 font-bold text-base shadow-2xs active:scale-95"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-bold text-sky-900 text-sm">
                        {inCartQty}
                      </span>
                      <button
                        onClick={() => updateCartQty(product, 1)}
                        className="w-8 h-8 rounded-lg bg-sky-600 text-white font-bold text-base shadow-2xs active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Dispatch Manifest with Qty +/- and GST Inclusion */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-base text-slate-900">Dispatch Manifest</h3>

            {/* Customer Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Select Customer Segment
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:border-sky-500"
              >
                {CUSTOMERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List with - / + Controls */}
            {cartItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">
                No items in manifest. Tap <b>+ Cart</b> above to add products.
              </p>
            ) : (
              <div className="space-y-2.5 border-t border-b border-slate-100 py-3">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs gap-2"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-slate-400">
                        ₹{item.price.toLocaleString("en-IN")} / unit
                      </p>
                    </div>

                    {/* Quantity Stepper inside Manifest */}
                    <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
                      <button
                        onClick={() => updateCartQty(item, -1)}
                        className="w-6 h-6 rounded bg-white text-slate-700 font-bold shadow-2xs"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-bold text-slate-800">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateCartQty(item, 1)}
                        className="w-6 h-6 rounded bg-white text-sky-700 font-bold shadow-2xs"
                      >
                        +
                      </button>
                    </div>

                    <div className="w-20 text-right font-bold text-slate-900">
                      ₹{item.lineTotal.toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* GST Configuration Row */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeGst}
                    onChange={(e) => setIncludeGst(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-0 w-4 h-4"
                  />
                  Include GST in Invoice
                </label>

                {includeGst && (
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
                  >
                    <option value={5}>GST 5%</option>
                    <option value={12}>GST 12%</option>
                    <option value={18}>GST 18%</option>
                    <option value={28}>GST 28%</option>
                  </select>
                )}
              </div>

              {/* Price Summary Breakdown */}
              <div className="text-xs space-y-1 pt-1 border-t border-slate-200/60">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{salesSubtotal.toLocaleString("en-IN")}</span>
                </div>
                {includeGst && (
                  <div className="flex justify-between text-slate-600">
                    <span>
                      GST ({gstRate}% — CGST {gstRate / 2}% + SGST {gstRate / 2}%)
                    </span>
                    <span>+ ₹{salesGstAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                  <span>Grand Total</span>
                  <span>₹{salesGrandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmDispatch}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
            >
              <span>🖨️</span> Confirm Dispatch
            </button>
          </div>

          {/* ==================== SALES LOG (DAILY / WEEKLY / MONTHLY) ==================== */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Customer Sales Log
                </h3>
                <p className="text-xs text-slate-400">
                  Grouped by Date, Week & Month
                </p>
              </div>
              <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                {salesLogs.length} Bills
              </span>
            </div>

            {/* Period Filter Tabs: Daily | Weekly | Monthly */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
              {["daily", "weekly", "monthly"].map((p) => (
                <button
                  key={p}
                  onClick={() => setSalesPeriod(p)}
                  className={`py-2 rounded-lg text-xs font-bold capitalize transition ${
                    salesPeriod === p
                      ? "bg-white text-sky-700 shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  {p === "daily" ? "Daily (Date)" : p}
                </button>
              ))}
            </div>

            {/* Customer Segment Filter */}
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50"
            >
              <option value="ALL">All Customer Segments</option>
              {CUSTOMERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Grouped Sales List */}
            {groupedSales.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No sales dispatches recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {groupedSales.map((group) => (
                  <div
                    key={group.key}
                    className="border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <div className="bg-slate-100 px-3.5 py-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        📅 {group.label}
                      </span>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-emerald-700">
                          ₹{group.totalAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          incl. GST ₹{group.totalGst.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {group.entries.map((log) => (
                        <div key={log.id} className="p-3 text-xs space-y-1.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-slate-900">
                                {log.customer}
                              </span>
                              <span className="ml-2 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-500">
                                {log.id}
                              </span>
                            </div>
                            <span className="font-bold text-slate-900">
                              ₹{log.grandTotal.toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="text-slate-600 space-y-0.5">
                            {log.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-[11px]">
                                <span>
                                  {it.name} × <b>{it.qty}</b>
                                </span>
                                <span>₹{it.lineTotal.toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-1 text-[10px] text-slate-400 border-t border-slate-50">
                            <span>
                              {new Date(log.timestamp).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span>
                              Subtotal: ₹{log.subtotal.toLocaleString("en-IN")} | GST ({log.gstRate}%): ₹
                              {log.gstAmount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODULE 2: VENDOR & PROCUREMENT ==================== */}
      {activeTab === "vendor" && (
        <div className="px-4 space-y-4">
          {/* Raw Material Cards with Qty +/- */}
          {materials.map((mat) => {
            const inOrderQty = vendorCart[mat.id] || 0;
            return (
              <div
                key={mat.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3"
              >
                <div>
                  <h2 className="font-bold text-slate-900 text-base">{mat.name}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Available Stock: <span className="font-bold text-slate-700">{mat.stock} Units</span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-lg text-slate-900">
                    ₹{mat.cost.toLocaleString("en-IN")}
                  </span>

                  {inOrderQty === 0 ? (
                    <button
                      onClick={() => updateVendorCartQty(mat, 1)}
                      className="px-4 py-2 rounded-xl bg-sky-600 text-white font-semibold text-sm flex items-center gap-1.5 active:scale-95 transition"
                    >
                      <span>+</span> Order
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-2 py-1">
                      <button
                        onClick={() => updateVendorCartQty(mat, -1)}
                        className="w-8 h-8 rounded-lg bg-white text-sky-700 font-bold text-base shadow-2xs"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-bold text-sky-900 text-sm">
                        {inOrderQty}
                      </span>
                      <button
                        onClick={() => updateVendorCartQty(mat, 1)}
                        className="w-8 h-8 rounded-lg bg-sky-600 text-white font-bold text-base shadow-2xs"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Vendor Purchase Manifest */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Vendor Purchase Manifest
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Select Supplier / Vendor
              </label>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-800 bg-white"
              >
                {VENDORS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {vendorCartItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">
                No materials selected. Tap <b>+ Order</b> above to add items.
              </p>
            ) : (
              <div className="space-y-2.5 border-t border-b border-slate-100 py-3">
                {vendorCartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs gap-2"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-slate-400">
                        ₹{item.cost.toLocaleString("en-IN")} / unit
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
                      <button
                        onClick={() => updateVendorCartQty(item, -1)}
                        className="w-6 h-6 rounded bg-white text-slate-700 font-bold"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-bold text-slate-800">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateVendorCartQty(item, 1)}
                        className="w-6 h-6 rounded bg-white text-sky-700 font-bold"
                      >
                        +
                      </button>
                    </div>

                    <div className="w-20 text-right font-bold text-slate-900">
                      ₹{item.lineTotal.toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Vendor GST Breakdown */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vendorGst}
                    onChange={(e) => setVendorGst(e.target.checked)}
                    className="rounded text-sky-600 w-4 h-4"
                  />
                  Include Input GST
                </label>

                {vendorGst && (
                  <select
                    value={vendorGstRate}
                    onChange={(e) => setVendorGstRate(Number(e.target.value))}
                    className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1"
                  >
                    <option value={5}>GST 5%</option>
                    <option value={12}>GST 12%</option>
                    <option value={18}>GST 18%</option>
                    <option value={28}>GST 28%</option>
                  </select>
                )}
              </div>

              <div className="text-xs space-y-1 pt-1 border-t border-slate-200/60">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{vendorSubtotal.toLocaleString("en-IN")}</span>
                </div>
                {vendorGst && (
                  <div className="flex justify-between text-slate-600">
                    <span>Input GST ({vendorGstRate}%)</span>
                    <span>+ ₹{vendorGstAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                  <span>Total Purchase Value</span>
                  <span>₹{vendorGrandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmVendorOrder}
              className="w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
            >
              <span>📥</span> Record Vendor Purchase
            </button>
          </div>

          {/* ==================== VENDOR LOG (DAILY / WEEKLY / MONTHLY) ==================== */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Vendor Purchase Log
                </h3>
                <p className="text-xs text-slate-400">
                  Daily, Weekly & Monthly Supplier Ledger
                </p>
              </div>
              <span className="text-xs font-bold bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full">
                {vendorLogs.length} POs
              </span>
            </div>

            {/* Period Filter Tabs: Daily | Weekly | Monthly */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
              {["daily", "weekly", "monthly"].map((p) => (
                <button
                  key={p}
                  onClick={() => setVendorPeriod(p)}
                  className={`py-2 rounded-lg text-xs font-bold capitalize transition ${
                    vendorPeriod === p
                      ? "bg-white text-sky-700 shadow-2xs"
                      : "text-slate-600"
                  }`}
                >
                  {p === "daily" ? "Daily (Date)" : p}
                </button>
              ))}
            </div>

            {/* Vendor Segment Filter */}
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50"
            >
              <option value="ALL">All Vendors</option>
              {VENDORS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            {groupedVendors.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No vendor purchases recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {groupedVendors.map((group) => (
                  <div
                    key={group.key}
                    className="border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <div className="bg-slate-100 px-3.5 py-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        📅 {group.label}
                      </span>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-sky-700">
                          ₹{group.totalAmount.toLocaleString("en-IN")}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          incl. GST ₹{group.totalGst.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {group.entries.map((log) => (
                        <div key={log.id} className="p-3 text-xs space-y-1.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-slate-900">
                                {log.vendor}
                              </span>
                              <span className="ml-2 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-500">
                                {log.id}
                              </span>
                            </div>
                            <span className="font-bold text-slate-900">
                              ₹{log.grandTotal.toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="text-slate-600 space-y-0.5">
                            {log.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-[11px]">
                                <span>
                                  {it.name} × <b>{it.qty}</b>
                                </span>
                                <span>₹{it.lineTotal.toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-1 text-[10px] text-slate-400 border-t border-slate-50">
                            <span>
                              {new Date(log.timestamp).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span>
                              Subtotal: ₹{log.subtotal.toLocaleString("en-IN")} | GST ({log.gstRate}%): ₹
                              {log.gstAmount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [signedIn, setSignedIn] = useState(
    () => sessionStorage.getItem("manufacturer-erp-signed-in") === "true"
  );

  function handleSignIn(email) {
    sessionStorage.setItem("manufacturer-erp-signed-in", "true");
    sessionStorage.setItem("manufacturer-erp-user-email", email);
    setSignedIn(true);
  }

  return signedIn ? <Workspace /> : <LoginScreen onSignIn={handleSignIn} />;
}
