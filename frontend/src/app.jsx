import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Boxes, BriefcaseBusiness, CircleDollarSign, ClipboardList, Factory,
  FileBarChart, LayoutDashboard, LogOut, PackageCheck, Plus, ReceiptIndianRupee,
  Settings, ShoppingCart, UserRoundCheck, Users, Warehouse, Workflow, Wrench,
} from "lucide-react";
import { getWorkspace, supabase } from "./supabase";
import "./app.css";

const allRoles = ["superadmin", "admin", "manager", "employee"];
const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: allRoles },
  { id: "purchase-orders", label: "Purchase orders", icon: ClipboardList, roles: ["superadmin", "admin", "manager"] },
  { id: "inventory", label: "Inventory", icon: Warehouse, roles: allRoles },
  { id: "procurement", label: "Material procurement", icon: ShoppingCart, roles: allRoles },
  { id: "process", label: "Process", icon: Workflow, roles: allRoles },
  { id: "dispatch", label: "Dispatch", icon: PackageCheck, roles: ["superadmin", "admin", "manager", "employee"] },
  { id: "sales", label: "Sales & customers", icon: BriefcaseBusiness, roles: ["superadmin", "admin", "manager"] },
  { id: "expenses", label: "Expenses", icon: ReceiptIndianRupee, roles: ["superadmin", "admin", "manager"] },
  { id: "financial", label: "Financial data", icon: CircleDollarSign, roles: ["superadmin", "admin"] },
  { id: "people", label: "People & attendance", icon: UserRoundCheck, roles: ["superadmin", "admin"] },
  { id: "process-builder", label: "Process builder", icon: Wrench, roles: ["superadmin"], compact: true },
];

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => subscription.unsubscribe();
  }, []);

  if (!supabase) return <Notice text="Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Vercel." />;
  if (loading) return <Notice text="Connecting to your workspace…" />;
  return session ? <Workspace session={session} onSignOut={() => supabase.auth.signOut()} /> : <AccessScreen onReady={() => setLoading(false)} />;
}

function Notice({ text }) { return <div className="center-notice">{text}</div>; }

function AccessScreen({ onReady }) {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ company: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const create = mode === "create";
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  async function submit(event) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      if (create) {
        if (!form.company || !form.name) throw new Error("Enter your company and name.");
        const { error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { company_name: form.company, full_name: form.name } } });
        if (authError) throw authError;
        await getWorkspace();
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (authError) throw authError;
        await getWorkspace();
      }
      onReady();
    } catch (err) { setError(err.message || "Unable to continue."); }
    finally { setBusy(false); }
  }

  return <main className="access-page"><section className="access-hero"><div className="brand"><Factory /> MANUFACTURER <b>ERP</b></div><div><p className="overline">CONNECTED OPERATIONS</p><h1>Make every<br />operation <em>count.</em></h1><p>One workspace for production, materials, purchasing, and delivery.</p></div><div className="hero-points"><span>✓ One source of operational truth</span><span>✓ Secure company workspaces</span><span>✓ Built for growing manufacturers</span></div></section><section className="access-form"><div className="form-card"><div className="auth-tabs"><button className={!create ? "selected" : ""} onClick={() => setMode("signin")}>Sign in</button><button className={create ? "selected" : ""} onClick={() => setMode("create")}>Create workspace</button></div><p className="overline">{create ? "START FOR FREE" : "SECURE ACCESS"}</p><h2>{create ? "Set up your company" : "Welcome back"}</h2><p className="subtext">{create ? "Create a private home for your operations." : "Sign in to your manufacturing workspace."}</p><form onSubmit={submit}>{create && <><Field label="Company name" value={form.company} onChange={update("company")} placeholder="Your company name" /><Field label="Your full name" value={form.name} onChange={update("name")} placeholder="Your name" /></>}<Field label="Work email" type="email" value={form.email} onChange={update("email")} placeholder="name@company.com" /><Field label="Password" type="password" value={form.password} onChange={update("password")} placeholder={create ? "Create a password" : "Enter your password"} />{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? "Please wait…" : create ? "Create workspace" : "Sign in"}<ArrowRight size={17} /></button></form></div></section></main>;
}

function Field({ label, ...props }) { return <label className="field"><span>{label}</span><input required {...props} /></label>; }

function Workspace({ session, onSignOut }) {
  const [active, setActive] = useState("dashboard");
  const [workspace, setWorkspace] = useState(null);
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const current = await getWorkspace(); setWorkspace(current);
      const [productResult, materialResult, salesResult, orderResult, expenseResult] = await Promise.all([
        supabase.from("products").select("*").eq("organization_id", current.id).order("created_at", { ascending: false }),
        supabase.from("raw_materials").select("*").eq("organization_id", current.id).order("created_at", { ascending: false }),
        supabase.from("sales").select("*").eq("organization_id", current.id).order("created_at", { ascending: false }),
        supabase.from("purchase_orders").select("*").eq("organization_id", current.id).order("created_at", { ascending: false }),
        supabase.from("expenses").select("*").eq("organization_id", current.id).order("created_at", { ascending: false }),
      ]);
      if (productResult.error || materialResult.error || salesResult.error || orderResult.error || expenseResult.error) throw productResult.error || materialResult.error || salesResult.error || orderResult.error || expenseResult.error;
      setProducts(productResult.data); setMaterials(materialResult.data); setSales(salesResult.data);
      setPurchaseOrders(orderResult.data); setExpenses(expenseResult.data);
    } catch (err) { setError(err.message || "Could not load workspace data."); }
  }
  useEffect(() => { load(); }, []);

  async function addRecord(table, values) {
    const { data, error: insertError } = await supabase.from(table).insert({ ...values, organization_id: workspace.id }).select().single();
    if (insertError) { setError(insertError.message); return null; }
    await load();
    return data;
  }
  const stats = useMemo(() => ({ stock: products.reduce((n, row) => n + Number(row.stock), 0), materials: materials.reduce((n, row) => n + Number(row.stock), 0), sales: sales.reduce((n, row) => n + Number(row.grand_total), 0), expenses: expenses.reduce((n, row) => n + Number(row.amount), 0) }), [products, materials, sales, expenses]);
  const role = workspace?.role || "employee";
  const visibleNavigation = navigation.filter((item) => item.roles.includes(role));
  const title = navigation.find((item) => item.id === active)?.label || "Dashboard";

  return <div className="erp-shell"><aside className="erp-sidebar"><div className="brand"><Factory /> MANUFACTURER <b>ERP</b></div><p className="workspace-label">{workspace?.name || "Loading workspace"} · {role}</p><nav>{visibleNavigation.map(({ id, label, icon: Icon, compact }) => <button key={id} className={`${active === id ? "nav-active" : ""} ${compact ? "nav-compact" : ""}`} onClick={() => setActive(id)} title={compact ? "Super Admin: process builder" : label}><Icon size={18} />{label}{compact && <small>SUPER ADMIN</small>}</button>)}</nav><button className="logout" onClick={onSignOut}><LogOut size={17} />Sign out</button></aside><main className="erp-content"><header><div><p className="overline">OPERATIONS CENTER</p><h1>{title}</h1></div><span className="user-pill">{session.user.email}</span></header>{error && <p className="app-error">{error}</p>}<Module active={active} role={role} stats={stats} products={products} materials={materials} sales={sales} purchaseOrders={purchaseOrders} expenses={expenses} addRecord={addRecord} /></main></div>;
}

function Module({ active, role, stats, products, materials, sales, purchaseOrders, expenses, addRecord }) {
  if (active === "dashboard") return <><div className="stat-grid"><Stat label="Finished goods" value={products.length} icon={<Boxes />} /><Stat label="Product stock" value={stats.stock} icon={<PackageCheck />} /><Stat label="Raw material units" value={stats.materials} icon={<Warehouse />} /><Stat label="Recorded sales" value={money.format(stats.sales)} icon={<ClipboardList />} /></div><section className="panel"><h3>Operational overview</h3><p>Your cloud workspace is ready. Add inventory, materials, and sales records to begin tracking your factory operations.</p></section></>;
  if (active === "purchase-orders") return <RecordModule title="Purchase orders" rows={purchaseOrders} empty="No purchase orders created." fields={[['supplier_name','Supplier name'],['purchase_order_number','PO number'],['total_amount','Order value','number']]} onAdd={(data) => addRecord("purchase_orders", { ...data, total_amount: Number(data.total_amount), status: "draft" })} columns={["supplier_name", "purchase_order_number", "status", "total_amount"]} />;
  if (active === "inventory") return <><RecordModule title="Finished goods" rows={products} empty="No finished goods recorded." fields={[['name','Product name'],['sku','SKU'],['stock','Opening stock','number'],['price','Unit price','number']]} onAdd={(data) => addRecord("products", { ...data, stock: Number(data.stock), price: Number(data.price) })} columns={["name", "sku", "stock", "price"]} /><RecordModule title="Raw materials" rows={materials} empty="No raw materials recorded." fields={[['name','Material name'],['sku','SKU'],['stock','Available quantity','number'],['unit','Unit'],['cost','Unit cost','number']]} onAdd={(data) => addRecord("raw_materials", { ...data, stock: Number(data.stock), cost: Number(data.cost) })} columns={["name", "sku", "stock", "unit", "cost"]} /></>;
  if (active === "procurement") return <RecordModule title="Material procurement" rows={materials} empty="No raw materials recorded." readOnly={role === "employee"} fields={[['name','Material name'],['sku','SKU'],['stock','Available quantity','number'],['unit','Unit'],['cost','Unit cost','number']]} onAdd={(data) => addRecord("raw_materials", { ...data, stock: Number(data.stock), cost: Number(data.cost) })} columns={["name", "sku", "stock", "unit", "cost"]} />;
  if (active === "process") return <OperationalModule icon={<Workflow />} title="Manufacturing process" description="Plan work orders and run the approved process for each finished product." steps={["Select product", "Check material availability", "Start production"]} />;
  if (active === "dispatch") return <RecordModule title="Dispatch records" rows={sales} empty="No dispatch records recorded." fields={[['customer_name','Customer name'],['invoice_number','Dispatch / invoice number'],['grand_total','Order value','number']]} onAdd={(data) => addRecord("sales", { ...data, subtotal: Number(data.grand_total), gst_amount: 0, grand_total: Number(data.grand_total) })} columns={["customer_name", "invoice_number", "grand_total"]} />;
  if (active === "sales") return <RecordModule title="Sales & customers" rows={sales} empty="No sales have been recorded." fields={[['customer_name','Customer name'],['invoice_number','Invoice number'],['grand_total','Sales value','number']]} onAdd={(data) => addRecord("sales", { ...data, subtotal: Number(data.grand_total), gst_amount: 0, grand_total: Number(data.grand_total) })} columns={["customer_name", "invoice_number", "grand_total"]} />;
  if (active === "expenses") return <RecordModule title="Expenses" rows={expenses} empty="No expenses recorded." fields={[['category','Expense category'],['description','Description'],['amount','Amount','number']]} onAdd={(data) => addRecord("expenses", { ...data, amount: Number(data.amount) })} columns={["category", "description", "amount"]} />;
  if (active === "financial") return <FinancialModule stats={stats} purchaseOrders={purchaseOrders} />;
  if (active === "people") return <OperationalModule icon={<Users />} title="People management & attendance" description="Manage team access, roles, departments, and daily attendance from one administration area." steps={["Invite employee", "Assign role", "Record attendance"]} />;
  if (active === "process-builder" && role === "superadmin") return <ProcessBuilder products={products} onAddProduct={(data) => addRecord("products", data)} onSaveProcess={(data) => addRecord("process_definitions", data)} />;
  return <OperationalModule icon={<Settings />} title="Workspace settings" description="Configure your company workspace and operational preferences." steps={["Organization profile", "Access control", "Data preferences"]} />;
}

function OperationalModule({ icon, title, description, steps }) { return <section className="panel operational-module"><span className="module-icon">{icon}</span><h3>{title}</h3><p>{description}</p><div className="process-steps">{steps.map((step, index) => <span key={step}><b>{index + 1}</b>{step}</span>)}</div></section>; }
function FinancialModule({ stats, purchaseOrders }) { const purchaseValue = purchaseOrders.reduce((total, order) => total + Number(order.total_amount), 0); return <section className="financial-grid"><Stat label="Sales recorded" value={money.format(stats.sales)} icon={<BriefcaseBusiness />} /><Stat label="Expenses recorded" value={money.format(stats.expenses)} icon={<ReceiptIndianRupee />} /><Stat label="Purchase order value" value={money.format(purchaseValue)} icon={<ClipboardList />} /><Stat label="Operating balance" value={money.format(stats.sales - stats.expenses - purchaseValue)} icon={<CircleDollarSign />} /></section>; }
function ProcessBuilder({ products, onAddProduct, onSaveProcess }) {
  const [productId, setProductId] = useState("");
  const [newProduct, setNewProduct] = useState("");
  const [stepCount, setStepCount] = useState(1);
  const [steps, setSteps] = useState([{ name: "" }]);
  const [materialMode, setMaterialMode] = useState("automatic");
  const [message, setMessage] = useState("");

  function setCount(value) {
    const count = Math.max(1, Math.min(12, Number(value) || 1));
    setStepCount(count);
    setSteps((current) => Array.from({ length: count }, (_, index) => current[index] || { name: "" }));
  }
  function updateStep(index, patch) { setSteps((current) => current.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step)); }
  async function save() {
    if (!productId && !newProduct.trim()) { setMessage("Choose an existing product or create a new product first."); return; }
    if (steps.some((step) => !step.name.trim())) { setMessage("Give every process step a name."); return; }
    setMessage("Saving process plan…");
    let id = productId;
    if (!id) { const product = await onAddProduct({ name: newProduct.trim(), stock: 0, price: 0 }); if (!product) { setMessage("Could not create the product."); return; } id = product.id; }
    for (const [index, step] of steps.entries()) await onSaveProcess({ product_id: id, name: `${index + 1}. ${step.name.trim()}`, material_fetch_mode: materialMode });
    setMessage("Product process plan saved successfully."); setProductId(""); setNewProduct(""); setCount(1); setSteps([{ name: "" }]);
  }
  return <section className="panel process-builder"><span className="module-icon"><Wrench /></span><h3>Product process builder</h3><p>Set a product’s number of processes, name each process, then choose one material-fetch rule for the whole product.</p><div className="builder-fields"><label className="field"><span>Existing finished product</span><select value={productId} onChange={(event) => { setProductId(event.target.value); setNewProduct(""); }}><option value="">Create a new product below</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><Field label="New product name" value={newProduct} onChange={(event) => { setNewProduct(event.target.value); setProductId(""); }} placeholder="e.g. Precision gear" /><label className="field"><span>Number of processes</span><select value={stepCount} onChange={(event) => setCount(event.target.value)}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label></div><div className="fetch-options"><button type="button" className={materialMode === "automatic" ? "selected" : ""} onClick={() => setMaterialMode("automatic")}><strong>Automatic material fetch</strong><span>Apply automatic inventory material fetching for this product.</span></button><button type="button" className={materialMode === "manual" ? "selected" : ""} onClick={() => setMaterialMode("manual")}><strong>Manual material fetch</strong><span>Require manual issue of materials for this product.</span></button></div><div className="process-step-editor">{steps.map((step, index) => <div className="step-editor" key={index}><strong>Process {index + 1}</strong><Field label="Process name" value={step.name} onChange={(event) => updateStep(index, { name: event.target.value })} placeholder="e.g. CNC machining" /></div>)}</div><button type="button" className="primary-button compact builder-save" onClick={save}>Save product process plan</button>{message && <p className="builder-note">{message}</p>}</section>;
}

function Stat({ label, value, icon }) { return <section className="stat"><span>{icon}</span><p>{label}</p><strong>{value}</strong></section>; }
function RecordModule({ title, rows, empty, fields, onAdd, columns, readOnly = false }) { const [open, setOpen] = useState(false); const [form, setForm] = useState({}); const submit = async (event) => { event.preventDefault(); const saved = await onAdd(form); if (saved) { setOpen(false); setForm({}); } }; return <><div className="module-heading"><div><h2>{title}</h2><p>{readOnly ? "View-only access. Contact a manager to request material changes." : "Stored securely in your Supabase workspace."}</p></div>{!readOnly && <button className="primary-button compact" onClick={() => setOpen(!open)}><Plus size={17} />Add record</button>}</div>{open && <form className="record-form panel" onSubmit={submit}>{fields.map(([key, label, type = "text"]) => <Field key={key} label={label} type={type} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />)}<button className="primary-button compact">Save record</button></form>}<section className="panel table-panel">{rows.length ? <table><thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column}>{column.includes("price") || column.includes("cost") || column.includes("total") || column === "amount" ? money.format(row[column] || 0) : row[column] || "—"}</td>)}</tr>)}</tbody></table> : <div className="empty"><Boxes size={27} />{empty}</div>}</section></>; }
