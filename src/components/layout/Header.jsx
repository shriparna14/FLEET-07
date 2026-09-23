import React from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, ShieldCheck, ChevronDown } from 'lucide-react';
import { ROLE_LABELS } from '../../utils/hierarchy';
import { getDocumentStatus, getEffectiveVehicleStatus } from '../../utils/compliance';

export default function Header({ activeTab }) {
  const { documents, vehicles, vendors, currentUserId, setCurrentUserId, currentUser, accessibleVendorIds } = useApp();

  const scopedVehicles   = vehicles.filter(v => accessibleVendorIds.includes(v.vendorId));
  const scopedVehicleIds = scopedVehicles.map(v => v.id);
  const scopedDocs       = documents.filter(d => scopedVehicleIds.includes(d.entityId));

  const blockedCount     = scopedVehicles.filter(v => getEffectiveVehicleStatus(v, documents).status === 'BLOCKED').length;
  const expiredDocsCount = scopedDocs.filter(d => getDocumentStatus(d.expiryDate) === 'EXPIRED').length;
  const alertCount       = blockedCount + expiredDocsCount;

  const tabTitles = {
    overview:   { title: 'OVERVIEW',    desc: 'Fleet operations at a glance' },
    hierarchy:  { title: 'HIERARCHY',   desc: 'Vendor network / access structure' },
    vehicles:   { title: 'VEHICLES',    desc: 'Fleet registry & operating status' },
    drivers:    { title: 'DRIVERS',     desc: 'Workforce registry & vehicle assignment' },
    compliance: { title: 'COMPLIANCE',  desc: 'Document verification & fleet eligibility' },
  };

  const { title, desc } = tabTitles[activeTab] || tabTitles.overview;

  return (
    <header className="h-14 bg-surface border-b border-border px-5 flex items-center justify-between sticky top-0 z-30 select-none">

      {/* Page title */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-bold text-xs tracking-widest text-text uppercase">{title}</span>
        <span className="text-border text-xs hidden sm:inline">/</span>
        <span className="text-[11px] text-muted font-medium hidden sm:block truncate">{desc}</span>
      </div>

      {/* Right — alert indicator + VIEW AS */}
      <div className="flex items-center gap-2.5">

        {/* Alert badge */}
        <div
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border text-[11px] font-mono font-semibold ${
            alertCount > 0
              ? 'bg-danger/10 border-danger/30 text-danger'
              : 'bg-success/10 border-success/30 text-success'
          }`}
        >
          {alertCount > 0 ? (
            <>
              <AlertTriangle className="w-3 h-3" />
              {alertCount} ISSUE{alertCount !== 1 ? 'S' : ''}
            </>
          ) : (
            <>
              <ShieldCheck className="w-3 h-3" />
              COMPLIANT
            </>
          )}
        </div>

        {/* VIEW AS — demo role switcher for testing permissions */}
        <div className="flex items-center gap-1.5 pl-2.5 pr-2 py-1 bg-softgreen border border-primary/20 rounded-[6px]">
          <span className="text-[9px] font-mono font-bold text-primary tracking-widest uppercase shrink-0">
            VIEW AS
          </span>
          <div className="relative flex items-center">
            <select
              value={currentUserId}
              onChange={e => setCurrentUserId(e.target.value)}
              className="appearance-none bg-transparent font-semibold text-[11px] text-primary focus:outline-none cursor-pointer pr-4"
              title="Switch demo user to test role-based access & permissions"
            >
              {vendors.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({ROLE_LABELS[v.role] || v.role})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-primary absolute right-0 pointer-events-none" />
          </div>
        </div>

      </div>
    </header>
  );
}
