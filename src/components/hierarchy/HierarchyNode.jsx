import React, { useState, useRef, useEffect } from 'react';
import { ROLE_LABELS } from '../../utils/hierarchy';
import { MoreVertical, ChevronDown, ChevronRight, Eye, Move, Shield, KeyRound } from 'lucide-react';

export default function HierarchyNode({
  node,
  managerName,
  onSelectVendor,
  onMoveProfile,
  isExpanded,
  onToggleExpand,
  isHighlighted = false,
  isMuted = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const roleLabel = ROLE_LABELS[node.role] || node.role;
  const hasChildren = node.children && node.children.length > 0;

  // 2-letter role abbreviation
  const roleCode = {
    SUPER_VENDOR:          'SV',
    SITE_ADMIN:            'SA',
    GROUP_VENDOR:          'GV',
    SUB_VENDOR:            'SB',
    DEPLOYMENT_ASSOCIATE:  'DA',
  }[node.role] || 'VN';

  /**
   * Role badge styling — MoveInSync green palette tints.
   * Each level gets a progressively lighter green/teal tint so the hierarchy
   * levels are visually distinct at a glance.
   */
  const getRoleBadge = (role) => {
    switch (role) {
      case 'SUPER_VENDOR':
        // Darkest — authority level: rich primary teal
        return 'text-white bg-primary border-primary';
      case 'SITE_ADMIN':
        // Deep secondary green
        return 'text-white bg-secondary border-secondary';
      case 'GROUP_VENDOR':
        // Mid teal with pale tint bg
        return 'text-primary bg-softgreen border-primary/30';
      case 'SUB_VENDOR':
        // Accent green
        return 'text-dark bg-accent/20 border-accent/40';
      case 'DEPLOYMENT_ASSOCIATE':
        // Muted — leaf node
        return 'text-muted bg-background border-border';
      default:
        return 'text-muted bg-background border-border';
    }
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      className={`relative inline-flex flex-col rounded-[6px] border text-left w-64 select-none bg-surface transition-all ${
        isHighlighted
          ? 'border-primary ring-2 ring-primary/25 shadow-sm'
          : 'border-border hover:border-primary/40'
      } ${isMuted ? 'opacity-30' : 'opacity-100'}`}
    >
      <div className="p-3">

        {/* ── Header row: role badge + 3-dot menu ── */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-[3px] border ${getRoleBadge(node.role)}`}
            >
              {roleCode}
            </span>
            <span className="text-[10px] font-mono font-semibold text-muted uppercase tracking-wider">
              {roleLabel}
            </span>
          </div>

          {/* Three-dot context menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded hover:bg-background text-muted hover:text-text transition-colors"
              title="Actions"
              aria-label="Node actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-[6px] shadow-md z-40 py-1 text-xs">
                <button
                  onClick={() => { setMenuOpen(false); onSelectVendor?.(node, 'details'); }}
                  className="w-full px-3 py-1.5 text-left text-text hover:bg-softgreen flex items-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5 text-muted" />
                  <span>View Vendor</span>
                </button>

                {node.role !== 'SUPER_VENDOR' && (
                  <>
                    <button
                      onClick={() => { setMenuOpen(false); onMoveProfile?.(node, 'parent'); }}
                      className="w-full px-3 py-1.5 text-left text-text hover:bg-softgreen flex items-center gap-2"
                    >
                      <Move className="w-3.5 h-3.5 text-muted" />
                      <span>Move Profile</span>
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onMoveProfile?.(node, 'role'); }}
                      className="w-full px-3 py-1.5 text-left text-text hover:bg-softgreen flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5 text-muted" />
                      <span>Change Role</span>
                    </button>
                  </>
                )}

                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => { setMenuOpen(false); onSelectVendor?.(node, 'access'); }}
                  className="w-full px-3 py-1.5 text-left text-text hover:bg-softgreen flex items-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5 text-muted" />
                  <span>Edit Access</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Vendor name ── */}
        <h4
          onClick={() => onSelectVendor?.(node, 'details')}
          className="text-xs font-bold text-text truncate cursor-pointer hover:text-primary transition-colors"
          title={node.name}
        >
          {node.name}
        </h4>

        {/* ── Fleet/driver counts ── */}
        <p className="mt-1 text-[11px] font-mono text-muted">
          <span className="text-text font-semibold">{node.totalVehicleCount || 0}</span> vehicles
          {' · '}
          <span className="text-text font-semibold">{node.totalDriverCount || 0}</span> drivers
        </p>

        {/* ── Manager + expand/collapse ── */}
        <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[10px]">
          <div className="truncate text-muted min-w-0 pr-1">
            <span className="font-mono uppercase tracking-wider text-[9px] text-muted/70">Manager</span>{' '}
            <span className="text-text font-medium">{managerName}</span>
          </div>

          {hasChildren && (
            <button
              onClick={() => onToggleExpand?.(node.id)}
              className="flex items-center gap-1 font-mono text-muted hover:text-primary px-1.5 py-0.5 rounded bg-background border border-border transition-colors shrink-0"
              title={isExpanded ? 'Collapse branch' : 'Expand branch'}
            >
              <span className="text-[10px]">{node.children.length}</span>
              {isExpanded
                ? <ChevronDown className="w-3 h-3" />
                : <ChevronRight className="w-3 h-3" />
              }
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
