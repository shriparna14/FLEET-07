/**
 * Compliance & Document Engine — FLEET/07
 *
 * Compliance rule (single source of truth):
 *   VALID/EXPIRING → vehicle is compliant/operational
 *   EXPIRED/MISSING → vehicle is non-compliant; must be BLOCKED
 */

export const REQUIRED_VEHICLE_DOCUMENTS = ['RC', 'INSURANCE', 'PERMIT', 'POLLUTION'];
export const REQUIRED_DRIVER_DOCUMENTS  = ['DL'];

// Derive live document status from expiry date. Never reads the stored `status` field.
export function getDocumentStatus(expiryDateStr) {
  if (!expiryDateStr) return 'PENDING';

  const today  = new Date();
  const expiry = new Date(expiryDateStr);
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const daysRemaining = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0)   return 'EXPIRED';
  if (daysRemaining <= 30) return 'EXPIRING';
  return 'VALID';
}

export function evaluateDocumentStatus(expiryDateStr, referenceDateStr) {
  if (!expiryDateStr) return { status: 'PENDING', daysRemaining: 0, label: 'Pending Verification' };

  const expiry = new Date(expiryDateStr);
  const ref    = referenceDateStr ? new Date(referenceDateStr) : new Date();
  expiry.setHours(0, 0, 0, 0);
  ref.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((expiry - ref) / (1000 * 60 * 60 * 24));

  if (diffDays < 0)    return { status: 'EXPIRED',  daysRemaining: diffDays, label: `Expired ${Math.abs(diffDays)}d ago` };
  if (diffDays <= 30)  return { status: 'EXPIRING', daysRemaining: diffDays, label: `Expires in ${diffDays}d` };
  return { status: 'VALID', daysRemaining: diffDays, label: `Valid (${diffDays}d remaining)` };
}

// EXPIRING is compliant — vehicle stays operational but needs attention before deadline.
export function isVehicleCompliant(vehicleId, documents = []) {
  return checkVehicleCompliance(vehicleId, documents).isCompliant;
}

// Detailed compliance report — single source of truth for document-level validation.
// A required document satisfies compliance ONLY if getDocumentStatus() returns 'VALID' or 'EXPIRING'.
export function checkVehicleCompliance(vehicleId, documents = []) {
  const vehicleDocs = documents.filter(d => d.entityId === vehicleId || d.vehicleId === vehicleId);

  const missingTypes = [];
  const expiredDocs  = [];
  const expiringDocs = [];
  const invalidDocs  = [];

  REQUIRED_VEHICLE_DOCUMENTS.forEach(type => {
    const doc = vehicleDocs.find(d => d.docType === type || d.type === type);
    if (!doc) {
      missingTypes.push(type);
    } else {
      const status = getDocumentStatus(doc.expiryDate);
      if (status === 'EXPIRED') {
        expiredDocs.push(doc);
      } else if (status === 'EXPIRING') {
        expiringDocs.push(doc);
      } else if (status === 'VALID') {
        // Valid & compliant
      } else {
        // PENDING / missing expiry date
        invalidDocs.push(doc);
      }
    }
  });

  // Compliant = no expired docs, no missing docs, no docs with invalid/pending expiry
  const isCompliant = expiredDocs.length === 0 && missingTypes.length === 0 && invalidDocs.length === 0;

  const criticalIssue = expiredDocs.length > 0
    ? `Expired document: ${expiredDocs.map(d => d.docName || d.docType).join(', ')}`
    : missingTypes.length > 0
    ? `Missing required documents: ${missingTypes.join(', ')}`
    : invalidDocs.length > 0
    ? `Document missing or pending valid expiry: ${invalidDocs.map(d => d.docName || d.docType).join(', ')}`
    : null;

  return {
    isCompliant,
    expiredDocs,
    expiringDocs,
    invalidDocs,
    missingTypes,
    totalDocs: vehicleDocs.length,
    criticalIssue,
  };
}

// Single source of truth for a vehicle's operational status.
// Checks document compliance first; falls back to stored vehicle.status.
// Returns { status, reason, isExpiring, expiringWarning }
export function getEffectiveVehicleStatus(vehicle, documents = []) {
  if (!vehicle) return { status: 'UNKNOWN', reason: null, isExpiring: false, expiringWarning: null };

  const compliance = checkVehicleCompliance(vehicle.id, documents);

  if (!compliance.isCompliant) {
    return {
      status: 'BLOCKED',
      reason: compliance.criticalIssue,
      isExpiring: false,
      expiringWarning: null,
    };
  }

  if (vehicle.status === 'BLOCKED') {
    return {
      status: 'BLOCKED',
      reason: 'Vehicle has been manually blocked.',
      isExpiring: false,
      expiringWarning: null,
    };
  }

  const isExpiring = compliance.expiringDocs.length > 0;
  const expiringWarning = isExpiring
    ? `${compliance.expiringDocs.map(d => `${d.docName || d.docType} expires soon`).join('; ')}.`
    : null;

  return {
    status: vehicle.status || 'ACTIVE',
    reason: null,
    isExpiring,
    expiringWarning,
  };
}

export function computeFleetComplianceStats(vehicles = [], documents = []) {
  if (!vehicles.length) return { score: 100, compliantCount: 0, nonCompliantCount: 0, total: 0 };

  let compliantCount = 0;
  let nonCompliantCount = 0;

  vehicles.forEach(veh => {
    const { status } = getEffectiveVehicleStatus(veh, documents);
    if (status !== 'BLOCKED') {
      compliantCount++;
    } else {
      nonCompliantCount++;
    }
  });

  return {
    score: Math.round((compliantCount / vehicles.length) * 100),
    compliantCount,
    nonCompliantCount,
    total: vehicles.length,
  };
}
