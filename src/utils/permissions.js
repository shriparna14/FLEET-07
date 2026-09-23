/**
 * RBAC Permission & Scope Engine — FLEET/07
 */

export const PERMISSIONS = {
  VEHICLE_ONBOARDING:    'vehicle.onboarding',
  VEHICLE_ASSIGNMENT:    'vehicle.assignment',
  DRIVER_ONBOARDING:     'driver.onboarding',
  DRIVER_VERIFICATION:   'driver.verification',
  DOCUMENT_VERIFICATION: 'document.verification',
  COMPLIANCE_TRACKING:   'compliance.tracking',
  BOOKING_MANAGEMENT:    'booking.management',  // Delegatable — no booking system built
  PAYMENTS:              'payments',
};

export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'SUPER_VENDOR') return true;
  return user.permissions?.[permission] === true;
}

export function isWithinScope(currentUserId, targetVendorId, vendors) {
  if (!currentUserId || !targetVendorId) return false;
  if (currentUserId === targetVendorId) return true;
  // Walk parentId chain upward from target to see if currentUser is an ancestor
  let current = vendors.find(v => v.id === targetVendorId);
  while (current?.parentId) {
    if (current.parentId === currentUserId) return true;
    current = vendors.find(v => v.id === current.parentId);
  }
  return false;
}

// getAccessibleVendorIds — BFS downward from currentUser to collect all visible vendor IDs.
// Super Vendor sees the entire network. Everyone else sees self + descendants only.
export function getAccessibleVendorIds(currentUser, vendors) {
  if (!currentUser) return [];
  if (currentUser.role === 'SUPER_VENDOR') return vendors.map(v => v.id);

  // BFS/iterative collect: start with self, then collect all descendants
  const accessible = new Set([currentUser.id]);
  let frontier = [currentUser.id];

  while (frontier.length > 0) {
    const nextFrontier = [];
    for (const parentId of frontier) {
      for (const v of vendors) {
        if (v.parentId === parentId && !accessible.has(v.id)) {
          accessible.add(v.id);
          nextFrontier.push(v.id);
        }
      }
    }
    frontier = nextFrontier;
  }

  return [...accessible];
}

export function canPerformAction({ user, permission, targetVendorId, vendors }) {
  if (!user) {
    return { allowed: false, reason: 'No active user selected.' };
  }
  // Super Vendor bypasses all checks
  if (user.role === 'SUPER_VENDOR') {
    return { allowed: true, reason: null };
  }
  if (targetVendorId && !isWithinScope(user.id, targetVendorId, vendors)) {
    return { allowed: false, reason: 'This vendor is outside your hierarchy management scope.' };
  }
  if (permission && !hasPermission(user, permission)) {
    return { allowed: false, reason: `The '${permission}' permission has not been granted to your profile.` };
  }
  return { allowed: true, reason: null };
}
