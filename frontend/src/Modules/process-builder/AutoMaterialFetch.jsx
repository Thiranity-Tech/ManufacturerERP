
import React, { useState } from "react";
import { usePermissions } from "../../context/PermissionContext";
import "./MaterialFetch.css";

function AutoMaterialFetch({
  department,
  processId,
  materials = [],
  onFetch,
}) {
  const { user, hasPermission } = usePermissions();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canFetch =
    Boolean(department) &&
    hasPermission("process.material.auto", department);

  async function handleAutoFetch() {
    if (!canFetch || loading) return;

    if (typeof onFetch !== "function") {
      setError("Material fetching API is not connected yet.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      await onFetch({
        processId,
        department,
        materials,
        mode: "automatic",
      });

      setMessage("Material fetch request completed successfully.");
    } catch (err) {
      setError(
        err?.message || "Unable to fetch raw materials."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!canFetch) {
    return (
      <div className="material-access-denied">
        <strong>Access Restricted</strong>
        <p>
          Only the Super Admin or the manager of {department || "this department"}
          can perform automatic material fetching.
        </p>
      </div>
    );
  }

  return (
    <div className="material-fetch-card">
      <div className="material-fetch-heading">
        <div>
          <h3>Automatic Material Fetch</h3>
          <p>Automatically request required raw materials from inventory.</p>
        </div>

        <span className="material-fetch-icon">⚙️</span>
      </div>

      <div className="material-fetch-info">
        <div>
          <span>Process ID</span>
          <strong>{processId || "Not assigned"}</strong>
        </div>

        <div>
          <span>Department</span>
          <strong>{department}</strong>
        </div>

        <div>
          <span>Required Materials</span>
          <strong>{materials.length}</strong>
        </div>
      </div>

      {materials.length > 0 ? (
        <div className="material-fetch-table-wrap">
          <table className="material-fetch-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Required Quantity</th>
                <th>Unit</th>
              </tr>
            </thead>

            <tbody>
              {materials.map((material, index) => (
                <tr key={material.id || material.materialId || index}>
                  <td>
                    {material.name || material.materialName || "Unnamed Material"}
                  </td>
                  <td>
                    {material.quantity ?? material.requiredQuantity ?? 0}
                  </td>
                  <td>{material.unit || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="material-empty">
          No raw materials have been added to this process.
        </p>
      )}

      {message && (
        <div className="material-success">{message}</div>
      )}

      {error && (
        <div className="material-error">{error}</div>
      )}

      <button
        type="button"
        className="material-primary"
        onClick={handleAutoFetch}
        disabled={loading || materials.length === 0}
      >
        {loading ? "Fetching Materials..." : "⚡ Auto Fetch Materials"}
      </button>

      <p className="material-user-note">
        Requested by: {user?.name || "Unknown User"}
      </p>
    </div>
  );
}

export default AutoMaterialFetch;