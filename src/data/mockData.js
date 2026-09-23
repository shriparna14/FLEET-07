/**
 * Seed Data — FLEET/07 Vendor Operations Console
 *
 * Edge cases covered:
 *   1. Fully compliant active vehicle (veh-001)
 *   2. Insurance expiring within 30 days (veh-002) — vehicle stays operational
 *   3. Expired insurance (veh-003) → BLOCKED
 *   4. Driver assigned to blocked vehicle (drv-004 → veh-003) — intentional edge case
 *   5. Unassigned available driver (drv-003)
 *   6. Vendor with Driver Onboarding disabled (City Cabs)
 *   7. payments: false on all vendors — controlled via permission engine
 *   8. booking.management permission present but off by default
 *   9. Documents carry verificationStatus: PENDING | VERIFIED | REJECTED
 */

export const DEFAULT_PERMISSIONS = {
  'vehicle.onboarding':    true,
  'vehicle.assignment':    true,
  'driver.onboarding':     true,
  'driver.verification':   true,
  'document.verification': true,
  'compliance.tracking':   true,
  'booking.management':    false,
  'payments':              false,
};

export const INITIAL_VENDORS = [
  {
    id: 'super-vendor-001',
    name: 'Aditi Sharma (HQ)',
    role: 'SUPER_VENDOR',
    parentId: null,
    email: 'aditi@fleet07.in',
    phone: '+91 98110 00001',
    location: 'Corporate HQ, Delhi',
    permissions: { ...DEFAULT_PERMISSIONS },
  },
  {
    id: 'site-admin-001',
    name: 'Shriparna',
    role: 'SITE_ADMIN',
    parentId: 'super-vendor-001',
    email: 'shriparna.north@fleet07.in',
    phone: '+91 98110 11001',
    location: 'Site Admin — North',
    permissions: { ...DEFAULT_PERMISSIONS },
  },
  {
    id: 'site-admin-002',
    name: 'Muskan Verma',
    role: 'SITE_ADMIN',
    parentId: 'super-vendor-001',
    email: 'muskan.central@fleet07.in',
    phone: '+91 98110 11002',
    location: 'Site Admin — Central',
    permissions: { ...DEFAULT_PERMISSIONS },
  },
  {
    id: 'site-admin-003',
    name: 'Shruti Kapoor',
    role: 'SITE_ADMIN',
    parentId: 'super-vendor-001',
    email: 'shruti.south@fleet07.in',
    phone: '+91 98110 11003',
    location: 'Site Admin — South',
    permissions: { ...DEFAULT_PERMISSIONS },
  },
  {
    id: 'group-vendor-001',
    name: 'Punjab Fleet',
    role: 'GROUP_VENDOR',
    parentId: 'site-admin-001',
    email: 'fleet@punjab.in',
    phone: '+91 98765 43210',
    location: 'Chandigarh, Punjab',
    permissions: { ...DEFAULT_PERMISSIONS },
  },
  {
    id: 'group-vendor-002',
    name: 'City Cabs',
    role: 'GROUP_VENDOR',
    parentId: 'site-admin-002',
    email: 'contact@citycabs.in',
    phone: '+91 98765 11223',
    location: 'New Delhi, NCR',
    // Driver Onboarding disabled — used to demo permission enforcement
    permissions: { ...DEFAULT_PERMISSIONS, 'driver.onboarding': false },
  },
  {
    id: 'sub-vendor-001',
    name: 'Jalandhar Cars',
    role: 'SUB_VENDOR',
    parentId: 'group-vendor-001',
    email: 'ops@jalandharcars.in',
    phone: '+91 98140 55443',
    location: 'Jalandhar, Punjab',
    permissions: { ...DEFAULT_PERMISSIONS },
  },
  {
    id: 'sub-vendor-002',
    name: 'Ludhiana Fleet',
    role: 'SUB_VENDOR',
    parentId: 'group-vendor-001',
    email: 'info@ludhianafleet.in',
    phone: '+91 98160 88776',
    location: 'Ludhiana, Punjab',
    permissions: { ...DEFAULT_PERMISSIONS },
  },
  {
    id: 'associate-001',
    name: 'Neha Singh (DA)',
    role: 'DEPLOYMENT_ASSOCIATE',
    parentId: 'sub-vendor-001',
    email: 'neha.da@jalandhar.in',
    phone: '+91 98150 99887',
    location: 'Jalandhar Hub',
    permissions: { ...DEFAULT_PERMISSIONS },
  },
];

export const INITIAL_VEHICLES = [
  { id: 'veh-001', registrationNumber: 'PB10AB1234', model: 'Swift Dzire',   seatingCapacity: 4, fuelType: 'Petrol',  vendorId: 'group-vendor-001', status: 'ACTIVE'  },
  { id: 'veh-002', registrationNumber: 'PB08CD5621', model: 'WagonR',        seatingCapacity: 4, fuelType: 'CNG',     vendorId: 'sub-vendor-001',   status: 'ACTIVE'  },
  { id: 'veh-003', registrationNumber: 'PB10XY8921', model: 'Ertiga',        seatingCapacity: 6, fuelType: 'Diesel',  vendorId: 'sub-vendor-002',   status: 'BLOCKED' }, // Expired insurance
  { id: 'veh-004', registrationNumber: 'PB09AA4211', model: 'Aura',          seatingCapacity: 4, fuelType: 'CNG',     vendorId: 'group-vendor-002', status: 'ACTIVE'  },
  { id: 'veh-005', registrationNumber: 'PB02CC9812', model: 'Innova Crysta', seatingCapacity: 7, fuelType: 'Diesel',  vendorId: 'group-vendor-001', status: 'ACTIVE'  },
];

export const INITIAL_DRIVERS = [
  { id: 'drv-001', name: 'Rohan Sharma',   phone: '+91 98720 12345', licenceNumber: 'DL-0420180098291', vendorId: 'group-vendor-001', assignedVehicleId: 'veh-001', status: 'ACTIVE'    },
  { id: 'drv-002', name: 'Amit Patel',     phone: '+91 98140 98765', licenceNumber: 'DL-0820190012345', vendorId: 'sub-vendor-001',   assignedVehicleId: 'veh-002', status: 'ACTIVE'    },
  { id: 'drv-003', name: 'Priya Singh',    phone: '+91 98150 44332', licenceNumber: 'DL-1020200055443', vendorId: 'group-vendor-002', assignedVehicleId: null,      status: 'AVAILABLE' },
  { id: 'drv-004', name: 'Gurpreet Kaur',  phone: '+91 98760 11998', licenceNumber: 'DL-0420170066778', vendorId: 'sub-vendor-002',   assignedVehicleId: 'veh-003', status: 'ACTIVE'    },
];

// Expiry dates are always relative to today so compliance states never go stale.
const today = new Date();
const fmtDate = (daysFromToday) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().split('T')[0];
};

export const INITIAL_DOCUMENTS = [
  // PB10AB1234 (veh-001) — fully compliant, all docs verified
  { id: 'doc-101', entityType: 'VEHICLE', entityId: 'veh-001', docType: 'RC',        docName: 'Registration Certificate', expiryDate: fmtDate(365), status: 'VALID',    verificationStatus: 'VERIFIED' },
  { id: 'doc-102', entityType: 'VEHICLE', entityId: 'veh-001', docType: 'INSURANCE', docName: 'Commercial Insurance',     expiryDate: fmtDate(180), status: 'VALID',    verificationStatus: 'VERIFIED' },
  { id: 'doc-103', entityType: 'VEHICLE', entityId: 'veh-001', docType: 'PERMIT',    docName: 'State Transit Permit',     expiryDate: fmtDate(200), status: 'VALID',    verificationStatus: 'VERIFIED' },
  { id: 'doc-104', entityType: 'VEHICLE', entityId: 'veh-001', docType: 'POLLUTION', docName: 'PUCC Certificate',         expiryDate: fmtDate(90),  status: 'VALID',    verificationStatus: 'VERIFIED' },

  // PB08CD5621 (veh-002) — insurance expiring soon; still compliant, shows warning
  { id: 'doc-201', entityType: 'VEHICLE', entityId: 'veh-002', docType: 'RC',        docName: 'Registration Certificate', expiryDate: fmtDate(300), status: 'VALID',    verificationStatus: 'VERIFIED' },
  { id: 'doc-202', entityType: 'VEHICLE', entityId: 'veh-002', docType: 'INSURANCE', docName: 'Commercial Insurance',     expiryDate: fmtDate(10),  status: 'EXPIRING', verificationStatus: 'VERIFIED' },
  { id: 'doc-203', entityType: 'VEHICLE', entityId: 'veh-002', docType: 'PERMIT',    docName: 'State Transit Permit',     expiryDate: fmtDate(150), status: 'VALID',    verificationStatus: 'PENDING'  },
  { id: 'doc-204', entityType: 'VEHICLE', entityId: 'veh-002', docType: 'POLLUTION', docName: 'PUCC Certificate',         expiryDate: fmtDate(60),  status: 'VALID',    verificationStatus: 'VERIFIED' },

  // PB10XY8921 (veh-003) — insurance EXPIRED → BLOCKED; demonstrates renewal+activation flow
  { id: 'doc-301', entityType: 'VEHICLE', entityId: 'veh-003', docType: 'RC',        docName: 'Registration Certificate', expiryDate: fmtDate(250), status: 'VALID',    verificationStatus: 'VERIFIED' },
  { id: 'doc-302', entityType: 'VEHICLE', entityId: 'veh-003', docType: 'INSURANCE', docName: 'Commercial Insurance',     expiryDate: fmtDate(-4),  status: 'EXPIRED',  verificationStatus: 'REJECTED' },
  { id: 'doc-303', entityType: 'VEHICLE', entityId: 'veh-003', docType: 'PERMIT',    docName: 'State Transit Permit',     expiryDate: fmtDate(120), status: 'VALID',    verificationStatus: 'VERIFIED' },
  { id: 'doc-304', entityType: 'VEHICLE', entityId: 'veh-003', docType: 'POLLUTION', docName: 'PUCC Certificate',         expiryDate: fmtDate(45),  status: 'VALID',    verificationStatus: 'PENDING'  },

  // PB09AA4211 (veh-004) — all valid, PUCC pending verification
  { id: 'doc-401', entityType: 'VEHICLE', entityId: 'veh-004', docType: 'RC',        docName: 'Registration Certificate', expiryDate: fmtDate(400), status: 'VALID',    verificationStatus: 'VERIFIED' },
  { id: 'doc-402', entityType: 'VEHICLE', entityId: 'veh-004', docType: 'INSURANCE', docName: 'Commercial Insurance',     expiryDate: fmtDate(120), status: 'VALID',    verificationStatus: 'VERIFIED' },
  { id: 'doc-403', entityType: 'VEHICLE', entityId: 'veh-004', docType: 'PERMIT',    docName: 'State Transit Permit',     expiryDate: fmtDate(180), status: 'VALID',    verificationStatus: 'VERIFIED' },
  { id: 'doc-404', entityType: 'VEHICLE', entityId: 'veh-004', docType: 'POLLUTION', docName: 'PUCC Certificate',         expiryDate: fmtDate(90),  status: 'VALID',    verificationStatus: 'PENDING'  },

  // PB02CC9812 (veh-005) — all valid and verified
  { id: 'doc-501', entityType: 'VEHICLE', entityId: 'veh-005', docType: 'RC',        docName: 'Registration Certificate', expiryDate: fmtDate(350), status: 'VALID',    verificationStatus: 'VERIFIED' },
  { id: 'doc-502', entityType: 'VEHICLE', entityId: 'veh-005', docType: 'INSURANCE', docName: 'Commercial Insurance',     expiryDate: fmtDate(210), status: 'VALID',    verificationStatus: 'VERIFIED' },
  { id: 'doc-503', entityType: 'VEHICLE', entityId: 'veh-005', docType: 'PERMIT',    docName: 'State Transit Permit',     expiryDate: fmtDate(140), status: 'VALID',    verificationStatus: 'VERIFIED' },
  { id: 'doc-504', entityType: 'VEHICLE', entityId: 'veh-005', docType: 'POLLUTION', docName: 'PUCC Certificate',         expiryDate: fmtDate(75),  status: 'VALID',    verificationStatus: 'VERIFIED' },

  // Driver DLs
  { id: 'doc-d01', entityType: 'DRIVER', entityId: 'drv-001', docType: 'DL', docName: 'Driving Licence', expiryDate: fmtDate(500), status: 'VALID', verificationStatus: 'VERIFIED' },
  { id: 'doc-d02', entityType: 'DRIVER', entityId: 'drv-002', docType: 'DL', docName: 'Driving Licence', expiryDate: fmtDate(600), status: 'VALID', verificationStatus: 'VERIFIED' },
  { id: 'doc-d03', entityType: 'DRIVER', entityId: 'drv-003', docType: 'DL', docName: 'Driving Licence', expiryDate: fmtDate(450), status: 'VALID', verificationStatus: 'PENDING'  },
  { id: 'doc-d04', entityType: 'DRIVER', entityId: 'drv-004', docType: 'DL', docName: 'Driving Licence', expiryDate: fmtDate(300), status: 'VALID', verificationStatus: 'VERIFIED' },
];

export const INITIAL_LOGS = [
  { id: 'log-001', timestamp: '09:42', text: 'Punjab Fleet reassigned to Site Admin — North',   category: 'Hierarchy'         },
  { id: 'log-002', timestamp: '09:18', text: 'Vehicle PB10XY8921 blocked — Insurance expired',  category: 'Compliance'        },
  { id: 'log-003', timestamp: '08:51', text: 'New driver onboarded — Rohan Sharma',             category: 'Driver onboarding' },
  { id: 'log-004', timestamp: '08:20', text: 'RC verified for PB10AB1234',                      category: 'Compliance'        },
];
