import React from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PERMISSIONS } from '../../utils/permissions';
import { getDocumentStatus, isVehicleCompliant, getEffectiveVehicleStatus } from '../../utils/compliance';

// vehicle     — the selected vehicle object (may be stale; we always look up the live copy)
// onClose     — callback to close the drawer
// vehicles    — full vehicle list (for live lookup)
// vendors     — for vendor name display
// drivers     — for assigned driver display
// documents   — for compliance calculations
// updateVehicleStatus — context action
export default function VehicleDetailsDrawer({
  vehicle,
  onClose,
  vehicles,
  vendors,
  drivers,
  documents,
  updateVehicleStatus,
}) {
  const { hasPermission } = useApp();
  const canTrackCompliance = hasPermission(PERMISSIONS.COMPLIANCE_TRACKING);

  if (!vehicle) return null;

  // Always use the live version of the vehicle so the drawer reflects the
  // latest state even if the parent rendered with an older snapshot.
  const live = vehicles.find(v => v.id === vehicle.id) || vehicle;
  const effective  = getEffectiveVehicleStatus(live, documents);
  const isBlocked  = effective.status === 'BLOCKED';
  const canActivate = isVehicleCompliant(live.id, documents);

  const vehicleDocs = documents.filter(d => d.entityId === live.id || d.vehicleId === live.id);
  const assignedDriver = drivers.find(d => d.assignedVehicleId === live.id);
  const owningVendor   = vendors.find(v => v.id === live.vendorId);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      <div
        className="absolute inset-0 transition-opacity"
        style={{ backgroundColor: 'rgba(7, 63, 56, 0.45)' }}
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface border-l border-border shadow-md flex flex-col">

          {/* Header */}
          <div className="p-5 border-b border-border flex items-start justify-between bg-background">
            <div>
              <span className="text-[10px] font-mono font-bold text-secondary tracking-wider uppercase">
                Vehicle Profile
              </span>
              <h2 className="text-base font-bold font-mono text-text mt-0.5">
                {live.registrationNumber}
              </h2>
              <p className="text-xs text-muted font-medium">{live.model}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">

            {/* Operating status */}
            <div className="p-3 bg-background border border-border rounded-[6px] flex items-center justify-between font-mono">
              <span className="font-bold text-muted text-[10px] uppercase">Operating Status</span>
              <div className="text-right">
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  effective.status === 'ACTIVE' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                }`}>
                  ● {effective.status}
                </span>
                {effective.isExpiring && (
                  <p className="text-[10px] text-warning mt-0.5">{effective.expiringWarning}</p>
                )}
              </div>
            </div>

            {/* Specifications */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-mono font-bold tracking-widest text-muted uppercase">Specifications</p>
              <div className="p-3 bg-background border border-border rounded-[6px] space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted">Seats</span>
                  <span className="font-bold text-text">{live.seatingCapacity} Passenger</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Fuel Type</span>
                  <span className="font-bold text-text">{live.fuelType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Owning Vendor</span>
                  <span className="font-bold text-text font-sans">{owningVendor?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Assigned Driver</span>
                  <span className="font-bold text-text font-sans">
                    {assignedDriver?.name || 'None (Unassigned)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Mandatory compliance docs */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-mono font-bold tracking-widest text-muted uppercase">Mandatory Compliance</p>
              <div className="p-3 bg-background border border-border rounded-[6px] space-y-2">
                {['RC', 'INSURANCE', 'PERMIT', 'POLLUTION'].map(docType => {
                  const doc    = vehicleDocs.find(d => d.docType === docType);
                  const status = doc ? getDocumentStatus(doc.expiryDate) : 'MISSING';
                  const statusCls =
                    status === 'VALID'    ? 'text-success bg-success/10' :
                    status === 'EXPIRING' ? 'text-warning bg-warning/10' :
                                            'text-danger  bg-danger/10';
                  return (
                    <div key={docType} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0 font-mono">
                      <div>
                        <p className="font-bold text-text text-xs">{docType}</p>
                        <p className="text-[10px] text-muted">
                          {doc ? `Expires: ${doc.expiryDate}` : 'Required on file'}
                        </p>
                      </div>
                      <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${statusCls}`}>
                        ● {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="p-4 bg-background border-t border-border flex items-center justify-between">
            {isBlocked ? (
              <button
                onClick={() => { updateVehicleStatus(live.id, 'ACTIVE'); onClose(); }}
                disabled={!canTrackCompliance || !canActivate}
                title={
                  !canTrackCompliance
                    ? 'Compliance tracking permission required to activate vehicle'
                    : !canActivate
                    ? 'Renew expired documents before activating'
                    : 'Activate vehicle'
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-success hover:bg-secondary
                           disabled:opacity-40 disabled:cursor-not-allowed rounded-[6px] transition-colors"
              >
                Activate Vehicle
              </button>
            ) : (
              <button
                onClick={() => { updateVehicleStatus(live.id, 'BLOCKED'); onClose(); }}
                disabled={!canTrackCompliance}
                title={!canTrackCompliance ? 'Compliance tracking permission required to block vehicle' : 'Block vehicle'}
                className="px-4 py-2 text-xs font-semibold text-white bg-danger hover:bg-danger/90
                           disabled:opacity-40 disabled:cursor-not-allowed rounded-[6px] transition-colors"
              >
                Block Vehicle
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text bg-surface hover:bg-background border border-border rounded-[6px]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
