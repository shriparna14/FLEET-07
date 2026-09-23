import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getDocumentStatus, isVehicleCompliant, getEffectiveVehicleStatus } from '../utils/compliance';
import { PERMISSIONS } from '../utils/permissions';
import Modal from '../components/common/Modal';
import { AlertTriangle, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

export default function Compliance() {
  const {
    vehicles, documents, drivers,
    renewDocument, updateVehicleStatus,
    verifyDocument, rejectDocument,
    hasPermission, accessibleVendorIds,
  } = useApp();

  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  const scopedVehicles   = vehicles.filter(v => accessibleVendorIds.includes(v.vendorId));
  const scopedDrivers    = drivers.filter(d => accessibleVendorIds.includes(d.vendorId));
  const scopedVehicleIds = scopedVehicles.map(v => v.id);
  const scopedDriverIds  = scopedDrivers.map(d => d.id);

  // Scope documents to only what the current user's vendors own.
  // Splitting by entityType prevents driver docs from other vendors leaking in.
  const scopedDocuments = documents.filter(d => {
    if (d.entityType === 'VEHICLE') return scopedVehicleIds.includes(d.entityId);
    if (d.entityType === 'DRIVER')  return scopedDriverIds.includes(d.entityId);
    return false;
  });

  const validDocs    = scopedDocuments.filter(d => getDocumentStatus(d.expiryDate) === 'VALID').length;
  const expiringDocs = scopedDocuments.filter(d => getDocumentStatus(d.expiryDate) === 'EXPIRING').length;
  const expiredDocs  = scopedDocuments.filter(d => getDocumentStatus(d.expiryDate) === 'EXPIRED').length;

  const pendingVerif  = scopedDocuments.filter(d => d.verificationStatus === 'PENDING').length;
  const verifiedCount = scopedDocuments.filter(d => d.verificationStatus === 'VERIFIED').length;
  const rejectedCount = scopedDocuments.filter(d => d.verificationStatus === 'REJECTED').length;

  // Blocked count using getEffectiveVehicleStatus (consistent with compliance rule)
  const nonCompliantCount = scopedVehicles.filter(v =>
    getEffectiveVehicleStatus(v, documents).status === 'BLOCKED'
  ).length;

  // Check verify permission based on document type:
  //   vehicle documents → DOCUMENT_VERIFICATION
  //   driver DL         → DRIVER_VERIFICATION
  const canVerifyDoc = (doc) => {
    if (!doc) return false;
    const permission = doc.entityType === 'DRIVER'
      ? PERMISSIONS.DRIVER_VERIFICATION
      : PERMISSIONS.DOCUMENT_VERIFICATION;
    return hasPermission(permission);
  };

  const getDocForVehicle = (vehId, docType) => {
    const doc = documents.find(
      d => d.entityId === vehId && d.docType === docType
    );
    if (!doc) return { doc: null, status: 'MISSING' };
    return { doc, status: getDocumentStatus(doc.expiryDate) };
  };

  const handleRenewOneYear = (docId) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    renewDocument(docId, d.toISOString().split('T')[0]);
  };

  const VerifBadge = ({ status }) => {
    const cfg = {
      VERIFIED: { cls: 'text-success bg-success/10 border-success/20', label: 'Verified' },
      PENDING:  { cls: 'text-warning bg-warning/10 border-warning/20', label: 'Pending' },
      REJECTED: { cls: 'text-danger  bg-danger/10  border-danger/20',  label: 'Rejected' },
    }[status] || { cls: 'text-muted bg-muted/10 border-border', label: '—' };

    return (
      <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-[3px] border ${cfg.cls}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in select-none">

      {/* ── Page header ── */}
      <div className="pb-3 border-b border-border">
        <h1 className="text-lg font-bold text-text">Compliance</h1>
        <p className="text-xs text-muted mt-0.5">
          Document verification · expiry tracking · fleet eligibility
        </p>
      </div>

      {/* ── Expiring notice banner ── */}
      {expiringDocs > 0 && (
        <div className="p-2.5 bg-warning/10 border border-warning/25 rounded-[6px] flex items-center gap-2 text-xs text-text">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span>
            <strong className="font-semibold">{expiringDocs} document{expiringDocs > 1 ? 's' : ''}</strong>
            {' '}expire within 30 days — renew before the deadline to avoid blocking.
          </span>
        </div>
      )}

      {/* ── Summary row — two sections side by side ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Document Validity */}
        <div className="bg-surface border border-border rounded-[6px] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-background/50">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Document Validity</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-border">
            {[
              { label: 'Valid',           value: validDocs,         color: 'text-success' },
              { label: 'Expiring',        value: expiringDocs,      color: 'text-warning' },
              { label: 'Expired',         value: expiredDocs,       color: 'text-danger'  },
              { label: 'Non-compliant',   value: nonCompliantCount, color: 'text-danger'  },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-4 py-3">
                <p className="text-[11px] font-semibold text-muted">{label}</p>
                <p className={`text-xl font-bold font-mono mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Document Verification */}
        <div className="bg-surface border border-border rounded-[6px] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-background/50">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Document Verification</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { label: 'Pending',  value: pendingVerif,  color: pendingVerif  > 0 ? 'text-warning' : 'text-text' },
              { label: 'Verified', value: verifiedCount, color: 'text-success' },
              { label: 'Rejected', value: rejectedCount, color: rejectedCount > 0 ? 'text-danger' : 'text-text'  },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-4 py-3">
                <p className="text-[11px] font-semibold text-muted">{label}</p>
                <p className={`text-xl font-bold font-mono mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pending verifications quick list ── */}
      {pendingVerif > 0 && (
        <div className="bg-surface border border-border rounded-[6px] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-background/50">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Pending Verifications
            </span>
          </div>
          <div className="divide-y divide-border/60">
            {scopedDocuments.filter(d => d.verificationStatus === 'PENDING').map(doc => {
              const validity = getDocumentStatus(doc.expiryDate);
              const validityCls = {
                VALID:   'text-success',
                EXPIRING:'text-warning',
                EXPIRED: 'text-danger',
              }[validity] || 'text-muted';

              // Figure out entity label (vehicle reg or driver name)
              const vehicle = doc.entityType === 'VEHICLE'
                ? scopedVehicles.find(v => v.id === doc.entityId)
                : null;
              const driver = doc.entityType === 'DRIVER'
                ? scopedDrivers.find(d => d.id === doc.entityId)
                : null;
              const entityLabel = vehicle
                ? vehicle.registrationNumber
                : driver
                ? `${driver.name} (Driver)`
                : doc.entityId;

              return (
                <div key={doc.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text">{doc.docName}</p>
                    <p className="text-[10px] text-muted font-mono">
                      {entityLabel}
                      {doc.expiryDate ? ` · Expires ${doc.expiryDate}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-mono text-[10px] font-semibold ${validityCls}`}>{validity}</span>
                    {canVerifyDoc(doc) ? (
                      <>
                        <button
                          onClick={() => verifyDocument(doc.id)}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-success bg-success/10 hover:bg-success/20 border border-success/25 rounded-[4px] transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Verify
                        </button>
                        <button
                          onClick={() => rejectDocument(doc.id, 'Document not approved')}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-danger bg-danger/10 hover:bg-danger/20 border border-danger/25 rounded-[4px] transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-muted">No permission</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Fleet Compliance Matrix ── */}
      <div className="bg-surface border border-border rounded-[6px] overflow-x-auto">
        <div className="px-4 py-2.5 border-b border-border bg-background/50 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
            Fleet Compliance Matrix
          </span>
          <span className="text-[11px] text-muted">Click a row to review or renew documents</span>
        </div>

        <table className="w-full text-left border-collapse min-w-[750px]">
          <thead>
            <tr className="border-b border-border bg-background/50 text-[11px] font-semibold text-muted uppercase tracking-wider">
              <th className="py-2.5 px-4">Vehicle</th>
              <th className="py-2.5 px-4 text-center">RC</th>
              <th className="py-2.5 px-4 text-center">Insurance</th>
              <th className="py-2.5 px-4 text-center">Permit</th>
              <th className="py-2.5 px-4 text-center">Pollution</th>
              <th className="py-2.5 px-4 text-center">Eligibility</th>
              <th className="py-2.5 px-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {scopedVehicles.map(veh => {
              const rc  = getDocForVehicle(veh.id, 'RC');
              const ins = getDocForVehicle(veh.id, 'INSURANCE');
              const prm = getDocForVehicle(veh.id, 'PERMIT');
              const puc = getDocForVehicle(veh.id, 'POLLUTION');

              const effective     = getEffectiveVehicleStatus(veh, documents);
              const isOperational = effective.status !== 'BLOCKED';

              const docBadge = (info) => {
                const cfg = {
                  VALID:   { cls: 'text-success',  label: '● Valid'    },
                  EXPIRING:{ cls: 'text-warning',  label: '● Expiring' },
                  EXPIRED: { cls: 'text-danger',   label: '● Expired'  },
                  MISSING: { cls: 'text-muted',    label: '● Missing'  },
                }[info.status] || { cls: 'text-muted', label: '● —' };
                return <span className={`font-semibold text-[11px] font-mono ${cfg.cls}`}>{cfg.label}</span>;
              };

              return (
                <tr
                  key={veh.id}
                  onClick={() => setSelectedVehicleId(veh.id)}
                  className="hover:bg-background/70 transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-4">
                    <span className="font-mono font-semibold text-text">{veh.registrationNumber}</span>
                    <span className="text-muted text-[11px] block">{veh.model}</span>
                  </td>
                  <td className="py-2.5 px-4 text-center">{docBadge(rc)}</td>
                  <td className="py-2.5 px-4 text-center">{docBadge(ins)}</td>
                  <td className="py-2.5 px-4 text-center">{docBadge(prm)}</td>
                  <td className="py-2.5 px-4 text-center">{docBadge(puc)}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold font-mono ${
                      isOperational ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    }`}>
                      {isOperational ? 'OPERATIONAL' : 'NON-COMPLIANT'}
                    </span>
                    {isOperational && effective.isExpiring && (
                      <span className="block text-[9px] text-warning mt-0.5">⚠ expiring soon</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedVehicleId(veh.id); }}
                      className="px-2 py-1 text-xs font-semibold text-text bg-background hover:bg-softgreen border border-border rounded-[4px] transition-colors"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Document review modal ── */}
      {selectedVehicleId && (() => {
        const liveVehicle    = scopedVehicles.find(v => v.id === selectedVehicleId);
        if (!liveVehicle) return null;
        const effective      = getEffectiveVehicleStatus(liveVehicle, documents);
        const isNowBlocked   = effective.status === 'BLOCKED';
        const isNowCompliant = isVehicleCompliant(liveVehicle.id, documents);

        return (
          <Modal
            isOpen
            onClose={() => setSelectedVehicleId(null)}
            title={`Compliance — ${liveVehicle.registrationNumber}`}
            subtitle={`${liveVehicle.model} · ${liveVehicle.fuelType} · ${liveVehicle.seatingCapacity} seats`}
            maxWidth="max-w-lg"
          >
            <div className="space-y-4 text-xs">

              {isNowBlocked && (
                <div className="p-3 bg-danger/10 border border-danger/25 rounded-[6px] text-danger flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Vehicle blocked from operations</p>
                    {effective.reason && (
                      <p className="mt-0.5 text-[11px] leading-relaxed">{effective.reason}</p>
                    )}
                    <p className="mt-0.5 text-[11px] leading-relaxed">
                      Renew all expired documents, then use Activate to restore this vehicle.
                    </p>
                  </div>
                </div>
              )}

              {isNowBlocked && isNowCompliant && (
                <div className="p-2.5 bg-success/10 border border-success/25 rounded-[6px] text-success text-[11px] font-medium">
                  ✓ All documents are valid — this vehicle can now be activated.
                </div>
              )}

              {!isNowBlocked && !isNowCompliant && (
                <div className="p-2.5 bg-warning/10 border border-warning/25 rounded-[6px] text-warning text-[11px] font-medium">
                  ⚠ This vehicle has expired documents. Driver assignment is blocked until renewed.
                </div>
              )}

              {/* Document list */}
              <div>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                  Required Documents
                </p>
                <div className="border border-border rounded-[6px] divide-y divide-border">
                  {['RC', 'INSURANCE', 'PERMIT', 'POLLUTION'].map(docType => {
                    const info = getDocForVehicle(liveVehicle.id, docType);
                    const validityStatusCls = {
                      VALID:   'text-success bg-success/10',
                      EXPIRING:'text-warning bg-warning/10',
                      EXPIRED: 'text-danger  bg-danger/10',
                      MISSING: 'text-muted   bg-muted/10',
                    }[info.status] || 'text-muted bg-muted/10';

                    const verifStatus = info.doc?.verificationStatus || null;

                    return (
                      <div key={docType} className="px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-text">{docType}</p>
                            <p className="text-[10px] text-muted font-mono mt-0.5">
                              {info.doc ? `Expires ${info.doc.expiryDate}` : 'Not on file'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {/* Validity badge */}
                            <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-[3px] ${validityStatusCls}`}>
                              {info.status}
                            </span>
                            {/* Verification badge */}
                            {verifStatus && <VerifBadge status={verifStatus} />}
                          </div>
                        </div>

                        {/* Action row */}
                        {info.doc && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <button
                              onClick={() => handleRenewOneYear(info.doc.id)}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-primary bg-surface hover:bg-softgreen border border-border rounded-[4px] transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Renew 1yr
                            </button>
                            {canVerifyDoc(info.doc) && verifStatus !== 'VERIFIED' && (
                              <button
                                onClick={() => verifyDocument(info.doc.id)}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-success bg-success/10 hover:bg-success/20 border border-success/25 rounded-[4px] transition-colors"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Verify
                              </button>
                            )}
                            {canVerifyDoc(info.doc) && verifStatus === 'PENDING' && (
                              <button
                                onClick={() => rejectDocument(info.doc.id, 'Document not approved')}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-danger bg-danger/10 hover:bg-danger/20 border border-danger/25 rounded-[4px] transition-colors"
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                {isNowBlocked ? (
                  <button
                    onClick={() => { updateVehicleStatus(liveVehicle.id, 'ACTIVE'); setSelectedVehicleId(null); }}
                    disabled={!isNowCompliant}
                    className="px-4 py-2 text-xs font-semibold text-white bg-success hover:bg-secondary
                               disabled:opacity-40 disabled:cursor-not-allowed rounded-[6px] transition-colors"
                    title={!isNowCompliant ? 'Renew expired documents first' : 'Activate vehicle'}
                  >
                    Activate Vehicle
                  </button>
                ) : (
                  <button
                    onClick={() => { updateVehicleStatus(liveVehicle.id, 'BLOCKED'); setSelectedVehicleId(null); }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-danger hover:bg-danger/90 rounded-[6px] transition-colors"
                  >
                    Block Vehicle
                  </button>
                )}
                <button
                  onClick={() => setSelectedVehicleId(null)}
                  className="px-4 py-2 text-xs font-semibold text-text bg-surface hover:bg-background border border-border rounded-[6px]"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
