
import React, { useState } from "react";
import { usePermissions } from "../../context/PermissionContext";
import "./MaterialFetch.css";

function ManualMaterialFetch({
  department,
  processId,
  materials = [],
  onFetch,
}) {
  const { user, hasPermission } = usePermissions();

  const [selectedMaterials, setSelectedMaterials] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canFetch =
    Boolean(department) &&
    hasPermission("process.material.manual", department);

  function updateQuantity(id, value) {
    setSelectedMaterials((prev) => ({
      ...prev,
      [id]: value,
    }));
  }

  function toggleMaterial(id, checked) {
    setSelectedMaterials((prev) => ({
      ...prev,
      [id]: checked ? "1" : "",
    }));
  }

  async function handleManualFetch() {
    if (!canFetch || loading) return;

    if (typeof onFetch !== "function") {
      setError("Material fetching API is not connected yet.");
      return;
    }

    const requestedMaterials = materials
      .filter((material, index) => {
        const id = material.id || material.materialId || String(index);
        return Number(selectedMaterials[id]) > 0;
      })
      .map((material, index) => {
        const id = material.id || material.materialId || String(index);

        return {
          materialId: material.materialId || material.id,
          name: material.name || material.materialName,
          quantity: Number(selectedMaterials[id]),
          unit: material.unit || "",
        };
      });

    if (requestedMaterials.length === 0) {
      setError("Select at least one material and enter a valid quantity.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      await onFetch({
        processId,
        department,
        materials: requestedMaterials,
        mode: "manual",
      });

      setMessage("Manual material request submitted successfully.");
      setSelectedMaterials({});
    } catch (err) {
      setError(
        err?.message || "Unable to submit material request."
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
          can perform manual material fetching.
        </p>
      </div>
    );
  }

  return (
    <div className="material-fetch-card">
      <div className="material-fetch-heading">
        <div>
          <h3>Manual Material Fetch</h3>
          <p>Select individual raw materials and specify quantities.</p>
        </div>

        <span className="material-fetch-icon">📋</span>
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
      </div>

      {materials.length > 0 ? (
        <div className="material-fetch-table-wrap">
          <table className="material-fetch-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Material</th>
                <th>Available Quantity</th>
                <th>Request Quantity</th>
                <th>Unit</th>
              </tr>
            </thead>

            <tbody>
              {materials.map((material, index) => {
                const id =
                  material.id ||
                  material.materialId ||
                  String(index);

                return (
                  <tr key={id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedMaterials[id])}
                        onChange={(e) =>
                          toggleMaterial(id, e.target.checked)
                        }
                      />
                    </td>

                    <td>
                      {material.name || material.materialName || "Unnamed"}
                    </td>

                    <td>
                      {material.availableQuantity ?? "Not available"}
                    </td>

                    <td>
                      <input
                        className="material-quantity-input"
                        type="number"
                        min="0"
                        step="any"
                        value={selectedMaterials[id] || ""}
                        onChange={(e) =>
                          updateQuantity(id, e.target.value)
                        }
                        placeholder="Quantity"
                      />
                    </td>

                    <td>{material.unit || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="material-empty">
          No raw materials are available for this process.
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
        onClick={handleManualFetch}
        disabled={loading || materials.length === 0}
      >
        {loading ? "Submitting Request..." : "Submit Material Request"}
      </button>

      <p className="material-user-note">
        Requested by: {user?.name || "Unknown User"}
      </p>
    </div>
  );
}

export default ManualMaterialFetch;