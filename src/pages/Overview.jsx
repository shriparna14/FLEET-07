import React from 'react';
import { useApp } from '../context/AppContext';
import { getDocumentStatus, isVehicleCompliant, getEffectiveVehicleStatus } from '../utils/compliance';
import { Plus } from 'lucide-react';

export default function Overview({ setActiveTab }) {
  const { vendors, vehicles, drivers, documents, activities, accessibleVendorIds, currentUser } = useApp();

  // ── Scope filtering ────────────────────────────────────────────────────────
  const scopedVendors  = vendors.filter(v => accessibleVendorIds.includes(v.id));
  const scopedVehicles = vehicles.filter(v => accessibleVendorIds.includes(v.vendorId));
  const scopedDrivers  = drivers.filter(d => accessibleVendorIds.includes(d.vendorId));

  const scopedVehicleIds = scopedVehicles.map(v => v.id);
  const scopedDriverIds  = scopedDrivers.map(d => d.id);

  // Only documents that belong to vehicles/drivers within the accessible scope.
  // The previous `|| d.entityType === 'DRIVER'` was wrong — it exposed driver
  // documents from vendors outside the current user's hierarchy.
  const scopedDocuments = documents.filter(d => {
    if (d.entityType === 'VEHICLE') return scopedVehicleIds.includes(d.entityId);
    if (d.entityType === 'DRIVER')  return scopedDriverIds.includes(d.entityId);
    return false;
  });

  // Fleet counts — use getEffectiveVehicleStatus so a vehicle with expired docs
  // that hasn't been manually blocked yet is still counted as BLOCKED.
  const activeVehicles   = scopedVehicles.filter(v => getEffectiveVehicleStatus(v, documents).status === 'ACTIVE').length;
  const inactiveVehicles = scopedVehicles.filter(v => getEffectiveVehicleStatus(v, documents).status === 'INACTIVE').length;
  const blockedVehicles  = scopedVehicles.filter(v => getEffectiveVehicleStatus(v, documents).status === 'BLOCKED').length;

  // Document counts — live calculation, not stored status field
  const validDocs    = scopedDocuments.filter(d => getDocumentStatus(d.expiryDate) === 'VALID').length;
  const expiringDocs = scopedDocuments.filter(d => getDocumentStatus(d.expiryDate) === 'EXPIRING').length;
  const expiredDocs  = scopedDocuments.filter(d => getDocumentStatus(d.expiryDate) === 'EXPIRED').length;

  // Verification state (field added when documents were onboarded)
  const pendingVerif  = scopedDocuments.filter(d => d.verificationStatus === 'PENDING').length;
  const verifiedDocs  = scopedDocuments.filter(d => d.verificationStatus === 'VERIFIED').length;
  const rejectedDocs  = scopedDocuments.filter(d => d.verificationStatus === 'REJECTED').length;

  // Driver availability — derived from assignedVehicleId, not stored status
  const assignedDrivers  = scopedDrivers.filter(d => d.assignedVehicleId).length;
  const availableDrivers = scopedDrivers.filter(d => !d.assignedVehicleId).length;

  // Activity logs don't carry a vendorId, so we can't precisely scope them.
  // Super Vendor sees the full system log. Lower-level users see the most recent
  // entries only — this avoids leaking cross-scope activity text to sub-vendors.
  const visibleActivities = currentUser?.role === 'SUPER_VENDOR'
    ? activities.slice(0, 8)
    : activities.slice(0, 5);

  const pendingActions = blockedVehicles + expiredDocs + expiringDocs;

  // Per-vendor operational report — only non-super vendors that have fleet or drivers
  const vendorReport = scopedVendors
    .filter(v => v.role !== 'SUPER_VENDOR')
    .map(v => {
      const vVehicles     = scopedVehicles.filter(vh => vh.vendorId === v.id);
      const vDrivers      = scopedDrivers.filter(d => d.vendorId === v.id);
      const vBlocked      = vVehicles.filter(vh => getEffectiveVehicleStatus(vh, documents).status === 'BLOCKED').length;
      const vCompliant    = vVehicles.filter(vh => isVehicleCompliant(vh.id, documents)).length;
      const compliancePct = vVehicles.length > 0 ? Math.round((vCompliant / vVehicles.length) * 100) : 100;
      return { ...v, vVehicles, vDrivers, vBlocked, compliancePct };
    })
    .filter(v => v.vVehicles.length > 0 || v.vDrivers.length > 0);

  const Row = ({ label, value, color = 'text-text' }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={`font-mono font-semibold text-sm ${color}`}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in select-none">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-lg font-bold text-text">Overview</h1>
          <p className="text-xs text-muted mt-0.5">Fleet operations at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('vehicles')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-secondary rounded-[6px] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Vehicle
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-surface hover:bg-softgreen border border-primary/20 rounded-[6px] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Driver
          </button>
        </div>
      </div>

      {/* ── Expiry reminder banner ── */}
      {expiringDocs > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/25 rounded-[6px] text-xs text-text">
          <span className="text-warning font-bold">⚠</span>
          <span>
            <strong className="font-semibold">{expiringDocs} document{expiringDocs > 1 ? 's' : ''}</strong>
            {' '}expire within 30 days. Renew before the deadline to avoid blocking.
          </span>
          <button
            onClick={() => setActiveTab('compliance')}
            className="ml-auto text-xs font-semibold text-primary hover:underline shrink-0"
          >
            Review →
          </button>
        </div>
      )}

      {/* ── Row 1: Network · Fleet State · Document State ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Network */}
        <div className="bg-surface border border-border rounded-[6px] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-background/50">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Network</span>
          </div>
          <div className="px-4 py-1">
            <Row label="Vendors"         value={scopedVendors.length} />
            <Row label="Vehicles"        value={scopedVehicles.length} />
            <Row label="Drivers"         value={scopedDrivers.length} />
            <Row
              label="Pending actions"
              value={pendingActions}
              color={pendingActions > 0 ? 'text-warning' : 'text-success'}
            />
          </div>
        </div>

        {/* Fleet state */}
        <div className="bg-surface border border-border rounded-[6px] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-background/50">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Fleet State</span>
          </div>
          <div className="px-4 py-1">
            <Row label="Active"   value={activeVehicles}   color="text-success" />
            <Row label="Inactive" value={inactiveVehicles} />
            <Row label="Blocked"  value={blockedVehicles}  color={blockedVehicles > 0 ? 'text-danger' : 'text-text'} />
          </div>
        </div>

        {/* Document validity */}
        <div className="bg-surface border border-border rounded-[6px] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-background/50">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Document Validity</span>
          </div>
          <div className="px-4 py-1">
            <Row label="Valid"    value={validDocs}    color="text-success" />
            <Row label="Expiring" value={expiringDocs} color={expiringDocs > 0 ? 'text-warning' : 'text-text'} />
            <Row label="Expired"  value={expiredDocs}  color={expiredDocs > 0  ? 'text-danger'  : 'text-text'} />
          </div>
        </div>
      </div>

      {/* ── Row 2: Document Verification · Driver Availability ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Document verification */}
        <div className="bg-surface border border-border rounded-[6px] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-background/50 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Document Verification</span>
            {pendingVerif > 0 && (
              <button
                onClick={() => setActiveTab('compliance')}
                className="text-[10px] font-semibold text-primary hover:underline"
              >
                {pendingVerif} pending →
              </button>
            )}
          </div>
          <div className="px-4 py-1">
            <Row label="Pending"  value={pendingVerif} color={pendingVerif > 0 ? 'text-warning' : 'text-text'} />
            <Row label="Verified" value={verifiedDocs} color="text-success" />
            <Row label="Rejected" value={rejectedDocs} color={rejectedDocs > 0 ? 'text-danger' : 'text-text'} />
          </div>
        </div>

        {/* Driver availability */}
        <div className="bg-surface border border-border rounded-[6px] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-background/50">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Driver Availability</span>
          </div>
          <div className="px-4 py-1">
            <Row label="Available" value={availableDrivers} color="text-success" />
            <Row label="Assigned"  value={assignedDrivers} />
            <Row label="Total"     value={scopedDrivers.length} />
          </div>
        </div>
      </div>

      {/* ── Operational report — per-vendor summary ── */}
      {vendorReport.length > 0 && (
        <div className="bg-surface border border-border rounded-[6px] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-background/50">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Operational Report</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[520px]">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="py-2 px-4 text-[11px] font-semibold text-muted uppercase tracking-wider">Vendor</th>
                  <th className="py-2 px-4 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Vehicles</th>
                  <th className="py-2 px-4 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Drivers</th>
                  <th className="py-2 px-4 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Blocked</th>
                  <th className="py-2 px-4 text-[11px] font-semibold text-muted uppercase tracking-wider text-right">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {vendorReport.map(v => (
                  <tr key={v.id} className="hover:bg-background/60 transition-colors">
                    <td className="py-2.5 px-4">
                      <span className="text-sm font-semibold text-text">{v.name}</span>
                      <span className="block text-[10px] text-muted">{v.location || v.role}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-sm text-text">{v.vVehicles.length}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-sm text-text">{v.vDrivers.length}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className={`font-mono text-sm font-semibold ${v.vBlocked > 0 ? 'text-danger' : 'text-text'}`}>
                        {v.vBlocked}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className={`font-mono text-sm font-semibold ${
                        v.compliancePct === 100 ? 'text-success' :
                        v.compliancePct >= 80  ? 'text-warning' : 'text-danger'
                      }`}>
                        {v.compliancePct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recent activity ── */}
      <div className="bg-surface border border-border rounded-[6px] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-background/50">
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Recent Activity</span>
        </div>
        <div className="divide-y divide-border/50">
          {visibleActivities.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted text-center">No recent activity.</p>
          ) : visibleActivities.map(log => (
            <div key={log.id} className="px-4 py-2.5 flex items-center gap-3">
              <span className="font-mono text-[11px] text-muted shrink-0 w-9">{log.timestamp}</span>
              <span className="text-sm text-text flex-1">{log.text}</span>
              <span className="text-[10px] font-medium text-muted bg-softgreen px-2 py-0.5 rounded-[3px] border border-border shrink-0">
                {log.category}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
