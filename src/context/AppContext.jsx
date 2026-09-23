import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_VENDORS,
  INITIAL_VEHICLES,
  INITIAL_DRIVERS,
  INITIAL_DOCUMENTS,
  INITIAL_LOGS
} from '../data/mockData';
import { canMoveNodeToParent, canChangeVendorRole, ROLE_LABELS } from '../utils/hierarchy';
import { isVehicleCompliant, getDocumentStatus, checkVehicleCompliance, getEffectiveVehicleStatus } from '../utils/compliance';
import { PERMISSIONS, hasPermission as checkHasPermission, canPerformAction, getAccessibleVendorIds } from '../utils/permissions';
import { loadData, saveData } from '../utils/storage';

const AppContext = createContext(null);
const STORAGE_KEY = 'FLEETOPS_STORE_V5';

export function AppProvider({ children }) {
  const [vendors, setVendors] = useState(() => loadData(`${STORAGE_KEY}_VENDORS`, INITIAL_VENDORS));
  const [vehicles, setVehicles] = useState(() => loadData(`${STORAGE_KEY}_VEHICLES`, INITIAL_VEHICLES));
  const [drivers, setDrivers] = useState(() => loadData(`${STORAGE_KEY}_DRIVERS`, INITIAL_DRIVERS));
  const [documents, setDocuments] = useState(() => loadData(`${STORAGE_KEY}_DOCUMENTS`, INITIAL_DOCUMENTS));
  const [activities, setActivities] = useState(() => loadData(`${STORAGE_KEY}_ACTIVITIES`, INITIAL_LOGS));
  const [toasts, setToasts] = useState([]);

  // Active impersonated user ID for "VIEW AS"
  const [currentUserId, setCurrentUserId] = useState(() => loadData(`${STORAGE_KEY}_USER_ID`, 'super-vendor-001'));

  const currentUser = vendors.find(v => v.id === currentUserId) || vendors[0];

  useEffect(() => saveData(`${STORAGE_KEY}_VENDORS`, vendors), [vendors]);
  useEffect(() => saveData(`${STORAGE_KEY}_VEHICLES`, vehicles), [vehicles]);
  useEffect(() => saveData(`${STORAGE_KEY}_DRIVERS`, drivers), [drivers]);
  useEffect(() => saveData(`${STORAGE_KEY}_DOCUMENTS`, documents), [documents]);
  useEffect(() => saveData(`${STORAGE_KEY}_ACTIVITIES`, activities), [activities]);
  useEffect(() => saveData(`${STORAGE_KEY}_USER_ID`, currentUserId), [currentUserId]);

  const addToast = (type, title, message) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 6);
    const newToast = { id, type, title, message };
    setToasts(prev => [newToast, ...prev].slice(0, 5));
    setTimeout(() => removeToast(id), 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const logActivity = (text, category = 'System') => {
    const now = new Date();
    const timestamp = now.toTimeString().slice(0, 5);
    const newLog = { id: `log-${Date.now()}`, timestamp, text, category };
    setActivities(prev => [newLog, ...prev].slice(0, 30));
  };

  const hasPermission = (permission) => checkHasPermission(currentUser, permission);

  const performActionCheck = (permission, targetVendorId) => {
    return canPerformAction({ user: currentUser, permission, targetVendorId, vendors });
  };

  // Derived: set of vendor IDs the current user can see/act on
  const accessibleVendorIds = getAccessibleVendorIds(currentUser, vendors);

  // ─── Vendor Hierarchy Management ──────────────────────────────────────────

  const moveVendorProfile = (vendorId, newParentId) => {
    const checkAction = performActionCheck(null, vendorId);
    if (!checkAction.allowed) {
      addToast('error', 'Access Denied', checkAction.reason);
      return { success: false, reason: checkAction.reason };
    }

    // Also validate that the new parent is within the current user's scope
    if (currentUser.role !== 'SUPER_VENDOR' && newParentId) {
      const accessibleIds = getAccessibleVendorIds(currentUser, vendors);
      if (!accessibleIds.includes(newParentId)) {
        const reason = 'Access denied — the selected manager is outside your managed hierarchy.';
        addToast('error', 'Access Denied', reason);
        return { success: false, reason };
      }
    }

    const check = canMoveNodeToParent(vendorId, newParentId, vendors);
    if (!check.valid) {
      addToast('error', 'Hierarchy Violation', check.reason);
      return { success: false, reason: check.reason };
    }

    const vendor = vendors.find(v => v.id === vendorId);
    const newParent = vendors.find(v => v.id === newParentId);

    setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, parentId: newParentId } : v));

    const parentName = newParent ? newParent.name : 'Top Level';
    logActivity(`${vendor?.name} moved under ${parentName}`, 'Hierarchy');
    addToast('success', 'Profile Transferred', `${vendor?.name} now reports to ${parentName}.`);
    return { success: true };
  };

  const changeVendorRole = (vendorId, newRole) => {
    const checkAction = performActionCheck(null, vendorId);
    if (!checkAction.allowed) {
      addToast('error', 'Access Denied', checkAction.reason);
      return { success: false, reason: checkAction.reason };
    }

    const check = canChangeVendorRole(vendorId, newRole, vendors);
    if (!check.valid) {
      addToast('error', 'Role Change Blocked', check.reason);
      return { success: false, reason: check.reason };
    }

    const vendor = vendors.find(v => v.id === vendorId);
    setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, role: newRole } : v));

    logActivity(`Role updated for ${vendor?.name} to ${ROLE_LABELS[newRole] || newRole}`, 'Hierarchy');
    addToast('success', 'Role Updated', `${vendor?.name} is now ${ROLE_LABELS[newRole] || newRole}.`);
    return { success: true };
  };

  const addVendor = (vendorData) => {
    // Validate role is a known non-root role
    const validRoles = ['SITE_ADMIN', 'GROUP_VENDOR', 'SUB_VENDOR', 'DEPLOYMENT_ASSOCIATE'];
    if (!validRoles.includes(vendorData.role)) {
      const reason = `Invalid role: ${vendorData.role}.`;
      addToast('error', 'Validation Error', reason);
      return { success: false, reason };
    }

    // Every non-super vendor must have a parent
    if (!vendorData.parentId) {
      const reason = 'Please select a manager for this vendor.';
      addToast('error', 'Validation Error', reason);
      return { success: false, reason };
    }

    const parent = vendors.find(v => v.id === vendorData.parentId);
    if (!parent) {
      const reason = 'Selected manager does not exist.';
      addToast('error', 'Validation Error', reason);
      return { success: false, reason };
    }

    // Validate parent role is compatible with the new vendor's role
    const allowedParentRoles = {
      SITE_ADMIN:           ['SUPER_VENDOR'],
      GROUP_VENDOR:         ['SITE_ADMIN'],
      SUB_VENDOR:           ['GROUP_VENDOR'],
      DEPLOYMENT_ASSOCIATE: ['SUB_VENDOR'],
    }[vendorData.role] || [];

    if (!allowedParentRoles.includes(parent.role)) {
      const reason = `A ${vendorData.role.replace('_', ' ')} cannot report to a ${parent.role.replace('_', ' ')}.`;
      addToast('error', 'Hierarchy Violation', reason);
      return { success: false, reason };
    }

    // Permission + scope check: current user must be able to manage the parent vendor
    const checkAction = performActionCheck(null, vendorData.parentId);
    if (!checkAction.allowed) {
      addToast('error', 'Access Denied', checkAction.reason);
      return { success: false, reason: checkAction.reason };
    }

    const newVendor = {
      id: `vendor-${Date.now().toString(36)}`,
      name: vendorData.name,
      role: vendorData.role,
      parentId: vendorData.parentId,
      email: vendorData.email || '',
      phone: vendorData.phone || '',
      permissions: {
        'vehicle.onboarding':    true,
        'vehicle.assignment':    true,
        'driver.onboarding':     true,
        'driver.verification':   true,
        'document.verification': true,
        'compliance.tracking':   true,
        'booking.management':    false,
        'payments':              false,
      },
    };

    setVendors(prev => [...prev, newVendor]);
    logActivity(`New vendor onboarded — ${newVendor.name}`, 'Vendor Onboarding');
    addToast('success', 'Vendor Added', `${newVendor.name} onboarded into hierarchy.`);
    return { success: true, vendor: newVendor };
  };

  // updateDelegation: only direct parent (or Super Vendor) can modify a vendor's permissions.
  // Being an ancestor is not sufficient — this prevents privilege escalation via ancestor scope.
  const updateDelegation = (vendorId, newPermissions) => {
    if (!currentUser) {
      addToast('error', 'Access Denied', 'No active user session.');
      return { success: false, reason: 'No active user session.' };
    }

    // Super Vendor has unrestricted control
    if (currentUser.role !== 'SUPER_VENDOR') {
      const targetVendor = vendors.find(v => v.id === vendorId);
      if (!targetVendor) {
        addToast('error', 'Not Found', 'Target vendor does not exist.');
        return { success: false, reason: 'Vendor not found.' };
      }

      // Only the direct parent may edit permissions
      if (targetVendor.parentId !== currentUser.id) {
        const reason = 'Access denied — only the direct manager or Super Vendor can change this vendor\'s permissions.';
        addToast('error', 'Access Denied', reason);
        return { success: false, reason };
      }
    }

    setVendors(prev =>
      prev.map(v => v.id === vendorId ? { ...v, permissions: { ...v.permissions, ...newPermissions } } : v)
    );

    const vendor = vendors.find(v => v.id === vendorId);
    logActivity(`Permissions updated for ${vendor?.name}`, 'Delegation');
    addToast('success', 'Permissions Saved', `Delegation settings saved for ${vendor?.name}.`);
    return { success: true };
  };

  // ─── Vehicles Management ────────────────────────────────────────────────────

  const addVehicle = (vehicleData) => {
    const vendor = vendors.find(v => v.id === vehicleData.vendorId);
    if (!vendor) {
      const reason = 'Selected vendor was not found.';
      addToast('error', 'Invalid Vendor', reason);
      return { success: false, reason };
    }

    const checkAction = performActionCheck(PERMISSIONS.VEHICLE_ONBOARDING, vehicleData.vendorId);
    if (!checkAction.allowed) {
      addToast('error', 'Action Denied', checkAction.reason);
      return { success: false, reason: checkAction.reason };
    }

    const normalizedReg = vehicleData.registrationNumber.trim().toUpperCase();
    const exists = vehicles.some(v => v.registrationNumber.trim().toUpperCase() === normalizedReg);
    if (exists) {
      addToast('error', 'Duplicate Registration', `Registration ${normalizedReg} is already onboarded.`);
      return { success: false, reason: 'Registration number already exists.' };
    }

    const newVehicleId = `veh-${Date.now().toString(36)}`;
    const newVehicle = {
      id: newVehicleId,
      registrationNumber: normalizedReg,
      model: vehicleData.model,
      seatingCapacity: Number(vehicleData.seatingCapacity),
      fuelType: vehicleData.fuelType,
      vendorId: vehicleData.vendorId,
      status: 'ACTIVE',
    };

    setVehicles(prev => [newVehicle, ...prev]);

    const fmtFuture = (months) => {
      const d = new Date();
      d.setMonth(d.getMonth() + months);
      return d.toISOString().split('T')[0];
    };

    const base = Date.now().toString(36);
    const initialDocs = [
      { id: `doc-${base}-rc`,  entityType: 'VEHICLE', entityId: newVehicleId, docType: 'RC',        docName: 'Registration Certificate (RC)', expiryDate: fmtFuture(24), status: 'VALID', verificationStatus: 'PENDING' },
      { id: `doc-${base}-ins`, entityType: 'VEHICLE', entityId: newVehicleId, docType: 'INSURANCE', docName: 'Commercial Insurance',           expiryDate: fmtFuture(12), status: 'VALID', verificationStatus: 'PENDING' },
      { id: `doc-${base}-prm`, entityType: 'VEHICLE', entityId: newVehicleId, docType: 'PERMIT',    docName: 'State Transit Permit',           expiryDate: fmtFuture(18), status: 'VALID', verificationStatus: 'PENDING' },
      { id: `doc-${base}-puc`, entityType: 'VEHICLE', entityId: newVehicleId, docType: 'POLLUTION', docName: 'PUCC Certificate',               expiryDate: fmtFuture(6),  status: 'VALID', verificationStatus: 'PENDING' },
    ];

    setDocuments(prev => [...initialDocs, ...prev]);
    logActivity(`Vehicle ${newVehicle.registrationNumber} onboarded`, 'Fleet Onboarding');
    addToast('success', 'Vehicle Onboarded', `${newVehicle.registrationNumber} (${newVehicle.model}) added.`);
    return { success: true, vehicle: newVehicle };
  };

  const updateVehicleStatus = (vehicleId, newStatus) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return { success: false, reason: 'Vehicle not found' };

    const checkAction = performActionCheck(PERMISSIONS.COMPLIANCE_TRACKING, vehicle.vendorId);
    if (!checkAction.allowed) {
      addToast('error', 'Access Denied', checkAction.reason);
      return { success: false, reason: checkAction.reason };
    }

    if (newStatus === 'ACTIVE') {
      if (!isVehicleCompliant(vehicleId, documents)) {
        // Build a specific error message naming the offending document
        const compliance = checkVehicleCompliance(vehicleId, documents);
        const detail = compliance.criticalIssue
          ? ` ${compliance.criticalIssue}.`
          : ' Required documents (RC, Insurance, Permit, PUCC) are missing or expired.';
        const msg = `Vehicle ${vehicle.registrationNumber} cannot be activated.${detail}`;
        addToast('error', 'Activation Blocked', msg);
        return { success: false, reason: msg };
      }
    }

    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, status: newStatus } : v));

    logActivity(`Vehicle ${vehicle.registrationNumber} status updated to ${newStatus}`, 'Compliance');
    addToast(
      newStatus === 'BLOCKED' ? 'warning' : 'success',
      'Status Updated',
      `${vehicle.registrationNumber} marked ${newStatus}.`
    );
    return { success: true };
  };

  // ─── Drivers Management ────────────────────────────────────────────────────

  const addDriver = (driverData) => {
    const vendor = vendors.find(v => v.id === driverData.vendorId);
    if (!vendor) {
      const reason = 'Selected vendor was not found.';
      addToast('error', 'Invalid Vendor', reason);
      return { success: false, reason };
    }

    const checkAction = performActionCheck(PERMISSIONS.DRIVER_ONBOARDING, driverData.vendorId);
    if (!checkAction.allowed) {
      addToast('error', 'Action Denied', checkAction.reason);
      return { success: false, reason: checkAction.reason };
    }

    if (driverData.assignedVehicleId) {
      const veh = vehicles.find(v => v.id === driverData.assignedVehicleId);
      if (!veh) {
        const reason = 'Selected vehicle was not found.';
        addToast('error', 'Invalid Vehicle', reason);
        return { success: false, reason };
      }

      if (driverData.vendorId !== veh.vendorId) {
        const reason = 'Driver and vehicle must belong to the same vendor.';
        addToast('error', 'Vendor Mismatch', reason);
        return { success: false, reason };
      }

      const effective = getEffectiveVehicleStatus(veh, documents);
      if (effective.status === 'BLOCKED') {
        const reason = effective.reason
          ? `${veh.registrationNumber}: ${effective.reason}`
          : `${veh.registrationNumber} is currently blocked.`;
        addToast('error', 'Assignment Blocked', `Cannot assign driver — ${reason}`);
        return { success: false, reason };
      }
    }

    const normalizedDL = (driverData.licenceNumber || '').trim().toUpperCase();
    if (!normalizedDL) {
      const reason = 'Driving licence number is required.';
      addToast('error', 'Invalid Licence', reason);
      return { success: false, reason };
    }

    const duplicateDL = drivers.some(d => (d.licenceNumber || '').trim().toUpperCase() === normalizedDL);
    if (duplicateDL) {
      const reason = 'This driving licence is already registered.';
      addToast('error', 'Duplicate Licence', reason);
      return { success: false, reason };
    }

    const newDriverId = `drv-${Date.now().toString(36)}`;
    const newDriver = {
      id: newDriverId,
      name: driverData.name,
      phone: driverData.phone,
      licenceNumber: normalizedDL,
      vendorId: driverData.vendorId,
      assignedVehicleId: driverData.assignedVehicleId || null,
      status: 'ACTIVE',
    };

    setDrivers(prev => [newDriver, ...prev]);

    const dlDoc = {
      id: `doc-${Date.now()}-dl`,
      entityType: 'DRIVER',
      entityId: newDriverId,
      docType: 'DL',
      docName: 'Driving Licence',
      expiryDate: driverData.dlExpiry || '2028-12-31',
      status: 'VALID',
      verificationStatus: 'PENDING',
    };
    setDocuments(prev => [dlDoc, ...prev]);

    logActivity(`New driver onboarded — ${newDriver.name}`, 'Driver onboarding');
    addToast('success', 'Driver Added', `${newDriver.name} registered.`);
    return { success: true, driver: newDriver };
  };

  const assignDriverToVehicle = (driverId, vehicleId) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return { success: false, reason: 'Driver not found' };

    const checkAction = performActionCheck(PERMISSIONS.VEHICLE_ASSIGNMENT, driver.vendorId);
    if (!checkAction.allowed) {
      addToast('error', 'Access Denied', checkAction.reason);
      return { success: false, reason: checkAction.reason };
    }

    if (vehicleId) {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (!vehicle) return { success: false, reason: 'Vehicle not found' };

      if (driver.vendorId !== vehicle.vendorId) {
        const reason = 'Driver and vehicle must belong to the same vendor.';
        addToast('error', 'Vendor Mismatch', reason);
        return { success: false, reason };
      }

      const effective = getEffectiveVehicleStatus(vehicle, documents);
      if (effective.status === 'BLOCKED') {
        const reason = effective.reason
          ? `${vehicle.registrationNumber}: ${effective.reason}`
          : `${vehicle.registrationNumber} is currently blocked.`;
        addToast('error', 'Assignment Blocked', `Driver cannot be assigned — ${reason}`);
        return { success: false, reason };
      }
    }

    setDrivers(prev =>
      prev.map(d => d.id === driverId ? { ...d, assignedVehicleId: vehicleId || null } : d)
    );

    const vehName = vehicleId
      ? vehicles.find(v => v.id === vehicleId)?.registrationNumber
      : 'Unassigned';
    logActivity(`Driver ${driver.name} assigned to ${vehName}`, 'Driver assignment');
    addToast('success', 'Driver Assigned', `${driver.name} is now allocated to ${vehName}.`);
    return { success: true };
  };

  // ─── Documents & Compliance ────────────────────────────────────────────────

  const renewDocument = (docId, newExpiryDate) => {
    const expiry = new Date(newExpiryDate);
    const today = new Date();
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (
      !newExpiryDate ||
      Number.isNaN(expiry.getTime()) ||
      expiry <= today
    ) {
      const reason = 'Renewal date must be a valid future date.';
      addToast('error', 'Invalid Renewal Date', reason);
      return { success: false, reason };
    }

    const doc = documents.find(d => d.id === docId);
    if (!doc) return { success: false, reason: 'Document not found.' };

    if (doc.entityType === 'VEHICLE') {
      const vehicle = vehicles.find(v => v.id === doc.entityId);
      if (!vehicle) {
        const reason = 'Associated vehicle not found.';
        addToast('error', 'Invalid Document', reason);
        return { success: false, reason };
      }
      const check = performActionCheck(PERMISSIONS.DOCUMENT_VERIFICATION, vehicle.vendorId);
      if (!check.allowed) {
        addToast('error', 'Access Denied', check.reason);
        return { success: false, reason: check.reason };
      }
    } else if (doc.entityType === 'DRIVER') {
      const driver = drivers.find(d => d.id === doc.entityId);
      if (!driver) {
        const reason = 'Associated driver not found.';
        addToast('error', 'Invalid Document', reason);
        return { success: false, reason };
      }
      const check = performActionCheck(PERMISSIONS.DRIVER_VERIFICATION, driver.vendorId);
      if (!check.allowed) {
        addToast('error', 'Access Denied', check.reason);
        return { success: false, reason: check.reason };
      }
    }

    const newStatus = getDocumentStatus(newExpiryDate);
    const updatedDocs = documents.map(d =>
      d.id === docId ? { ...d, expiryDate: newExpiryDate, status: newStatus } : d
    );
    setDocuments(updatedDocs);

    // Do NOT auto-activate the vehicle — inform the user so they can explicitly activate.
    if (doc.entityType === 'VEHICLE') {
      const veh = vehicles.find(v => v.id === doc.entityId);
      if (veh && veh.status === 'BLOCKED' && isVehicleCompliant(veh.id, updatedDocs)) {
        addToast('info', 'Vehicle Now Eligible',
          `${veh.registrationNumber} is fully compliant. Open the vehicle and click Activate to restore operations.`
        );
        logActivity(`${veh.registrationNumber} became compliant after document renewal`, 'Compliance');
      }
    }

    logActivity(`Document ${doc.docName} renewed to ${newExpiryDate}`, 'Compliance');
    addToast('success', 'Document Renewed', `${doc.docName} renewed successfully.`);
    return { success: true };
  };

  const verifyDocument = (docId) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return { success: false, reason: 'Document not found.' };

    if (doc.entityType === 'VEHICLE') {
      const vehicle = vehicles.find(v => v.id === doc.entityId);
      if (!vehicle) {
        const reason = 'Associated vehicle not found.';
        addToast('error', 'Invalid Document', reason);
        return { success: false, reason };
      }
      const check = performActionCheck(PERMISSIONS.DOCUMENT_VERIFICATION, vehicle.vendorId);
      if (!check.allowed) {
        addToast('error', 'Access Denied', check.reason);
        return { success: false, reason: check.reason };
      }
    } else if (doc.entityType === 'DRIVER') {
      const driver = drivers.find(d => d.id === doc.entityId);
      if (!driver) {
        const reason = 'Associated driver not found.';
        addToast('error', 'Invalid Document', reason);
        return { success: false, reason };
      }
      const check = performActionCheck(PERMISSIONS.DRIVER_VERIFICATION, driver.vendorId);
      if (!check.allowed) {
        addToast('error', 'Access Denied', check.reason);
        return { success: false, reason: check.reason };
      }
    }

    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, verificationStatus: 'VERIFIED' } : d));
    logActivity(`Document verified — ${doc.docName}`, 'Document Verification');
    addToast('success', 'Document Verified', `${doc.docName} is now marked as verified.`);
    return { success: true };
  };

  const rejectDocument = (docId, reason = 'Not approved') => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return { success: false, reason: 'Document not found.' };

    if (doc.entityType === 'VEHICLE') {
      const vehicle = vehicles.find(v => v.id === doc.entityId);
      if (!vehicle) {
        const r = 'Associated vehicle not found.';
        addToast('error', 'Invalid Document', r);
        return { success: false, reason: r };
      }
      const check = performActionCheck(PERMISSIONS.DOCUMENT_VERIFICATION, vehicle.vendorId);
      if (!check.allowed) {
        addToast('error', 'Access Denied', check.reason);
        return { success: false, reason: check.reason };
      }
    } else if (doc.entityType === 'DRIVER') {
      const driver = drivers.find(d => d.id === doc.entityId);
      if (!driver) {
        const r = 'Associated driver not found.';
        addToast('error', 'Invalid Document', r);
        return { success: false, reason: r };
      }
      const check = performActionCheck(PERMISSIONS.DRIVER_VERIFICATION, driver.vendorId);
      if (!check.allowed) {
        addToast('error', 'Access Denied', check.reason);
        return { success: false, reason: check.reason };
      }
    }

    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, verificationStatus: 'REJECTED' } : d));
    logActivity(`Document rejected — ${doc.docName}: ${reason}`, 'Document Verification');
    addToast('warning', 'Document Rejected', `${doc.docName} was rejected (${reason}).`);
    return { success: true };
  };

  const resetAllData = () => {
    setVendors(INITIAL_VENDORS);
    setVehicles(INITIAL_VEHICLES);
    setDrivers(INITIAL_DRIVERS);
    setDocuments(INITIAL_DOCUMENTS);
    setActivities(INITIAL_LOGS);
    setCurrentUserId('super-vendor-001');
    localStorage.clear();
    addToast('info', 'System Reset', 'Restored original demo dataset.');
  };

  return (
    <AppContext.Provider
      value={{
        vendors,
        vehicles,
        drivers,
        documents,
        activities,
        toasts,
        currentUserId,
        currentUser,
        accessibleVendorIds,
        setCurrentUserId,
        hasPermission,
        performActionCheck,
        addToast,
        removeToast,
        moveVendorProfile,
        changeVendorRole,
        addVendor,
        updateDelegation,
        addVehicle,
        updateVehicleStatus,
        addDriver,
        assignDriverToVehicle,
        renewDocument,
        verifyDocument,
        rejectDocument,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
