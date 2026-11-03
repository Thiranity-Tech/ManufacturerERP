import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Boxes, ClipboardList, Factory, LayoutDashboard, LogOut,
  PackageCheck, Plus, Settings, ShoppingCart, Users, Warehouse,
} from "lucide-react";
import { getWorkspace, supabase } from "./supabase";
import "./app.css";

const navigation = [
  ["dashboard", "Dashboard", LayoutDashboard], ["inventory", "Inventory", Warehouse],
  ["procurement", "Procurement", ShoppingCart], ["manufacturing", "Manufacturing", Factory],
  ["dispatch", "Dispatch", PackageCheck], ["people", "People", Users], ["settings", "Settings", Settings],
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
  const [error, setError] = useState("");

  async function load() {
    try {
      const current = await getWorkspace(); setWorkspace(current);
      const [productResult, materialResult, salesResult] = await Promise.all([
        supabase.from("products").select("*").eq("organization_id", current.id).order("created_at", { ascending: false }),
        supabase.from("raw_materials").select("*").eq("organization_id", current.id).order("created_at", { ascending: false }),
        supabase.from("sales").select("*").eq("organization_id", current.id).order("created_at", { ascending: false }),
      ]);
      if (productResult.error || materialResult.error || salesResult.error) throw productResult.error || materialResult.error || salesResult.error;
      setProducts(productResult.data); setMaterials(materialResult.data); setSales(salesResult.data);
    } catch (err) { setError(err.message || "Could not load workspace data."); }
  }
  useEffect(() => { load(); }, []);

  async function addRecord(table, values) {
    const { error: insertError } = await supabase.from(table).insert({ ...values, organization_id: workspace.id });
    if (insertError) { setError(insertError.message); return; }
    await load();
  }
  const stats = useMemo(() => ({ stock: products.reduce((n, row) => n + Number(row.stock), 0), materials: materials.reduce((n, row) => n + Number(row.stock), 0), sales: sales.reduce((n, row) => n + Number(row.grand_total), 0) }), [products, materials, sales]);
  const title = navigation.find(([id]) => id === active)?.[1] || "Dashboard";

  return <div className="erp-shell"><aside className="erp-sidebar"><div className="brand"><Factory /> MANUFACTURER <b>ERP</b></div><p className="workspace-label">{workspace?.name || "Loading workspace"}</p><nav>{navigation.map(([id, label, Icon]) => <button key={id} className={active === id ? "nav-active" : ""} onClick={() => setActive(id)}><Icon size={18} />{label}</button>)}</nav><button className="logout" onClick={onSignOut}><LogOut size={17} />Sign out</button></aside><main className="erp-content"><header><div><p className="overline">OPERATIONS CENTER</p><h1>{title}</h1></div><span className="user-pill">{session.user.email}</span></header>{error && <p className="app-error">{error}</p>}<Module active={active} stats={stats} products={products} materials={materials} sales={sales} addRecord={addRecord} /></main></div>;
}

function Module({ active, stats, products, materials, sales, addRecord }) {
  if (active === "dashboard") return <><div className="stat-grid"><Stat label="Finished goods" value={products.length} icon={<Boxes />} /><Stat label="Product stock" value={stats.stock} icon={<PackageCheck />} /><Stat label="Raw material units" value={stats.materials} icon={<Warehouse />} /><Stat label="Recorded sales" value={money.format(stats.sales)} icon={<ClipboardList />} /></div><section className="panel"><h3>Operational overview</h3><p>Your cloud workspace is ready. Add inventory, materials, and sales records to begin tracking your factory operations.</p></section></>;
  if (active === "inventory") return <RecordModule title="Finished goods" rows={products} empty="No finished goods recorded." fields={[['name','Product name'],['sku','SKU'],['stock','Opening stock','number'],['price','Unit price','number']]} onAdd={(data) => addRecord("products", { ...data, stock: Number(data.stock), price: Number(data.price) })} columns={["name", "sku", "stock", "price"]} />;
  if (active === "procurement") return <RecordModule title="Raw materials" rows={materials} empty="No raw materials recorded." fields={[['name','Material name'],['sku','SKU'],['stock','Available quantity','number'],['unit','Unit'],['cost','Unit cost','number']]} onAdd={(data) => addRecord("raw_materials", { ...data, stock: Number(data.stock), cost: Number(data.cost) })} columns={["name", "sku", "stock", "unit", "cost"]} />;
  if (active === "dispatch") return <RecordModule title="Sales & dispatch" rows={sales} empty="No dispatch records recorded." fields={[['customer_name','Customer name'],['invoice_number','Invoice number'],['grand_total','Order value','number']]} onAdd={(data) => addRecord("sales", { ...data, subtotal: Number(data.grand_total), gst_amount: 0, grand_total: Number(data.grand_total) })} columns={["customer_name", "invoice_number", "grand_total"]} />;
  if (active === "manufacturing") return <section className="panel"><Factory size={28} /><h3>Manufacturing work orders</h3><p>Create work orders from finished goods as your production process is configured. This workspace already tracks the materials and products that feed it.</p></section>;
  if (active === "people") return <section className="panel"><Users size={28} /><h3>People & roles</h3><p>Users are secured by Supabase Authentication. Add team invitations and department roles next as your company workflow grows.</p></section>;
  return <section className="panel"><Settings size={28} /><h3>Workspace settings</h3><p>Configure organization details, user access, and operational preferences here.</p></section>;
}

function Stat({ label, value, icon }) { return <section className="stat"><span>{icon}</span><p>{label}</p><strong>{value}</strong></section>; }
function RecordModule({ title, rows, empty, fields, onAdd, columns }) { const [open, setOpen] = useState(false); const [form, setForm] = useState({}); const submit = (event) => { event.preventDefault(); onAdd(form); setOpen(false); setForm({}); }; return <><div className="module-heading"><div><h2>{title}</h2><p>Stored securely in your Supabase workspace.</p></div><button className="primary-button compact" onClick={() => setOpen(!open)}><Plus size={17} />Add record</button></div>{open && <form className="record-form panel" onSubmit={submit}>{fields.map(([key, label, type = "text"]) => <Field key={key} label={label} type={type} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />)}<button className="primary-button compact">Save record</button></form>}<section className="panel table-panel">{rows.length ? <table><thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column}>{column.includes("price") || column.includes("cost") || column.includes("total") ? money.format(row[column] || 0) : row[column] || "—"}</td>)}</tr>)}</tbody></table> : <div className="empty"><Boxes size={27} />{empty}</div>}</section></>; }
