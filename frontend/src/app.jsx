
import React, { useState } from "react";

// Contexts
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  PermissionProvider,
} from "./context/PermissionContext";

// Components
import Sidebar from "./components/Sidebar";
import PermissionGuard from "./components/PermissionGuard";

// ERP Modules
import Inventory from "./modules/inventory/Inventory";
import Procurement from "./modules/procurement/Procurement";
import Manufacturing from "./modules/manufacturing/Manufacturing";
import Dispatch from "./modules/dispatch/Dispatch";

import ProcessBuilder from "./modules/manufacturing/ProcessBuilder";
import BOMManager from "./modules/manufacturing/BOMManager";

import EmployeeList from "./modules/employees/EmployeeList";
import EmployeeForm from "./modules/employees/EmployeeForm";
import RoleManagement from "./modules/employees/RoleManagement";

import "./App.css";

// ------------------------------------
// Dashboard
// ------------------------------------

function Dashboard() {
  const { currentUser } = useAuth();

  return (
    <div className="erp-dashboard">

      <div className="erp-dashboard-heading">
        <h1>Welcome to Manufacturer ERP</h1>

        <p>
          Hello, {currentUser?.name || "User"}.
          Here's your operations overview.
        </p>
      </div>

      <div className="erp-dashboard-cards">

        <div className="erp-dashboard-card">
          <span>Current Role</span>
          <strong>{currentUser?.role || "-"}</strong>
        </div>

        <div className="erp-dashboard-card">
          <span>Department</span>
          <strong>{currentUser?.department || "-"}</strong>
        </div>

        <div className="erp-dashboard-card">
          <span>Account Status</span>
          <strong>{currentUser?.status || "-"}</strong>
        </div>

      </div>
    </div>
  );
}

// ------------------------------------
// Access Denied
// ------------------------------------

function AccessDenied() {
  return (
    <div className="erp-access-denied">
      <div className="erp-access-denied-icon">🔒</div>

      <h2>Access Restricted</h2>

      <p>
        You do not have permission to access this module.
        Contact your administrator if you need access.
      </p>
    </div>
  );
}

// ------------------------------------
// Main Application
// ------------------------------------

function AppContent() {
  const {
    currentUser,
    users,
    switchDemoUser,
    isAuthenticated,
  } = useAuth();

  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Wait until a user is available.
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="app-loading">
        <h2>Manufacturer ERP</h2>
        <p>No active user session found.</p>
        <p>Please configure your development user in AuthContext.jsx.</p>
      </div>
    );
  }

  // ------------------------------------
  // Module Rendering
  // ------------------------------------

  function renderPage() {
    switch (active) {

      case "dashboard":
        return <Dashboard />;

      case "employees":
        return (
          <PermissionGuard
            permission="people.view"
            fallback={<AccessDenied />}
          >
            <EmployeeList />
          </PermissionGuard>
        );

      case "employee-form":
        return (
          <PermissionGuard
            permission="people.create"
            fallback={<AccessDenied />}
          >
            <EmployeeForm />
          </PermissionGuard>
        );

      case "roles":
        return (
          <PermissionGuard
            permission="roles.manage"
            fallback={<AccessDenied />}
          >
            <RoleManagement />
          </PermissionGuard>
        );

      case "inventory":
        return (
          <PermissionGuard
            permission="inventory.view"
            fallback={<AccessDenied />}
          >
            <Inventory user={currentUser} />
          </PermissionGuard>
        );

      case "procurement":
        return (
          <PermissionGuard
            permission="purchase.view"
            fallback={<AccessDenied />}
          >
            <Procurement user={currentUser} />
          </PermissionGuard>
        );

      case "manufacturing":
        return (
          <PermissionGuard
            permission="manufacturing.view"
            fallback={<AccessDenied />}
          >
            <Manufacturing user={currentUser} />
          </PermissionGuard>
        );

      case "process-builder":
        return (
          <PermissionGuard
            permission="process.view"
            fallback={<AccessDenied />}
          >
            <ProcessBuilder user={currentUser} />
          </PermissionGuard>
        );

      case "bom":
        return (
          <PermissionGuard
            permission="process.view"
            fallback={<AccessDenied />}
          >
            <BOMManager user={currentUser} />
          </PermissionGuard>
        );

      case "dispatch":
        return (
          <PermissionGuard
            permission="dispatch.view"
            fallback={<AccessDenied />}
          >
            <Dispatch user={currentUser} />
          </PermissionGuard>
        );

      default:
        return <Dashboard />;
    }
  }

  // ------------------------------------
  // Application Layout
  // ------------------------------------

  return (
    <div className="erp-app">

      <Sidebar
        active={active}
        setActive={setActive}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="erp-main">

        <header className="erp-header">

          <div className="erp-header-left">

            <button
              type="button"
              className="erp-menu-toggle"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              ☰
            </button>

            <div>
              <h2>Manufacturer ERP</h2>
              <p>Enterprise Management System</p>
            </div>

          </div>

          <div className="erp-header-right">

            <div className="erp-user-info">
              <strong>{currentUser.name}</strong>
              <span>{currentUser.role}</span>
            </div>

            {/* Development-only user switcher */}

            {users?.length > 0 && (
              <select
                className="erp-demo-user"
                value={currentUser.id}
                onChange={(event) => {
                  const success = switchDemoUser(
                    Number(event.target.value)
                  );

                  if (success !== false) {
                    setActive("dashboard");
                  }
                }}
                title="Switch development user"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.role} - {user.department}
                  </option>
                ))}
              </select>
            )}

          </div>

        </header>

        <section className="erp-page-content">
          {renderPage()}
        </section>

      </main>

    </div>
  );
}

// ------------------------------------
// Root App
// ------------------------------------

function App() {
  return (
    <AuthProvider>
      <PermissionProvider>
        <AppContent />
      </PermissionProvider>
    </AuthProvider>
  );
}

export default App;