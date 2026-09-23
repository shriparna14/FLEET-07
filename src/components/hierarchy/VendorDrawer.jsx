import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS } from '../../utils/hierarchy';
import { getEffectiveVehicleStatus } from '../../utils/compliance';
import { X, Car, Users, Edit3, Move, Check, AlertCircle, Lock } from 'lucide-react';

export default function VendorDrawer({ vendor, isOpen, onClose, onMoveProfile, initialMode = 'details' }) {
  const { vendors, vehicles, drivers, documents, updateDelegation, currentUser } = useApp();
  const [isEditingAccess, setIsEditingAccess] = useState(false);
  const [permissionsState, setPermissionsState] = useState({});

  useEffect(() => {
    if (vendor && isOpen) {
      setPermissionsState(vendor.permissions || {});
      setIsEditingAccess(initialMode === 'access');
    }
  }, [vendor, initialMode, isOpen]);

  if (!isOpen || !vendor) return null;

  // Authorization: can current user edit this vendor's access?
  // Rule: Super Vendor → always; others → only their direct child
  const canEditAccess =
    currentUser?.role === 'SUPER_VENDOR' ||
    vendor.parentId === currentUser?.id;

  // Compute metrics
  const vendorVehicles = vehicles.filter(v => v.vendorId === vendor.id);
  const vendorDrivers = drivers.filter(d => d.vendorId === vendor.id);
  const manager = vendors.find(v => v.id === vendor.parentId);

  const blockedVehicles   = vendorVehicles.filter(v => getEffectiveVehicleStatus(v, documents).status === 'BLOCKED').length;
  const compliantVehicles = vendorVehicles.length - blockedVehicles;

  const currentPermissions = isEditingAccess ? permissionsState : (vendor.permissions || {});

  const togglePermission = (key) => {
    setPermissionsState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSavePermissions = () => {
    updateDelegation(vendor.id, permissionsState);
    setIsEditingAccess(false);
  };

  const permissionItems = [
    { key: 'vehicle.onboarding', label: 'Vehicle onboarding' },
    { key: 'vehicle.assignment', label: 'Vehicle assignment' },
    { key: 'driver.onboarding', label: 'Driver onboarding' },
    { key: 'driver.verification', label: 'Driver verification' },
    { key: 'document.verification', label: 'Document verification' },
    { key: 'compliance.tracking', label: 'Compliance tracking' },
    { key: 'booking.management', label: 'Booking management' },
    { key: 'payments', label: 'Payments' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop — dark green-tinted */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{ backgroundColor: 'rgba(7, 63, 56, 0.45)' }}
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface border-l border-border shadow-md flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-border flex items-start justify-between bg-background">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                  {ROLE_LABELS[vendor.role] || vendor.role}
                </span>
              </div>
              <h2 className="text-base font-bold text-text mt-1">{vendor.name}</h2>
              <p className="text-xs text-muted font-mono">{vendor.email || 'No email registered'}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-muted hover:text-primary hover:bg-softgreen border border-transparent hover:border-primary/20 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-background border border-border rounded-[6px]">
                <div className="flex items-center gap-1.5 text-muted text-xs font-medium">
                  <Car className="w-3.5 h-3.5 text-primary" />
                  <span>Fleet Cabs</span>
                </div>
                <div className="text-lg font-bold text-text mt-1 font-mono">{vendorVehicles.length}</div>
              </div>
              <div className="p-3 bg-background border border-border rounded-[6px]">
                <div className="flex items-center gap-1.5 text-muted text-xs font-medium">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Allocated Drivers</span>
                </div>
                <div className="text-lg font-bold text-text mt-1 font-mono">{vendorDrivers.length}</div>
              </div>
            </div>

            {/* Manager Info */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Reporting Manager</span>
              <div className="p-2.5 bg-background border border-border rounded-[6px] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-text">
                    {manager ? manager.name : 'Root (Super Vendor)'}
                  </div>
                  <div className="text-[10px] text-muted font-mono">
                    {manager ? (ROLE_LABELS[manager.role] || manager.role) : 'Top Level Authority'}
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Summary */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Compliance</span>
              <div className="p-2.5 bg-background border border-border rounded-[6px] space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-success">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>{compliantVehicles} Valid Vehicles</span>
                  </span>
                  <span className="font-semibold text-[10px]">● OPERATIONAL</span>
                </div>
                {blockedVehicles > 0 && (
                  <div className="flex items-center justify-between text-danger pt-1.5 border-t border-border">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{blockedVehicles} Blocked Vehicles</span>
                    </span>
                    <span className="font-semibold text-[10px]">● ACTION REQUIRED</span>
                  </div>
                )}
              </div>
            </div>

            {/* ACCESS & DELEGATION MATRIX */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Access & Delegation
                </span>
                {!isEditingAccess ? (
                  canEditAccess ? (
                    <button
                      onClick={() => { setPermissionsState(vendor.permissions || {}); setIsEditingAccess(true); }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit Access
                    </button>
                  ) : (
                    <span
                      className="text-xs font-semibold text-muted flex items-center gap-1 cursor-default"
                      title="Only the direct manager or Super Vendor can change this vendor's permissions."
                    >
                      <Lock className="w-3 h-3" />
                      Edit Access
                    </span>
                  )
                ) : (
                  <button
                    onClick={handleSavePermissions}
                    className="text-xs font-semibold text-success hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Save
                  </button>
                )}
              </div>

              <div className="p-3 bg-background border border-border rounded-[6px] space-y-2.5">
                {permissionItems.map((item) => {
                  const isOn = currentPermissions[item.key] === true;

                  return (
                    <div key={item.key} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                      <span className="font-medium text-text">{item.label}</span>
                      {isEditingAccess ? (
                        <button
                          onClick={() => togglePermission(item.key)}
                          className={`px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold transition-colors ${
                            isOn
                              ? 'bg-success/15 text-success border border-success/30'
                              : 'bg-muted/15 text-muted border border-border'
                          }`}
                        >
                          {isOn ? 'ON' : 'OFF'}
                        </button>
                      ) : (
                        <span className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded-[4px] ${
                          isOn
                            ? 'text-success bg-success/10'
                            : 'text-muted bg-border/40'
                        }`}
                        >
                          {isOn ? 'ON' : 'OFF'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 bg-background border-t border-border flex items-center gap-2.5">
            {vendor.role !== 'SUPER_VENDOR' && (
              <button
                onClick={() => {
                  onClose();
                  if (onMoveProfile) onMoveProfile(vendor, 'parent');
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-[6px] transition-colors shadow-xs"
              >
                <Move className="w-3.5 h-3.5" />
                <span>Move Profile</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text bg-surface hover:bg-background border border-border rounded-[6px] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
