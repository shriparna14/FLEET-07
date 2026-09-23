import React, { useState, useEffect, useMemo, useRef } from 'react';
import HierarchyNode from './HierarchyNode';
import { ROLE_LABELS, getDescendantIds } from '../../utils/hierarchy';
import { MoreVertical, Eye, Move, Shield, KeyRound } from 'lucide-react';

// ── Vertical (tree) view ──────────────────────────────────────────────────────

function TreeNodeVertical({
  node, vendors, onSelectVendor, onMoveProfile,
  expandedMap, onToggleExpand,
  matchedIds, ancestorIds, isSearching, selectedRoleFilter,
}) {
  const isExpanded    = expandedMap[node.id] !== false;
  const hasChildren   = node.children && node.children.length > 0;
  const isMatched     = matchedIds.has(node.id);
  const isAncestor    = ancestorIds.has(node.id);
  const isRelevant    = !isSearching || isMatched || isAncestor;
  const matchesRole   = !selectedRoleFilter || selectedRoleFilter === 'ALL' || node.role === selectedRoleFilter;
  const isSingleChild = hasChildren && node.children.length === 1;

  const manager    = vendors.find(v => v.id === node.parentId);
  const managerName = manager ? manager.name : node.role === 'SUPER_VENDOR' ? 'Top Authority' : 'Root';

  return (
    <div className="flex flex-col items-center">
      <div className={`transition-opacity duration-150 ${matchesRole && isRelevant ? 'opacity-100' : 'opacity-20'}`}>
        <HierarchyNode
          node={node} managerName={managerName}
          onSelectVendor={onSelectVendor} onMoveProfile={onMoveProfile}
          isExpanded={isExpanded} onToggleExpand={onToggleExpand}
          isHighlighted={isMatched} isMuted={isSearching && !isRelevant}
        />
      </div>

      {hasChildren && isExpanded && (
        <>
          <div className="w-px h-6 bg-border shrink-0" />
          <div className={`flex items-start gap-6 relative ${isSingleChild ? '' : 'border-t border-border'}`}>
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {!isSingleChild && <div className="w-px bg-border" style={{ height: '24px' }} />}
                {isSingleChild  && <div className="w-px h-6 bg-border" />}
                <TreeNodeVertical
                  node={child} vendors={vendors}
                  onSelectVendor={onSelectVendor} onMoveProfile={onMoveProfile}
                  expandedMap={expandedMap} onToggleExpand={onToggleExpand}
                  matchedIds={matchedIds} ancestorIds={ancestorIds}
                  isSearching={isSearching} selectedRoleFilter={selectedRoleFilter}
                />
              </div>
            ))}
            {!isSingleChild && (
              <>
                <div className="absolute top-0 left-0 h-px bg-surface" style={{ width: '128px' }} />
                <div className="absolute top-0 right-0 h-px bg-surface" style={{ width: '128px' }} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Compact (list) view ───────────────────────────────────────────────────────

/**
 * CompactNodeMenu — three-dot context menu for compact list rows.
 * Replaces the old inline View / Move buttons.
 */
function CompactNodeMenu({ node, onSelectVendor, onMoveProfile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1 rounded text-muted hover:text-text hover:bg-softgreen transition-colors"
        title="Actions" aria-label="Node actions"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-[6px] shadow-md z-40 py-1 text-xs">
          <button
            onClick={() => { setOpen(false); onSelectVendor?.(node, 'details'); }}
            className="w-full px-3 py-1.5 text-left text-text hover:bg-softgreen flex items-center gap-2"
          >
            <Eye className="w-3.5 h-3.5 text-muted" />
            <span>View Vendor</span>
          </button>

          {node.role !== 'SUPER_VENDOR' && (
            <>
              <button
                onClick={() => { setOpen(false); onMoveProfile?.(node, 'parent'); }}
                className="w-full px-3 py-1.5 text-left text-text hover:bg-softgreen flex items-center gap-2"
              >
                <Move className="w-3.5 h-3.5 text-muted" />
                <span>Move Profile</span>
              </button>
              <button
                onClick={() => { setOpen(false); onMoveProfile?.(node, 'role'); }}
                className="w-full px-3 py-1.5 text-left text-text hover:bg-softgreen flex items-center gap-2"
              >
                <Shield className="w-3.5 h-3.5 text-muted" />
                <span>Change Role</span>
              </button>
            </>
          )}

          <div className="my-1 border-t border-border" />
          <button
            onClick={() => { setOpen(false); onSelectVendor?.(node, 'access'); }}
            className="w-full px-3 py-1.5 text-left text-text hover:bg-softgreen flex items-center gap-2"
          >
            <KeyRound className="w-3.5 h-3.5 text-muted" />
            <span>Edit Access</span>
          </button>
        </div>
      )}
    </div>
  );
}

function TreeNodeCompact({
  node, vendors, depth = 0,
  onSelectVendor, onMoveProfile,
  matchedIds, ancestorIds, isSearching, selectedRoleFilter,
}) {
  const isMatched   = matchedIds.has(node.id);
  const isAncestor  = ancestorIds.has(node.id);
  const isRelevant  = !isSearching || isMatched || isAncestor;
  const matchesRole = !selectedRoleFilter || selectedRoleFilter === 'ALL' || node.role === selectedRoleFilter;

  const manager    = vendors.find(v => v.id === node.parentId);
  const managerName = manager ? manager.name : 'Root';

  return (
    <div className="select-none">
      <div
        className={`flex items-center justify-between px-3 py-2.5 border-b border-border transition-all ${
          isMatched ? 'bg-softgreen border-l-2 border-l-primary' : 'hover:bg-background/60'
        } ${matchesRole && isRelevant ? 'opacity-100' : 'opacity-20'}`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {/* Left: avatar + name + role badge */}
        <div
          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
          onClick={() => onSelectVendor?.(node, 'details')}
        >
          {/* Indentation connector line */}
          {depth > 0 && (
            <span
              className="shrink-0 text-border text-xs font-mono"
              style={{ marginLeft: `${(depth - 1) * 4}px` }}
            >
              └
            </span>
          )}

          {/* 2-letter avatar */}
          <div className="w-6 h-6 rounded-[4px] bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 font-mono">
            {node.name.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs text-text truncate">{node.name}</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-softgreen border border-primary/20 text-primary uppercase tracking-wider shrink-0">
                {ROLE_LABELS[node.role] || node.role}
              </span>
            </div>
            <p className="text-[11px] text-muted truncate">
              {managerName}
              {' · '}
              <span className="font-mono">{node.totalVehicleCount || 0}</span> veh
              {' · '}
              <span className="font-mono">{node.totalDriverCount || 0}</span> drv
            </p>
          </div>
        </div>

        {/* Right: 3-dot menu only — no inline buttons */}
        <CompactNodeMenu node={node} onSelectVendor={onSelectVendor} onMoveProfile={onMoveProfile} />
      </div>

      {node.children?.map(child => (
        <TreeNodeCompact
          key={child.id}
          node={child} vendors={vendors}
          depth={depth + 1}
          onSelectVendor={onSelectVendor} onMoveProfile={onMoveProfile}
          matchedIds={matchedIds} ancestorIds={ancestorIds}
          isSearching={isSearching} selectedRoleFilter={selectedRoleFilter}
        />
      ))}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function HierarchyTree({
  treeData, vendors = [],
  onSelectVendor, onMoveProfile,
  searchQuery = '', selectedRoleFilter = 'ALL', viewMode = 'vertical',
}) {
  const [expandedMap, setExpandedMap] = useState({});

  const { matchedIds, ancestorIds, isSearching } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { matchedIds: new Set(), ancestorIds: new Set(), isSearching: false };

    const matches  = new Set();
    const ancestors = new Set();

    vendors.forEach(v => {
      const hit =
        v.name.toLowerCase().includes(q) ||
        (v.email && v.email.toLowerCase().includes(q)) ||
        (v.phone && v.phone.includes(q));

      if (hit) {
        matches.add(v.id);
        let curr = v;
        while (curr?.parentId) {
          ancestors.add(curr.parentId);
          curr = vendors.find(p => p.id === curr.parentId);
        }
      }
    });

    return { matchedIds: matches, ancestorIds: ancestors, isSearching: true };
  }, [searchQuery, vendors]);

  // Auto-expand ancestor branches when searching
  useEffect(() => {
    if (isSearching) {
      const next = { ...expandedMap };
      ancestorIds.forEach(id => { next[id] = true; });
      matchedIds.forEach(id  => { next[id] = true; });
      setExpandedMap(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching, ancestorIds, matchedIds]);

  const handleToggleExpand = (nodeId) => {
    setExpandedMap(prev => ({ ...prev, [nodeId]: prev[nodeId] === false ? true : false }));
  };

  if (!treeData?.length) {
    return (
      <div className="p-12 text-center text-muted text-xs">
        No hierarchy nodes found.
      </div>
    );
  }

  if (viewMode === 'compact') {
    return (
      <div className="divide-y divide-border">
        {treeData.map(rootNode => (
          <TreeNodeCompact
            key={rootNode.id}
            node={rootNode} vendors={vendors}
            onSelectVendor={onSelectVendor} onMoveProfile={onMoveProfile}
            matchedIds={matchedIds} ancestorIds={ancestorIds}
            isSearching={isSearching} selectedRoleFilter={selectedRoleFilter}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 flex justify-center overflow-x-auto min-w-full">
      {treeData.map(rootNode => (
        <TreeNodeVertical
          key={rootNode.id}
          node={rootNode} vendors={vendors}
          onSelectVendor={onSelectVendor} onMoveProfile={onMoveProfile}
          expandedMap={expandedMap} onToggleExpand={handleToggleExpand}
          matchedIds={matchedIds} ancestorIds={ancestorIds}
          isSearching={isSearching} selectedRoleFilter={selectedRoleFilter}
        />
      ))}
    </div>
  );
}
