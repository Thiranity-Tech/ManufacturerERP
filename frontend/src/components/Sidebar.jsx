import React from "react";
import "./Sidebar.css";

const menuItems = [
  {
    section: "MAIN MENU",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "▦", roles: ["Super Admin", "Admin", "Department Manager", "Supervisor", "Worker"] },
    ],
  },
  {
    section: "OPERATIONS",
    items: [
      { id: "purchase", label: "Purchase Order", icon: "🛒", roles: ["Super Admin", "Admin", "Department Manager"] },
      { id: "inventory", label: "Inventory", icon: "▤", roles: ["Super Admin", "Admin", "Department Manager", "Supervisor"] },
      { id: "procurement", label: "Procurement", icon: "🚚", roles: ["Super Admin", "Admin", "Department Manager"] },
      { id: "manufacturing", label: "Manufacturing Process", icon: "⚙", roles: ["Super Admin", "Admin", "Department Manager", "Supervisor", "Worker"] },
      { id: "process-builder", label: "Process Builder", icon: "🔧", roles: ["Super Admin", "Department Manager"] },
      { id: "dispatch", label: "Product Dispatch", icon: "📦", roles: ["Super Admin", "Admin", "Department Manager", "Supervisor"] },
      { id: "expense", label: "Expense", icon: "₹", roles: ["Super Admin", "Admin", "Department Manager"] },
      { id: "sales", label: "Sales & Customer", icon: "♧", roles: ["Super Admin", "Admin", "Department Manager"] },
      { id: "vendor", label: "Vendor Management", icon: "♢", roles: ["Super Admin", "Admin", "Department Manager"] },
    ],
  },
  {
    section: "ADMINISTRATION",
    items: [
      { id: "people", label: "People Management", icon: "♙", roles: ["Super Admin", "Admin"] },
      { id: "roles", label: "Role & Permissions", icon: "🛡", roles: ["Super Admin"] },
      { id: "departments", label: "Departments", icon: "🏢", roles: ["Super Admin", "Admin"] },
      { id: "reports", label: "Reports & Analytics", icon: "▥", roles: ["Super Admin", "Admin", "Department Manager"] },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { id: "settings", label: "Settings", icon: "⚙", roles: ["Super Admin", "Admin"] },
    ],
  },
];

function Sidebar({
  active = "dashboard",
  setActive,
  user = {
    name: "Admin User",
    role: "Super Admin",
    department: "All Departments",
  },
  open = true,
  onClose,
}) {
  const role = user?.role || "Worker";

  const visibleSections = menuItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  const handleNavigation = (id) => {
    if (setActive) setActive(id);
    if (onClose) onClose();
  };

  return (
    <>
      {open && (
        <div className="sidebar-mobile-overlay" onClick={onClose} />
      )}

      <aside className={`erp-sidebar ${open ? "sidebar-visible" : "sidebar-hidden"}`}>
        {/* BRAND */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">M</div>

          <div className="sidebar-brand-text">
            <h2>MANU<span>FACTURE</span></h2>
            <small>ENTERPRISE RESOURCE PLANNING</small>
          </div>

          <button className="sidebar-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* USER INFORMATION */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {(user?.name || "User").substring(0, 2).toUpperCase()}
          </div>

          <div className="sidebar-user-details">
            <strong>{user?.name || "User"}</strong>
            <span>{role}</span>
          </div>

          <span className="sidebar-user-status" title="Active">●</span>
        </div>

        {/* DEPARTMENT */}
        <div className="sidebar-department">
          <span>DEPARTMENT</span>
          <strong>{user?.department || "Not Assigned"}</strong>
        </div>

        {/* NAVIGATION */}
        <nav className="sidebar-navigation">
          {visibleSections.map((section) => (
            <div className="sidebar-section" key={section.section}>
              <div className="sidebar-section-title">
                {section.section}
              </div>

              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={`sidebar-nav-item ${
                    active === item.id ? "sidebar-nav-active" : ""
                  }`}
                  onClick={() => handleNavigation(item.id)}
                  title={item.label}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  <span className="sidebar-nav-label">{item.label}</span>

                  {active === item.id && (
                    <span className="sidebar-active-indicator" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* BOTTOM */}
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="sidebar-help-icon">?</div>
            <strong>Need assistance?</strong>
            <p>Contact your system administrator for support.</p>
          </div>

          <div className="sidebar-system-status">
            <span>●</span>
            System Operational
          </div>

          <div className="sidebar-version">
            Manufacturer ERP · v1.0.0
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;