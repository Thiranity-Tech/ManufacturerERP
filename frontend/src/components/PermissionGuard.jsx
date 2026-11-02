
import React from "react";
import { usePermissions } from "../context/PermissionContext";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "../permissions/permissions";

// Permission Guard Component
function PermissionGuard({
  permission,
  permissions = [],
  requireAll = false,
  department = null,
  children,
  fallback = null,
}) {
  const {
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
  } = usePermissions();

  let allowed = false;

  if (permission) {
    allowed = checkPermission(permission, department);
  } else if (permissions.length > 0) {
    allowed = requireAll
      ? checkAllPermissions(permissions, department)
      : checkAnyPermission(permissions, department);
  }

  return allowed ? children : fallback;
}

// Re-export helpers for older module imports.
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
};

export default PermissionGuard;