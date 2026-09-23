/**
 * Hierarchy & Role Delegation Logic
 */

export const ROLES = {
  SUPER_VENDOR: 'SUPER_VENDOR',
  SITE_ADMIN: 'SITE_ADMIN',
  GROUP_VENDOR: 'GROUP_VENDOR',
  SUB_VENDOR: 'SUB_VENDOR',
  DEPLOYMENT_ASSOCIATE: 'DEPLOYMENT_ASSOCIATE'
};

export const ROLE_LABELS = {
  [ROLES.SUPER_VENDOR]: 'Super Vendor',
  [ROLES.SITE_ADMIN]: 'Site Admin',
  [ROLES.GROUP_VENDOR]: 'Group Vendor',
  [ROLES.SUB_VENDOR]: 'Sub Vendor',
  [ROLES.DEPLOYMENT_ASSOCIATE]: 'Deployment Associate'
};

export const ALLOWED_PARENT_ROLES = {
  [ROLES.SUPER_VENDOR]: [],
  [ROLES.SITE_ADMIN]: [ROLES.SUPER_VENDOR],
  [ROLES.GROUP_VENDOR]: [ROLES.SITE_ADMIN],
  [ROLES.SUB_VENDOR]: [ROLES.GROUP_VENDOR],
  [ROLES.DEPLOYMENT_ASSOCIATE]: [ROLES.SUB_VENDOR]
};

export function buildHierarchyTree(vendors, vehicles = [], drivers = []) {
  if (!vendors || !vendors.length) return [];

  const vendorMap = new Map();
  vendors.forEach(v => {
    const directVehicles = vehicles.filter(veh => veh.vendorId === v.id);
    const directDrivers = drivers.filter(d => d.vendorId === v.id);

    vendorMap.set(v.id, {
      ...v,
      directVehicleCount: directVehicles.length,
      directDriverCount: directDrivers.length,
      totalVehicleCount: directVehicles.length,
      totalDriverCount: directDrivers.length,
      children: [],
    });
  });

  const roots = [];

  vendorMap.forEach(node => {
    if (!node.parentId || !vendorMap.has(node.parentId)) {
      roots.push(node);
    } else {
      const parent = vendorMap.get(node.parentId);
      parent.children.push(node);
    }
  });

  function aggregateMetrics(node) {
    let subVehicles = node.directVehicleCount;
    let subDrivers = node.directDriverCount;

    node.children.forEach(child => {
      const childMetrics = aggregateMetrics(child);
      subVehicles += childMetrics.totalVehicleCount;
      subDrivers += childMetrics.totalDriverCount;
    });

    node.totalVehicleCount = subVehicles;
    node.totalDriverCount = subDrivers;
    return node;
  }

  roots.forEach(root => aggregateMetrics(root));
  return roots;
}

export function getDescendantIds(nodeId, vendors) {
  const descendants = new Set();

  function findChildren(currentId) {
    const children = vendors.filter(v => v.parentId === currentId);
    children.forEach(child => {
      descendants.add(child.id);
      findChildren(child.id);
    });
  }

  findChildren(nodeId);
  return Array.from(descendants);
}

export function getEligibleManagers(vendorOrId, vendors) {
  const vendor = typeof vendorOrId === 'string'
    ? vendors.find(v => v.id === vendorOrId)
    : vendorOrId;

  if (!vendor) return [];

  const allowedRoles = ALLOWED_PARENT_ROLES[vendor.role] || [];
  const descendantIds = new Set(getDescendantIds(vendor.id, vendors));
  descendantIds.add(vendor.id);

  return vendors.filter(candidate => {
    if (descendantIds.has(candidate.id)) return false;
    return allowedRoles.includes(candidate.role);
  });
}

export function canMoveNodeToParent(nodeId, newParentId, vendors) {
  if (!nodeId) return { valid: false, reason: 'Source node is required.' };
  if (nodeId === newParentId) {
    return { valid: false, reason: 'A vendor cannot be assigned as its own manager.' };
  }

  const node = vendors.find(v => v.id === nodeId);
  if (!node) return { valid: false, reason: 'Vendor not found.' };

  if (node.role === ROLES.SUPER_VENDOR && newParentId !== null) {
    return { valid: false, reason: 'Super Vendor is the root authority and cannot report to another manager.' };
  }

  if (node.role !== ROLES.SUPER_VENDOR && !newParentId) {
    return { valid: false, reason: 'Every non-Super Vendor must have a manager.' };
  }

  if (newParentId) {
    const descendants = getDescendantIds(nodeId, vendors);
    if (descendants.includes(newParentId)) {
      return {
        valid: false,
        reason: 'Cannot assign a vendor under its own descendant (this would create a circular hierarchy).'
      };
    }

    const newParent = vendors.find(v => v.id === newParentId);
    if (!newParent) {
      return { valid: false, reason: 'Target manager does not exist.' };
    }

    const allowedRoles = ALLOWED_PARENT_ROLES[node.role] || [];
    if (!allowedRoles.includes(newParent.role)) {
      const allowedLabels = allowedRoles.map(r => ROLE_LABELS[r]).join(', ');
      return {
        valid: false,
        reason: `Hierarchy rule violation: A ${ROLE_LABELS[node.role] || node.role} can only report to: ${allowedLabels || 'None'}.`
      };
    }
  }

  return { valid: true };
}

export function canChangeVendorRole(vendorId, newRole, vendors) {
  if (!Object.values(ROLES).includes(newRole)) {
    return { valid: false, reason: 'Invalid vendor role.' };
  }

  const vendor = vendors.find(v => v.id === vendorId);
  if (!vendor) return { valid: false, reason: 'Vendor not found.' };

  if (vendor.role === ROLES.SUPER_VENDOR) {
    return {
      valid: false,
      reason: 'Super Vendor is the root authority and its role cannot be changed.'
    };
  }

  if (newRole === ROLES.SUPER_VENDOR) {
    return {
      valid: false,
      reason: 'A new vendor cannot be promoted to Super Vendor.'
    };
  }

  if (vendor.role === newRole) {
    return { valid: true };
  }

  // Check parent constraint with newRole
  if (vendor.parentId) {
    const parent = vendors.find(v => v.id === vendor.parentId);
    if (parent) {
      const allowedParentRoles = ALLOWED_PARENT_ROLES[newRole] || [];
      if (!allowedParentRoles.includes(parent.role)) {
        const allowedLabels = allowedParentRoles.map(r => ROLE_LABELS[r]).join(', ');
        return {
          valid: false,
          reason: `Role change blocked: Under current manager (${ROLE_LABELS[parent.role]}), ${ROLE_LABELS[newRole]} is invalid. Allowed parent roles: ${allowedLabels}.`
        };
      }
    }
  }

  // Check children constraints with newRole
  const directChildren = vendors.filter(v => v.parentId === vendorId);
  for (const child of directChildren) {
    const allowedForChild = ALLOWED_PARENT_ROLES[child.role] || [];
    if (!allowedForChild.includes(newRole)) {
      return {
        valid: false,
        reason: `Role change blocked: Vendor manages ${ROLE_LABELS[child.role]} (${child.name}), which cannot report to a ${ROLE_LABELS[newRole]}. Move child vendors first.`
      };
    }
  }

  return { valid: true };
}

export function getBreadcrumbPath(vendorId, vendors) {
  const path = [];
  let current = vendors.find(v => v.id === vendorId);

  while (current) {
    path.unshift(current);
    if (!current.parentId) break;
    current = vendors.find(v => v.id === current.parentId);
  }

  return path;
}
