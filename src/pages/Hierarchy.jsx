import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ROLES, ROLE_LABELS, buildHierarchyTree } from '../utils/hierarchy';
import HierarchyTree from '../components/hierarchy/HierarchyTree';
import MoveProfileModal from '../components/hierarchy/MoveProfileModal';
import VendorDrawer from '../components/hierarchy/VendorDrawer';
import Modal from '../components/common/Modal';
import { Search, Plus } from 'lucide-react';

export default function Hierarchy() {
  const { vendors, vehicles, drivers, addVendor, accessibleVendorIds } = useApp();

  // Only expose vendors within the current user's hierarchy scope
  const scopedVendors = vendors.filter(v => accessibleVendorIds.includes(v.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('vertical');

  // Drawer state
  const [selectedVendorForDrawer, setSelectedVendorForDrawer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('details');

  // Move Modal state
  const [selectedVendorForMove, setSelectedVendorForMove] = useState(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveModalMode, setMoveModalMode] = useState('parent');

  // Add Vendor Modal states
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({
    name: '', email: '', phone: '', role: 'GROUP_VENDOR', parentId: '',
  });
  const [formError, setFormError] = useState('');

  const treeData = useMemo(() => buildHierarchyTree(scopedVendors, vehicles, drivers), [scopedVendors, vehicles, drivers]);

  const handleOpenDrawer = (vendor, mode = 'details') => {
    setSelectedVendorForDrawer(vendor);
    setDrawerMode(mode);
    setIsDrawerOpen(true);
  };

  const handleOpenMoveModal = (vendor, mode = 'parent') => {
    setSelectedVendorForMove(vendor);
    setMoveModalMode(mode);
    setIsMoveModalOpen(true);
  };

  // Eligible managers for the Add Vendor form — updates when role changes
  const addVendorEligibleManagers = useMemo(() => {
    const allowed = {
      [ROLES.SITE_ADMIN]:           [ROLES.SUPER_VENDOR],
      [ROLES.GROUP_VENDOR]:         [ROLES.SITE_ADMIN],
      [ROLES.SUB_VENDOR]:           [ROLES.GROUP_VENDOR],
      [ROLES.DEPLOYMENT_ASSOCIATE]: [ROLES.SUB_VENDOR],
    }[newVendorForm.role] || [];
    // Filter to accessible scope only
    return scopedVendors.filter(v => allowed.includes(v.role));
  }, [scopedVendors, newVendorForm.role]);

  const handleCreateVendor = (e) => {
    e.preventDefault();
    setFormError('');
    if (!newVendorForm.name.trim()) { setFormError('Vendor name is required.'); return; }
    if (!newVendorForm.parentId)    { setFormError('Please select a manager to report to.'); return; }

    const result = addVendor(newVendorForm);
    if (result.success) {
      setIsAddVendorOpen(false);
      setNewVendorForm({ name: '', email: '', phone: '', role: 'GROUP_VENDOR', parentId: '' });
    } else {
      setFormError(result.reason || 'Failed to create vendor.');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in select-none">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-lg font-bold text-text">Hierarchy</h1>
          <p className="text-xs text-muted mt-0.5">
            Vendor network · reporting relationships · access structure
          </p>
        </div>
        <button
          onClick={() => { setFormError(''); setIsAddVendorOpen(true); }}
          disabled={addVendorEligibleManagers.length === 0}
          title={addVendorEligibleManagers.length === 0 ? 'No eligible managers in your accessible scope' : 'Add a new vendor'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed rounded-[6px] transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Vendor
        </button>
      </div>

      {/* ── Control toolbar ── */}
      <div className="p-2.5 bg-surface border border-border rounded-[6px] flex flex-col lg:flex-row items-center justify-between gap-2.5">
        {/* Search */}
        <div className="w-full lg:w-72 relative">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-[6px]
                       focus:border-primary focus:outline-none transition-all text-text placeholder:text-muted"
          />
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider shrink-0">Role</span>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-background border border-border rounded-[6px]
                       focus:border-primary focus:outline-none font-medium text-text"
          >
            <option value="ALL">All roles</option>
            {Object.values(ROLES).map((rKey) => (
              <option key={rKey} value={rKey}>{ROLE_LABELS[rKey] || rKey}</option>
            ))}
          </select>
        </div>

        {/* View mode toggle — no zoom controls */}
        <div className="flex items-center gap-2 w-full lg:w-auto lg:justify-end">
          <div className="flex p-0.5 bg-background border border-border rounded-[6px]">
            <button
              onClick={() => setViewMode('vertical')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-[4px] transition-all ${
                viewMode === 'vertical' ? 'bg-surface text-primary font-bold' : 'text-muted hover:text-text'
              }`}
            >
              Tree
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-[4px] transition-all ${
                viewMode === 'compact' ? 'bg-surface text-primary font-bold' : 'text-muted hover:text-text'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* ── Hierarchy canvas — horizontal scroll, no transform/scale ── */}
      <div className="bg-surface border border-border rounded-[6px] overflow-x-auto min-h-[520px]">
        <HierarchyTree
          treeData={treeData}
          vendors={scopedVendors}
          onSelectVendor={handleOpenDrawer}
          onMoveProfile={handleOpenMoveModal}
          searchQuery={searchQuery}
          selectedRoleFilter={selectedRoleFilter}
          viewMode={viewMode}
        />
      </div>

      {/* ── Vendor detail / access drawer ── */}
      <VendorDrawer
        vendor={selectedVendorForDrawer}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onMoveProfile={handleOpenMoveModal}
        initialMode={drawerMode}
      />

      {/* ── Move Profile / Change Role modal ── */}
      <MoveProfileModal
        isOpen={isMoveModalOpen}
        onClose={() => { setIsMoveModalOpen(false); setSelectedVendorForMove(null); }}
        vendor={selectedVendorForMove}
        initialMode={moveModalMode}
      />

      {/* ── Add Vendor modal ── */}
      <Modal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        title="Add Vendor"
        subtitle="Onboard a new vendor profile into the reporting structure."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateVendor} className="space-y-3.5 text-xs">
          {formError && (
            <div className="p-2.5 rounded-[6px] bg-danger/10 border border-danger/25 text-danger font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
              Vendor Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Punjab Fleet"
              value={newVendorForm.name}
              onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px]
                         text-text focus:border-primary outline-none font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                placeholder="fleet@domain.in"
                value={newVendorForm.email}
                onChange={(e) => setNewVendorForm({ ...newVendorForm, email: e.target.value })}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px]
                           text-text focus:border-primary outline-none font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">Phone</label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={newVendorForm.phone}
                onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px]
                           text-text focus:border-primary outline-none font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
              Role *
            </label>
            <select
              value={newVendorForm.role}
              onChange={(e) => setNewVendorForm({ ...newVendorForm, role: e.target.value, parentId: '' })}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px]
                         text-text focus:border-primary outline-none font-medium"
            >
              <option value={ROLES.SITE_ADMIN}>Site Admin</option>
              <option value={ROLES.GROUP_VENDOR}>Group Vendor</option>
              <option value={ROLES.SUB_VENDOR}>Sub Vendor</option>
              <option value={ROLES.DEPLOYMENT_ASSOCIATE}>Deployment Associate</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
              Reports To *
            </label>
            <select
              required
              value={newVendorForm.parentId}
              onChange={(e) => setNewVendorForm({ ...newVendorForm, parentId: e.target.value })}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px]
                         text-text focus:border-primary outline-none font-medium"
            >
              <option value="">Select eligible manager…</option>
              {addVendorEligibleManagers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({ROLE_LABELS[m.role] || m.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsAddVendorOpen(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-text bg-surface hover:bg-background border border-border rounded-[6px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newVendorForm.name || !newVendorForm.parentId}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-secondary
                         disabled:opacity-40 disabled:cursor-not-allowed rounded-[6px] transition-all"
            >
              Create Vendor
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
