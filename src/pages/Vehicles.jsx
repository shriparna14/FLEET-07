import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getDocumentStatus, getEffectiveVehicleStatus } from '../utils/compliance';
import { PERMISSIONS } from '../utils/permissions';
import AddVehicleModal from '../components/vehicles/AddVehicleModal';
import VehicleDetailsDrawer from '../components/vehicles/VehicleDetailsDrawer';
import { Search, Plus, Lock } from 'lucide-react';

export default function Vehicles() {
  const {
    vehicles, vendors, drivers, documents,
    addVehicle, updateVehicleStatus,
    hasPermission, accessibleVendorIds,
  } = useApp();

  const accessibleVendors  = vendors.filter(v => accessibleVendorIds.includes(v.id));
  const accessibleVehicles = vehicles.filter(v => accessibleVendorIds.includes(v.vendorId));

  const [searchTerm,    setSearchTerm]    = useState('');
  const [statusFilter,  setStatusFilter]  = useState('ALL');
  const [vendorFilter,  setVendorFilter]  = useState('ALL');
  const [isAddOpen,     setIsAddOpen]     = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const canAddVehicle = hasPermission(PERMISSIONS.VEHICLE_ONBOARDING);

  const filteredVehicles = accessibleVehicles.filter(v => {
    const q = searchTerm.trim().toLowerCase();
    const vendor = vendors.find(vn => vn.id === v.vendorId);

    const matchesSearch =
      !q ||
      v.registrationNumber.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      (vendor && vendor.name.toLowerCase().includes(q));

    let matchesStatus = true;
    if (statusFilter === 'EXPIRING') {
      const vehDocs = documents.filter(d => d.entityId === v.id || d.vehicleId === v.id);
      matchesStatus = vehDocs.some(d => getDocumentStatus(d.expiryDate) === 'EXPIRING');
    } else if (statusFilter !== 'ALL') {
      // Use effective status so expired-doc vehicles show as BLOCKED even if
      // their stored status hasn't been updated yet.
      matchesStatus = getEffectiveVehicleStatus(v, documents).status === statusFilter;
    }

    const matchesVendor = vendorFilter === 'ALL' || v.vendorId === vendorFilter;
    return matchesSearch && matchesStatus && matchesVendor;
  });

  const clearFilters = () => { setSearchTerm(''); setStatusFilter('ALL'); setVendorFilter('ALL'); };

  return (
    <div className="space-y-4 animate-fade-in select-none">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-lg font-bold text-text">Vehicles</h1>
          <p className="text-xs text-muted mt-0.5">Fleet registry · operating eligibility · driver allocations</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-colors self-start sm:self-auto ${
            canAddVehicle
              ? 'text-white bg-primary hover:bg-primary/90'
              : 'text-muted bg-background border border-border cursor-not-allowed'
          }`}
          title={!canAddVehicle ? 'Vehicle onboarding permission restricted' : 'Add new vehicle'}
        >
          {canAddVehicle ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          Add Vehicle
        </button>
      </div>

      {/* Filter bar */}
      <div className="p-2.5 bg-surface rounded-[6px] border border-border flex flex-col lg:flex-row items-center justify-between gap-2.5">
        <div className="w-full lg:w-72 relative">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search registration, model, vendor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-[6px]
                       focus:border-primary focus:outline-none text-text font-mono placeholder:font-sans placeholder:text-muted"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select
            value={vendorFilter}
            onChange={e => setVendorFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-background border border-border rounded-[6px] focus:border-primary outline-none font-medium text-text"
          >
            <option value="ALL">All vendors</option>
            {accessibleVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-background border border-border rounded-[6px] focus:border-primary outline-none font-medium text-text"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="BLOCKED">Blocked</option>
            <option value="EXPIRING">Expiring docs</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Vehicle table */}
      <div className="bg-surface rounded-[6px] border border-border overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-border bg-background/50 text-[11px] font-semibold text-muted uppercase tracking-wider">
              <th className="py-2.5 px-4">Registration</th>
              <th className="py-2.5 px-4">Model</th>
              <th className="py-2.5 px-4">Vendor</th>
              <th className="py-2.5 px-4">Driver</th>
              <th className="py-2.5 px-4 text-center">Status</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <p className="font-semibold text-text">No vehicles found</p>
                  <p className="text-[11px] text-muted mt-1">No vehicles match your current search or filters.</p>
                  <button
                    onClick={clearFilters}
                    className="mt-3 px-3 py-1 text-xs font-semibold text-primary bg-background hover:bg-surface border border-border rounded-[4px] transition-colors"
                  >
                    Clear filters
                  </button>
                </td>
              </tr>
            ) : filteredVehicles.map(veh => {
              const vendor = vendors.find(v => v.id === veh.vendorId);
              const driver = drivers.find(d => d.assignedVehicleId === veh.id);
              const effective = getEffectiveVehicleStatus(veh, documents);
              const statusCls =
                effective.status === 'ACTIVE'   ? 'bg-success/15 text-success' :
                effective.status === 'BLOCKED'  ? 'bg-danger/15  text-danger'  :
                                                   'bg-muted/15   text-muted';
              return (
                <tr
                  key={veh.id}
                  onClick={() => setSelectedVehicle(veh)}
                  className="hover:bg-background/80 transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-4 font-mono font-bold text-text">{veh.registrationNumber}</td>
                  <td className="py-2.5 px-4 font-medium text-text">
                    {veh.model}
                    <span className="text-[10px] text-muted font-mono ml-1.5">
                      ({veh.fuelType} · {veh.seatingCapacity} seats)
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-text">{vendor?.name || 'Unknown'}</td>
                  <td className="py-2.5 px-4 font-mono text-muted">
                    {driver
                      ? <span className="text-text font-medium">{driver.name}</span>
                      : <span className="text-muted/60">— Unassigned</span>
                    }
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${statusCls}`}>
                      ● {effective.status}
                    </span>
                    {effective.isExpiring && (
                      <span className="block text-[9px] text-warning mt-0.5">expiring soon</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedVehicle(veh); }}
                      className="px-2 py-1 text-xs font-semibold text-text bg-background hover:bg-surface border border-border rounded-[4px] transition-colors"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add vehicle modal */}
      {canAddVehicle && (
        <AddVehicleModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          accessibleVendors={accessibleVendors}
          addVehicle={addVehicle}
          vehicles={vehicles}
        />
      )}

      {/* Vehicle detail drawer */}
      {selectedVehicle && (
        <VehicleDetailsDrawer
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          vehicles={vehicles}
          vendors={vendors}
          drivers={drivers}
          documents={documents}
          updateVehicleStatus={updateVehicleStatus}
        />
      )}
    </div>
  );
}
