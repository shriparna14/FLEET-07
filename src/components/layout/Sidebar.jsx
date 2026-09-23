import React from 'react';
import { LayoutDashboard, GitFork, Car, Users, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROLE_LABELS } from '../../utils/hierarchy';
import { getDocumentStatus, getEffectiveVehicleStatus } from '../../utils/compliance';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { documents, vehicles, currentUser, accessibleVendorIds } = useApp();

  // Use live getDocumentStatus — not stored status field
  const scopedVehicles   = vehicles.filter(v => accessibleVendorIds.includes(v.vendorId));
  const scopedVehicleIds = scopedVehicles.map(v => v.id);
  const scopedDocs       = documents.filter(d => scopedVehicleIds.includes(d.entityId));

  const expiredDocsCount     = scopedDocs.filter(d => getDocumentStatus(d.expiryDate) === 'EXPIRED').length;
  const blockedVehiclesCount = scopedVehicles.filter(v => getEffectiveVehicleStatus(v, documents).status === 'BLOCKED').length;
  const totalAlerts          = expiredDocsCount + blockedVehiclesCount;

  const navItems = [
    { id: 'overview',   num: '01', label: 'Overview',   icon: LayoutDashboard },
    { id: 'hierarchy',  num: '02', label: 'Hierarchy',  icon: GitFork },
    { id: 'vehicles',   num: '03', label: 'Vehicles',   icon: Car,        badge: scopedVehicles.length.toString() },
    { id: 'drivers',    num: '04', label: 'Drivers',    icon: Users },
    { id: 'compliance', num: '05', label: 'Compliance', icon: ShieldCheck, alertCount: totalAlerts },
  ];

  return (
    <aside
      className="w-56 flex flex-col shrink-0 min-h-screen select-none border-r"
      style={{
        backgroundColor: '#073F38',
        borderColor:     '#0A5248',
      }}
    >
      {/* ── Brand ── */}
      <div
        className="h-16 px-5 flex items-center gap-3 border-b"
        style={{ borderColor: '#0A5248' }}
      >
        {/* MoveInSync-style icon mark — green circle with car */}
        <div
          className="w-7 h-7 rounded-[5px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#0B6B5E', border: '1px solid #1A8070' }}
        >
          <Car className="w-3.5 h-3.5" style={{ color: '#8DBB5A' }} />
        </div>
        <div>
          <p className="font-mono font-bold text-sm tracking-wider leading-none" style={{ color: '#E8F2EE' }}>
            FLEET/07
          </p>
          <p className="text-[9px] font-mono tracking-widest mt-0.5" style={{ color: '#6AADA0' }}>
            VENDOR OPERATIONS
          </p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <p
          className="px-3 pb-2 text-[9px] font-mono font-bold tracking-widest uppercase"
          style={{ color: '#4D8A7F' }}
        >
          OPERATIONS
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-[5px] text-xs font-medium transition-all relative"
              style={{
                backgroundColor: isActive ? '#0B6B5E' : 'transparent',
                color:           isActive ? '#FFFFFF' : '#9ABFB8',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#0A5248';
                  e.currentTarget.style.color = '#D4EDE8';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#9ABFB8';
                }
              }}
            >
              {/* Active left-edge indicator — accent green */}
              {isActive && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
                  style={{ backgroundColor: '#8DBB5A' }}
                />
              )}

              <div className="flex items-center gap-2.5 pl-1">
                <span
                  className="text-[10px] font-mono tracking-tight w-5"
                  style={{ color: isActive ? '#8DBB5A' : '#4D8A7F' }}
                >
                  {item.num}
                </span>
                <Icon
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: isActive ? '#FFFFFF' : '#6AADA0' }}
                />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1">
                {item.badge && (
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded-[3px]"
                    style={{ backgroundColor: '#0A5248', color: '#6AADA0' }}
                  >
                    {item.badge}
                  </span>
                )}
                {item.alertCount > 0 && (
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded-[3px] font-bold"
                    style={{ backgroundColor: '#C84D4D', color: '#FFFFFF' }}
                  >
                    {item.alertCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* ── Active Session Footer ── */}
      <div
        className="p-3 border-t"
        style={{ backgroundColor: '#052E29', borderColor: '#0A5248' }}
      >
        <p
          className="px-2 py-1 text-[9px] font-mono font-bold tracking-widest uppercase"
          style={{ color: '#4D8A7F' }}
        >
          ACTIVE SESSION
        </p>
        <div className="px-2 py-1.5 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-bold truncate" style={{ color: '#E8F2EE' }}>
              {currentUser?.name || 'Super Vendor'}
            </p>
            <p className="text-[10px] font-mono truncate" style={{ color: '#6AADA0' }}>
              {ROLE_LABELS[currentUser?.role] || currentUser?.role || 'Super Vendor'}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0" title="System Online">
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ backgroundColor: '#8DBB5A' }}
            />
            <span className="text-[10px] font-mono" style={{ color: '#8DBB5A' }}>
              LIVE
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
