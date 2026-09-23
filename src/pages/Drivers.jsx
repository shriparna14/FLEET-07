import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/common/Modal';
import { PERMISSIONS } from '../utils/permissions';
import { getEffectiveVehicleStatus } from '../utils/compliance';
import { Search, Plus, Lock } from 'lucide-react';

export default function Drivers() {
  const {
    drivers, vehicles, vendors,
    addDriver, assignDriverToVehicle,
    hasPermission, currentUser, documents,
    accessibleVendorIds,
  } = useApp();

  // ── Scope filtering ────────────────────────────────────────────────────────
  const accessibleVendors = vendors.filter(v => accessibleVendorIds.includes(v.id));
  const accessibleDrivers = drivers.filter(d => accessibleVendorIds.includes(d.vendorId));
  const accessibleVehicles = vehicles.filter(v => accessibleVendorIds.includes(v.vendorId));

  const [searchTerm, setSearchTerm]   = useState('');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', phone: '', licenceNumber: '', vendorId: '', assignedVehicleId: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const [selectedDriverForAssign, setSelectedDriverForAssign] = useState(null);
  const [targetVehicleId, setTargetVehicleId] = useState('');
  const [assignError, setAssignError] = useState('');

  const canAddDriver = hasPermission(PERMISSIONS.DRIVER_ONBOARDING);
  const canAssignDriver = hasPermission(PERMISSIONS.VEHICLE_ASSIGNMENT);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredDrivers = accessibleDrivers.filter(d => {
    const q = searchTerm.trim().toLowerCase();
    const vendor = vendors.find(v => v.id === d.vendorId);
    const matchesSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      (d.licenceNumber && d.licenceNumber.toLowerCase().includes(q)) ||
      (vendor && vendor.name.toLowerCase().includes(q));
    return matchesSearch &&
           (vendorFilter === 'ALL' || d.vendorId === vendorFilter) &&
           (statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? !!d.assignedVehicleId : !d.assignedVehicleId));
  });

  // ── Add driver validation ─────────────────────────────────────────────────

  const validateForm = () => {
    const errors = {};
    if (!addForm.name.trim()) errors.name = 'Full name is required.';

    const cleanPhone = addForm.phone.replace(/[\s-]/g, '');
    if (!cleanPhone)             errors.phone = 'Phone number is required.';
    else if (cleanPhone.length < 10) errors.phone = 'Enter a valid 10-digit phone number.';

    const dl = addForm.licenceNumber.trim().toUpperCase();
    if (!dl)           errors.licenceNumber = 'Driving licence number is required.';
    else if (dl.length < 6) errors.licenceNumber = 'Enter a valid DL number (e.g. DL-0420180098291).';

    if (!addForm.vendorId) errors.vendorId = 'Please select a vendor.';

    // Compliance check via centralized status resolver
    if (addForm.assignedVehicleId) {
      const veh = vehicles.find(v => v.id === addForm.assignedVehicleId);
      if (veh) {
        const effectiveStatus = getEffectiveVehicleStatus(veh, documents);
        if (effectiveStatus.status === 'BLOCKED') {
          errors.assignedVehicleId = 'This vehicle is not compliant or is manually blocked.';
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const result = addDriver(addForm);
    if (result.success) {
      setIsAddModalOpen(false);
      setAddForm({ name: '', phone: '', licenceNumber: '', vendorId: '', assignedVehicleId: '' });
      setFieldErrors({});
    } else {
      setFieldErrors({ general: result.reason || 'Failed to onboard driver.' });
    }
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (!selectedDriverForAssign) return;
    setAssignError('');

    if (targetVehicleId) {
      const veh = vehicles.find(v => v.id === targetVehicleId);
      if (veh) {
        const effectiveStatus = getEffectiveVehicleStatus(veh, documents);
        if (effectiveStatus.status === 'BLOCKED') {
          setAssignError(
            `Cannot assign to ${veh.registrationNumber} — vehicle is blocked or has expired documents.`
          );
          return;
        }
      }
    }

    const result = assignDriverToVehicle(selectedDriverForAssign.id, targetVehicleId);
    if (result.success) {
      setSelectedDriverForAssign(null);
      setTargetVehicleId('');
    } else {
      setAssignError(result.reason || 'Failed to assign driver.');
    }
  };

  const clearFilters = () => { setSearchTerm(''); setVendorFilter('ALL'); setStatusFilter('ALL'); };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 animate-fade-in select-none">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-lg font-bold text-text">Drivers</h1>
          <p className="text-xs text-muted mt-0.5">
            Workforce registry · licence verification · vehicle allocations
          </p>
        </div>
        <button
          onClick={() => {
            setFieldErrors(canAddDriver ? {} : { general: 'Access denied — driver onboarding permission has not been granted.' });
            setAddForm(prev => ({ ...prev, vendorId: accessibleVendors[0]?.id || '' }));
            setIsAddModalOpen(true);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-colors self-start sm:self-auto ${
            canAddDriver
              ? 'text-white bg-primary hover:bg-secondary'
              : 'text-muted bg-background border border-border cursor-not-allowed'
          }`}
          title={!canAddDriver ? 'Driver onboarding permission restricted' : 'Add new driver'}
        >
          {!canAddDriver ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          Add Driver
        </button>
      </div>

      {/* ── Permission notice ── */}
      {!canAddDriver && (
        <div className="p-2.5 bg-warning/10 border border-warning/25 rounded-[6px] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-warning shrink-0" />
            <span className="text-text">
              <strong>Restricted:</strong> Driver onboarding is not enabled for{' '}
              <strong>{currentUser?.name}</strong>.
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold uppercase text-warning">READ-ONLY</span>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="p-2.5 bg-surface border border-border rounded-[6px] flex flex-col lg:flex-row items-center gap-2.5">
        <div className="w-full lg:w-72 relative">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name, DL, phone…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-[6px]
                       focus:border-primary focus:outline-none text-text placeholder:text-muted"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select
            value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-background border border-border rounded-[6px] focus:border-primary outline-none font-medium text-text"
          >
            <option value="ALL">All vendors</option>
            {accessibleVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-background border border-border rounded-[6px] focus:border-primary outline-none font-medium text-text"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="AVAILABLE">Available</option>
          </select>
        </div>
      </div>

      {/* ── Driver table ── */}
      <div className="bg-surface border border-border rounded-[6px] overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-border bg-background/50 text-[11px] font-semibold text-muted uppercase tracking-wider">
              <th className="py-2.5 px-4">Driver</th>
              <th className="py-2.5 px-4">Vehicle</th>
              <th className="py-2.5 px-4">Vendor</th>
              <th className="py-2.5 px-4">Phone</th>
              <th className="py-2.5 px-4">Licence</th>
              <th className="py-2.5 px-4 text-center">DL Status</th>
              <th className="py-2.5 px-4 text-center">Status</th>
              <th className="py-2.5 px-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <p className="font-semibold text-text">No drivers found</p>
                  <p className="text-[11px] text-muted mt-1">No records match your current search or filters.</p>
                  <button
                    onClick={clearFilters}
                    className="mt-3 px-3 py-1 text-xs font-semibold text-primary bg-background hover:bg-softgreen border border-border rounded-[4px] transition-colors"
                  >
                    Clear filters
                  </button>
                </td>
              </tr>
            ) : filteredDrivers.map(drv => {
              const vendor  = vendors.find(v => v.id === drv.vendorId);
              const vehicle = vehicles.find(v => v.id === drv.assignedVehicleId);
              const vehicleEffective = vehicle ? getEffectiveVehicleStatus(vehicle, documents) : null;
              const vehicleIsBlocked = vehicleEffective?.status === 'BLOCKED';
              // DL verification status
              const dlDoc = documents.find(d => d.entityType === 'DRIVER' && d.entityId === drv.id && d.docType === 'DL');
              const dlVerif = dlDoc?.verificationStatus || null;
              const dlVerifCfg = {
                VERIFIED: { cls: 'text-success bg-success/10', label: 'Verified' },
                PENDING:  { cls: 'text-warning bg-warning/10', label: 'Pending'  },
                REJECTED: { cls: 'text-danger  bg-danger/10',  label: 'Rejected' },
              }[dlVerif] || null;

              return (
                <tr key={drv.id} className="hover:bg-background/70 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-text">{drv.name}</td>
                  <td className="py-2.5 px-4 font-mono text-xs">
                    {vehicle ? (
                      <span className={vehicleIsBlocked ? 'text-danger font-semibold' : 'text-primary font-semibold'}>
                        {vehicle.registrationNumber}
                        {vehicleIsBlocked && <span className="text-[10px] ml-1 text-danger">(BLOCKED)</span>}
                      </span>
                    ) : (
                      <span className="text-muted">— Unassigned</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-text">{vendor?.name || 'Unknown'}</td>
                  <td className="py-2.5 px-4 font-mono text-muted">{drv.phone}</td>
                  <td className="py-2.5 px-4 font-mono text-text">{drv.licenceNumber}</td>
                  <td className="py-2.5 px-4 text-center">
                    {dlVerifCfg ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-semibold font-mono ${dlVerifCfg.cls}`}>
                        {dlVerifCfg.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold font-mono ${
                      drv.assignedVehicleId ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'
                    }`}>
                      {drv.assignedVehicleId ? 'ACTIVE' : 'AVAILABLE'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => {
                        if (!canAssignDriver) return;
                        setSelectedDriverForAssign(drv);
                        setTargetVehicleId(drv.assignedVehicleId || '');
                        setAssignError('');
                      }}
                      disabled={!canAssignDriver}
                      className={`px-2 py-1 text-xs font-semibold rounded-[4px] transition-colors ${
                        canAssignDriver
                          ? 'text-text bg-background hover:bg-softgreen border border-border'
                          : 'text-muted/40 bg-background/50 border border-border/40 cursor-not-allowed'
                      }`}
                      title={!canAssignDriver ? 'Vehicle assignment permission restricted' : 'Reassign vehicle'}
                    >
                      Reassign
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Add Driver modal ── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setFieldErrors({}); }}
        title="Add Driver"
        subtitle="Onboard a commercial driver and register their driving licence."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
          {fieldErrors.general && (
            <div className="p-2.5 rounded-[6px] bg-danger/10 border border-danger/25 text-danger font-medium leading-relaxed">
              {fieldErrors.general}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">Full Name *</label>
            <input
              type="text" required placeholder="e.g. Rohan Sharma"
              value={addForm.name}
              onChange={e => { setAddForm({ ...addForm, name: e.target.value }); if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' }); }}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px] text-text focus:border-primary outline-none"
            />
            {fieldErrors.name && <p className="text-danger text-[10px] mt-1">{fieldErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">Phone *</label>
              <input
                type="text" required placeholder="+91 98720 12345"
                value={addForm.phone}
                onChange={e => { setAddForm({ ...addForm, phone: e.target.value }); if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' }); }}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px] text-text focus:border-primary outline-none font-mono"
              />
              {fieldErrors.phone && <p className="text-danger text-[10px] mt-1">{fieldErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">DL Number *</label>
              <input
                type="text" required placeholder="DL-0420180098291"
                value={addForm.licenceNumber}
                onChange={e => { setAddForm({ ...addForm, licenceNumber: e.target.value.toUpperCase() }); if (fieldErrors.licenceNumber) setFieldErrors({ ...fieldErrors, licenceNumber: '' }); }}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px] text-text focus:border-primary outline-none font-mono font-semibold"
              />
              {fieldErrors.licenceNumber && <p className="text-danger text-[10px] mt-1">{fieldErrors.licenceNumber}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">Vendor *</label>
              <select
                required value={addForm.vendorId}
                onChange={e => { setAddForm({ ...addForm, vendorId: e.target.value, assignedVehicleId: '' }); if (fieldErrors.vendorId) setFieldErrors({ ...fieldErrors, vendorId: '' }); }}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px] text-text focus:border-primary outline-none"
              >
                <option value="">Select vendor…</option>
                {accessibleVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              {fieldErrors.vendorId && <p className="text-danger text-[10px] mt-1">{fieldErrors.vendorId}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">Assign Vehicle</label>
              <select
                value={addForm.assignedVehicleId}
                onChange={e => setAddForm({ ...addForm, assignedVehicleId: e.target.value })}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px] text-text focus:border-primary outline-none font-mono text-xs"
              >
                <option value="">Unassigned</option>
                {accessibleVehicles
                  .filter(v => !addForm.vendorId || v.vendorId === addForm.vendorId)
                  .map(v => {
                    const effective  = getEffectiveVehicleStatus(v, documents);
                    const ineligible = effective.status === 'BLOCKED';
                    const label = `${v.registrationNumber}${ineligible ? ' ⚠ Not compliant' : ''}`;
                    return <option key={v.id} value={v.id} disabled={ineligible}>{label}</option>;
                  })
                }
              </select>
              {fieldErrors.assignedVehicleId && <p className="text-danger text-[10px] mt-1">{fieldErrors.assignedVehicleId}</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button type="button" onClick={() => setIsAddModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-text bg-surface hover:bg-background border border-border rounded-[6px] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!canAddDriver}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed rounded-[6px] transition-all">
              Onboard Driver
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Reassign vehicle modal ── */}
      {selectedDriverForAssign && (
        <Modal
          isOpen
          onClose={() => { setSelectedDriverForAssign(null); setAssignError(''); }}
          title={`Reassign — ${selectedDriverForAssign.name}`}
          subtitle={`DL: ${selectedDriverForAssign.licenceNumber}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleAssignSubmit} className="space-y-3.5 text-xs">
            {assignError && (
              <div className="p-2.5 rounded-[6px] bg-danger/10 border border-danger/25 text-danger font-medium leading-relaxed">
                {assignError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">Target Vehicle</label>
              <select
                value={targetVehicleId}
                onChange={e => { setTargetVehicleId(e.target.value); setAssignError(''); }}
                className="w-full px-3 py-2 bg-background border border-border rounded-[6px] text-text focus:border-primary outline-none font-mono font-semibold"
              >
                <option value="">Unassign (mark available)</option>
                {accessibleVehicles
                  .filter(v => v.vendorId === selectedDriverForAssign.vendorId)
                  .map(v => {
                    const effective  = getEffectiveVehicleStatus(v, documents);
                    const ineligible = effective.status === 'BLOCKED';
                    return (
                      <option key={v.id} value={v.id} disabled={ineligible}>
                        {v.registrationNumber} — {v.model}{ineligible ? ' ⚠ Not compliant' : ''}
                      </option>
                    );
                  })}
              </select>
            </div>

            {selectedDriverForAssign.assignedVehicleId && (
              <div className="p-2.5 bg-softgreen border border-primary/20 rounded-[6px] text-primary text-xs">
                Currently assigned to{' '}
                <strong className="font-mono">
                  {vehicles.find(v => v.id === selectedDriverForAssign.assignedVehicleId)?.registrationNumber}
                </strong>
                . Reassigning will detach the driver from their current vehicle.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button type="button" onClick={() => setSelectedDriverForAssign(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-text bg-surface hover:bg-background border border-border rounded-[6px] transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-secondary rounded-[6px] transition-all">
                Save Assignment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
