# FLEET/07 — Vendor Operations Console

## Overview

A vendor hierarchy and fleet management console built for the MoveInSync OA.

**Assignment:** Vendor Cab and Driver Onboarding & Vendor Hierarchy Management

---

## Features

- **N-level vendor hierarchy** — parentId model, not hardcoded depth
- **Role-based access control** — SUPER_VENDOR → SITE_ADMIN → GROUP_VENDOR → SUB_VENDOR → DEPLOYMENT_ASSOCIATE
- **Scope-based data visibility** — each user sees only their branch and descendants
- **Permission delegation** — per-vendor permission toggles, editable only by direct parent or Super Vendor
- **Vehicle onboarding** — registration, fuel type, seating capacity; auto-generates RC, Insurance, Permit, PUCC documents
- **Driver onboarding** — DL registration, vendor assignment, optional initial vehicle allocation
- **Driver assignment** — compliance-checked; blocked/non-compliant vehicles are rejected
- **Document verification** — PENDING / VERIFIED / REJECTED workflow; vehicle docs use `DOCUMENT_VERIFICATION`, driver DL uses `DRIVER_VERIFICATION`
- **Compliance tracking** — VALID and EXPIRING = operational; EXPIRED or MISSING = blocked
- **Vehicle blocking** — expired or missing required documents automatically make the vehicle effectively BLOCKED through the centralized compliance engine; manual block/activate is also supported
- **Explicit activation** — blocked vehicle requires user action after documents are renewed
- **Move Profile** — change a vendor's reporting parent; validates role rules, scope, and circular moves
- **View As** — demo role switcher to test permission enforcement with different users
- **localStorage persistence** — all state survives page refresh

---

## Architecture

```
src/
├── components/
│   ├── common/         Modal, Toast
│   ├── hierarchy/      HierarchyTree, HierarchyNode, VendorDrawer, MoveProfileModal, ManagerSelector
│   ├── layout/         Header, Sidebar, Layout
│   └── vehicles/       AddVehicleModal, VehicleDetailsDrawer
├── context/
│   └── AppContext.jsx  Central state + all mutation actions
├── data/
│   └── mockData.js     Seed vendors, vehicles, drivers, documents
├── pages/
│   ├── Overview.jsx    Scoped dashboard
│   ├── Hierarchy.jsx   Vendor tree + move profile
│   ├── Vehicles.jsx    Fleet table + add/details
│   ├── Drivers.jsx     Driver table + assign
│   └── Compliance.jsx  Document verification + compliance matrix
└── utils/
    ├── compliance.js   getDocumentStatus, isVehicleCompliant, getEffectiveVehicleStatus
    ├── hierarchy.js    buildHierarchyTree, getEligibleManagers, canMoveNodeToParent
    ├── permissions.js  PERMISSIONS, hasPermission, getAccessibleVendorIds, canPerformAction
    └── storage.js      localStorage load/save helpers
```

---

## Key Design Decisions

### Parent-child hierarchy

Vendors use a `parentId` field pointing to their immediate manager. The tree is built recursively at render time. This supports any number of hierarchy levels without hardcoding depth.

### Scope-based access

`getAccessibleVendorIds(currentUser, vendors)` performs a BFS downward from the current user and returns the set of vendor IDs that user can see. Super Vendor gets all IDs. Every page derives scoped vendors, vehicles, and drivers from these accessible vendor IDs, and derives scoped documents through the relevant vehicle and driver IDs before rendering:

```js
// Pattern used in pages
const scopedVehicles = vehicles.filter(v => accessibleVendorIds.includes(v.vendorId));
const scopedDrivers  = drivers.filter(d => accessibleVendorIds.includes(d.vendorId));
```

Driver documents are scoped separately using `scopedDriverIds` — the pattern `|| d.entityType === 'DRIVER'` is avoided because it would expose driver documents from out-of-scope vendors.

### Centralized compliance

Vehicle operational status is always derived from document status, never from the stored `status` field alone:

- `getDocumentStatus(expiryDate)` → VALID / EXPIRING / EXPIRED (never reads stored field)
- `isVehicleCompliant(vehicleId, docs)` → VALID or EXPIRING = true; EXPIRED or MISSING = false
- `getEffectiveVehicleStatus(vehicle, docs)` → single source of truth for operational status

A vehicle stored as ACTIVE with an expired Insurance is effectively BLOCKED. This is used everywhere for counts, filters, badges, and assignment eligibility.

### Permission-based actions

Actions use the `PERMISSIONS` constants and `canPerformAction` helper rather than hardcoded role checks. Vehicle documents use `DOCUMENT_VERIFICATION`; driver DL uses `DRIVER_VERIFICATION`. These are distinct and not interchangeable.

### Manual block vs compliance block

A vehicle can be blocked two ways:
1. **Compliance block** — `isVehicleCompliant` returns false (expired/missing doc)
2. **Manual block** — stored `status === 'BLOCKED'` with valid docs

Both are checked before driver assignment. `getEffectiveVehicleStatus` handles both cases.

### Delegation

Permission delegation is embedded in the VendorDrawer (Access & Delegation section). It is not a separate page. Only the direct parent or Super Vendor can modify a vendor's permissions — being an ancestor is not sufficient.

### Mock data

Mock data and localStorage are used because no backend API was provided and the assignment allows mock data. All expiry dates are computed relative to `new Date()` so compliance states remain accurate at any run time.

### View As

The VIEW AS selector in the header is a demo mechanism for switching the active user identity to test role-based access and permissions. It is not real authentication. Switching immediately re-derives `accessibleVendorIds` and updates all scoped data across the UI.

---

## Complexity Notes

| Operation | Complexity | Notes |
|---|---|---|
| Vendor scope (getAccessibleVendorIds) | O(V²) worst case | BFS over vendor list; acceptable for mock data |
| Vehicle filtering | O(V) | Single array scan |
| Driver filtering | O(D) | Single array scan |
| Document filtering | O(Doc) | Single array scan |
| Page search/filter | O(N) | Per-filter pass over scoped array |
| Hierarchy tree build | O(V·(F+D)) worst case | Builds vendor nodes and calculates direct fleet/driver counts |
| Descendant ID lookup | O(V) | DFS/recursive |
| Compliance check | O(Doc/V) | Finds 4 required docs per vehicle |

These complexities are appropriate for the mock frontend dataset (9 vendors, 5 vehicles, 4 drivers, 24 documents). For production scale, indexed backend/database queries would replace these in-memory scans.

---

## How to Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

---

## Demo Flow

1. Open as **Super Vendor** — see the full network in Hierarchy and all stats in Overview
2. Go to **Hierarchy** → open a vendor (e.g. City Cabs) → Access & Delegation → disable Driver Onboarding
3. Switch **View As** to City Cabs
4. Click **Add Driver** → expect *Access Denied*
5. Switch back to Super Vendor → re-enable Driver Onboarding for City Cabs
6. Switch View As to City Cabs → Add Driver → expect *Success*
7. Go to **Compliance** → open the blocked vehicle (PB10XY8921) → renew the expired Insurance
8. Vehicle becomes eligible → click **Activate Vehicle** (not automatic)
9. Go to **Drivers** → DL Status column shows PENDING/VERIFIED/REJECTED for each driver
10. Go to **Overview** as a lower-level user → verify counts only reflect accessible scope

---

## Limitations / Future Production Improvements

- **No real authentication** — View As is a mock role switcher for demonstration only
- **No backend** — all data lives in localStorage; would need a proper database for production
- **No object storage** — document renewal stores a new expiry date; no file upload to cloud storage
- **No server-side indexing** — filtering/search is done in-memory; backend queries would handle larger datasets
- **No real notifications** — no email/SMS integration for expiry alerts
- **No booking/payment systems** — booking.management and payments exist only as delegatable permission flags
