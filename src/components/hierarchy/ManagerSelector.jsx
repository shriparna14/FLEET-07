import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { ROLE_LABELS } from '../../utils/hierarchy';

/**
 * ManagerSelector — reusable searchable dropdown for picking a manager.
 *
 * Props:
 *   managers    {Array}    - pre-filtered list of eligible manager objects
 *   value       {string}   - currently selected manager ID
 *   onChange    {Function} - called with the selected manager ID
 *   placeholder {string}   - placeholder text when nothing is selected
 */
export default function ManagerSelector({
  managers = [],
  value = '',
  onChange,
  placeholder = 'Search eligible managers...',
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = managers.find(m => m.id === value);

  // Filter by name, email, or phone
  const filtered = managers.filter(m => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.email  || '').toLowerCase().includes(q) ||
      (m.phone  || '').toLowerCase().includes(q)
    );
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (manager) => {
    onChange(manager.id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 bg-background border border-border
                   rounded-[6px] text-xs text-left focus:border-primary outline-none transition-colors
                   hover:border-primary/60"
      >
        {selected ? (
          <div className="min-w-0">
            <span className="font-semibold text-text block truncate">{selected.name}</span>
            <span className="text-[10px] text-muted block truncate">
              {ROLE_LABELS[selected.role] || selected.role}
              {selected.email ? ` · ${selected.email}` : ''}
            </span>
          </div>
        ) : (
          <span className="text-muted">{placeholder}</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-muted shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-[6px] shadow-lg overflow-hidden animate-fade-in">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-3 h-3 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, email or phone..."
                autoFocus
                className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-background border border-border
                           rounded-[4px] focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>

          {/* Results list */}
          <div className="max-h-52 overflow-y-auto">
            {managers.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted text-center">
                No eligible managers available for this role.
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted text-center">
                No results for "{query}".
              </p>
            ) : filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelect(m)}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-softgreen
                            transition-colors border-b border-border/40 last:border-0 ${
                              m.id === value ? 'bg-primary/5' : ''
                            }`}
              >
                {/* Role badge */}
                <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-[3px]
                                  bg-primary/10 text-primary text-[9px] font-bold shrink-0">
                  {(ROLE_LABELS[m.role] || m.role).slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-text truncate">{m.name}</div>
                  <div className="text-[10px] text-muted truncate">
                    {ROLE_LABELS[m.role] || m.role}
                    {m.email ? ` · ${m.email}` : ''}
                  </div>
                </div>
                {m.id === value && (
                  <span className="ml-auto text-primary text-[10px] font-bold shrink-0 mt-0.5">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
