import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import ManagerSelector from './ManagerSelector';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS, ROLES, getEligibleManagers, getDescendantIds } from '../../utils/hierarchy';
import { GitBranch, Shield, Info, AlertTriangle } from 'lucide-react';

export default function MoveProfileModal({ isOpen, onClose, vendor, initialMode = 'parent' }) {
  const { vendors, accessibleVendorIds, moveVendorProfile, changeVendorRole } = useApp();

  const [activeTab, setActiveTab]     = useState(initialMode);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [selectedRole, setSelectedRole]         = useState('');
  const [errorBanner, setErrorBanner]           = useState('');

  useEffect(() => {
    if (vendor) {
      setSelectedParentId(vendor.parentId || '');
      setSelectedRole(vendor.role || ROLES.GROUP_VENDOR);
      setErrorBanner('');
      setActiveTab(initialMode || 'parent');
    }
  }, [vendor, initialMode]);

  if (!vendor) return null;

  const currentParent  = vendors.find(v => v.id === vendor.parentId);
  const targetParent   = vendors.find(v => v.id === selectedParentId);

  // Descendants for subtree impact preview
  const descendantIds     = getDescendantIds(vendor.id, vendors);
  const descendantVendors = vendors.filter(v => descendantIds.includes(v.id));
  const subVendorsCount   = descendantVendors.filter(v => v.role === 'SUB_VENDOR').length;
  const associatesCount   = descendantVendors.filter(v => v.role === 'DEPLOYMENT_ASSOCIATE').length;

  // Eligible managers: role-valid candidates, further filtered to current user's accessible scope
  const eligibleManagers = getEligibleManagers(vendor, vendors).filter(m =>
    accessibleVendorIds.includes(m.id)
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleMoveParent = (e) => {
    e.preventDefault();
    setErrorBanner('');

    if (!selectedParentId) {
      setErrorBanner('Please select a manager.');
      return;
    }
    if (selectedParentId === vendor.parentId) {
      setErrorBanner('Please select a different manager than the current parent.');
      return;
    }

    // Scope guard: selected manager must be in accessible set
    if (!accessibleVendorIds.includes(selectedParentId)) {
      setErrorBanner('Access denied — the selected manager is outside your managed hierarchy.');
      return;
    }

    const result = moveVendorProfile(vendor.id, selectedParentId);
    if (result.success) onClose();
    else setErrorBanner(result.reason || 'Failed to move vendor.');
  };

  const handleUpdateRole = (e) => {
    e.preventDefault();
    setErrorBanner('');

    if (selectedRole === vendor.role) {
      setErrorBanner('Please select a different role than the current role.');
      return;
    }

    const result = changeVendorRole(vendor.id, selectedRole);
    if (result.success) onClose();
    else setErrorBanner(result.reason || 'Failed to change role.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Move Profile — ${vendor.name}`}
      subtitle={ROLE_LABELS[vendor.role] || vendor.role}
      maxWidth="max-w-lg"
    >
      {/* ── Tab switcher ── */}
      <div className="flex p-1 bg-background rounded-[6px] border border-border mb-4">
        {[
          { id: 'parent', icon: GitBranch, label: 'Change Parent' },
          { id: 'role',   icon: Shield,    label: 'Change Role'   },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setActiveTab(id); setErrorBanner(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold
                        rounded-[4px] transition-all ${
                          activeTab === id
                            ? 'bg-surface text-primary shadow-xs font-bold'
                            : 'text-muted hover:text-text'
                        }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Error banner ── */}
      {errorBanner && (
        <div className="mb-4 p-3 rounded-[6px] bg-danger/10 border border-danger/25
                        flex items-start gap-2 text-xs text-danger">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Operation Restricted</p>
            <p className="mt-0.5 leading-relaxed">{errorBanner}</p>
          </div>
        </div>
      )}

      {/* ── CHANGE PARENT ── */}
      {activeTab === 'parent' && (
        <form onSubmit={handleMoveParent} className="space-y-4 select-none">

          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
              Current Manager
            </label>
            <div className="p-2.5 bg-background border border-border rounded-[6px] text-xs font-semibold text-text">
              {currentParent
                ? `${currentParent.name} — ${ROLE_LABELS[currentParent.role] || currentParent.role}`
                : 'Root (Super Vendor)'}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
              New Manager
            </label>
            <ManagerSelector
              managers={eligibleManagers}
              value={selectedParentId}
              onChange={setSelectedParentId}
              placeholder="Search eligible managers..."
            />
            {eligibleManagers.length === 0 && (
              <p className="mt-1 text-[11px] text-warning">
                No eligible managers within your accessible scope for this vendor's role.
              </p>
            )}
          </div>

          {/* Subtree impact notice */}
          {descendantIds.length > 0 && (
            <div className="p-2.5 bg-accent/5 border border-accent/20 rounded-[6px]
                            flex items-start gap-2 text-xs text-accent">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                All sub-vendors and deployment associates under this vendor will move with it.
              </p>
            </div>
          )}

          {/* Relationship preview */}
          <div className="p-3 bg-background border border-border rounded-[6px]">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-2">
              Relationship Preview
            </span>
            <div className="font-mono text-[11px] leading-loose">
              <div className="text-primary font-bold">
                {targetParent ? targetParent.name : '(Select a manager above)'}
              </div>
              <div className="text-muted pl-4">↓</div>
              <div className="font-bold pl-4 text-text">{vendor.name}</div>
              {subVendorsCount > 0 && (
                <>
                  <div className="text-muted pl-8">↓</div>
                  <div className="text-muted pl-8 text-[10px]">
                    {subVendorsCount} Sub Vendor{subVendorsCount !== 1 ? 's' : ''}
                  </div>
                </>
              )}
              {associatesCount > 0 && (
                <>
                  <div className="text-muted pl-12">↓</div>
                  <div className="text-muted pl-12 text-[10px]">
                    {associatesCount} Deployment Associate{associatesCount !== 1 ? 's' : ''}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-text bg-surface hover:bg-background
                         border border-border rounded-[6px] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedParentId || selectedParentId === vendor.parentId}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90
                         disabled:opacity-40 disabled:cursor-not-allowed rounded-[6px] shadow-xs transition-all"
            >
              Move Profile
            </button>
          </div>
        </form>
      )}

      {/* ── CHANGE ROLE ── */}
      {activeTab === 'role' && (
        <form onSubmit={handleUpdateRole} className="space-y-4 select-none">

          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
              Current Role
            </label>
            <div className="p-2.5 bg-background border border-border rounded-[6px] text-xs font-semibold text-text">
              {ROLE_LABELS[vendor.role] || vendor.role}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
              New Role
            </label>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-[6px] text-xs
                         text-text focus:border-primary outline-none font-medium"
            >
              {Object.values(ROLES)
                .filter(roleKey => roleKey !== ROLES.SUPER_VENDOR)
                .map(roleKey => (
                  <option key={roleKey} value={roleKey}>{ROLE_LABELS[roleKey] || roleKey}</option>
                ))}
            </select>
          </div>

          <div className="p-2.5 bg-background border border-border rounded-[6px] text-xs text-muted leading-relaxed">
            Role modification validates reporting hierarchy constraints and existing subordinate
            child vendor compatibility.
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-text bg-surface hover:bg-background
                         border border-border rounded-[6px] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedRole === vendor.role}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90
                         disabled:opacity-40 disabled:cursor-not-allowed rounded-[6px] shadow-xs transition-all"
            >
              Update Role
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
