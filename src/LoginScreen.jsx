import { useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Factory, ShieldCheck } from "lucide-react";
import { ensureWorkspace, supabase } from "./supabase";
import "./login.css";

const highlights = [
  "Live production and inventory visibility",
  "Role-based access for every team",
  "Secure records across your operation",
];

export default function LoginScreen({ onSignIn }) {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const creatingWorkspace = mode === "create-workspace";

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim() || !password || (creatingWorkspace && (!company.trim() || !name.trim()))) {
      setMessage("Complete the required fields to continue.");
      return;
    }
    if (creatingWorkspace && password !== confirmPassword) {
      setMessage("Your passwords do not match.");
      return;
    }
    setMessage("");

    if (creatingWorkspace) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: name.trim(), company_name: company.trim() },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.session) {
        setMessage("Check your inbox to verify your email, then sign in to create your workspace.");
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setMessage(error.message);
        return;
      }
    }

    try {
      await ensureWorkspace();
      onSignIn();
    } catch (error) {
      setMessage(error.message || "Your account was created, but the workspace could not be initialized.");
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-grid" aria-hidden="true" />
        <div className="login-brand"><span className="login-brand-mark"><Factory size={22} strokeWidth={2.3} /></span><span>MANUFACTURER <b>ERP</b></span></div>
        <div className="login-showcase-copy">
          <p className="login-eyebrow">CONNECTED OPERATIONS</p>
          <h1>Build better.<br />Move faster.<br /><em>Stay in control.</em></h1>
          <p className="login-intro">Bring production, inventory, procurement, and sales together in one clear operating system.</p>
        </div>
        <div className="login-benefits">{highlights.map((highlight) => <div key={highlight}><CheckCircle2 size={18} /><span>{highlight}</span></div>)}</div>
        <p className="login-footer">Designed for the people who make things happen.</p>
      </section>

      <section className="login-panel">
        <div className={`login-form-wrap ${creatingWorkspace ? "workspace-mode" : ""}`}>
          <div className="login-mobile-brand"><span className="login-brand-mark"><Factory size={21} strokeWidth={2.3} /></span><span>MANUFACTURER <b>ERP</b></span></div>
          <div className="login-tabs" role="tablist" aria-label="Account access">
            <button type="button" className={!creatingWorkspace ? "active" : ""} onClick={() => changeMode("sign-in")} role="tab" aria-selected={!creatingWorkspace}>Sign in</button>
            <button type="button" className={creatingWorkspace ? "active" : ""} onClick={() => changeMode("create-workspace")} role="tab" aria-selected={creatingWorkspace}>Create workspace</button>
          </div>
          <div className="login-heading">
            <span className="login-status"><ShieldCheck size={15} /> {creatingWorkspace ? "START YOUR WORKSPACE" : "SECURE WORKSPACE"}</span>
            <h2>{creatingWorkspace ? "Set up your company" : "Welcome back"}</h2>
            <p>{creatingWorkspace ? "Create a shared home for your manufacturing operation." : "Sign in to manage your operations."}</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {creatingWorkspace && <>
              <label htmlFor="company-name">Company name</label>
              <input id="company-name" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Your company name" autoComplete="organization" />
              <label htmlFor="full-name">Your full name</label>
              <input id="full-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" />
            </>}
            <label htmlFor="work-email">Work email</label>
            <input id="work-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" autoComplete="email" />
            <div className="login-label-row"><label htmlFor="work-password">Password</label>{!creatingWorkspace && <button type="button" className="login-text-button">Forgot password?</button>}</div>
            <PasswordInput id="work-password" value={password} onChange={setPassword} visible={showPassword} setVisible={setShowPassword} placeholder={creatingWorkspace ? "Create a password" : "Enter your password"} />
            {creatingWorkspace && <><label htmlFor="confirm-password">Confirm password</label><PasswordInput id="confirm-password" value={confirmPassword} onChange={setConfirmPassword} visible={showPassword} setVisible={setShowPassword} placeholder="Re-enter your password" /></>}
            {message && <p className="login-message" role="alert">{message}</p>}
            <button className="login-submit" type="submit">{creatingWorkspace ? "Create my workspace" : "Sign in to dashboard"} <ArrowRight size={19} /></button>
          </form>
          <p className="login-help">{creatingWorkspace ? <>Already have a workspace? <button type="button" className="login-text-button" onClick={() => changeMode("sign-in")}>Sign in</button></> : <>Need access? <button type="button" className="login-text-button">Contact your administrator</button></>}</p>
        </div>
      </section>
    </main>
  );
}

function PasswordInput({ id, value, onChange, visible, setVisible, placeholder }) {
  return <div className="login-password-wrap"><input id={id} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete="current-password" /><button className="login-password-toggle" type="button" onClick={() => setVisible((isVisible) => !isVisible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>;
}
