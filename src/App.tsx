import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  FileText,
  FolderOpen,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
  Zap
} from 'lucide-react';
import {
  getForgeCoreClient,
  loadReaderWorkspace,
  ReaderDocument,
  ReaderWorkspace,
  sendReaderMagicLink,
  signOutReader,
  uploadReaderDocument
} from './forgeCore';

const OWNER_EMAIL = 'rob.flagg1234@gmail.com';

function formatBytes(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function analysisLabel(document: ReaderDocument) {
  if (!document.analysis) return { label: 'Not queued', tone: 'muted' };
  switch (document.analysis.status) {
    case 'completed': return { label: 'Completed', tone: 'success' };
    case 'review': return { label: 'Needs review', tone: 'warning' };
    case 'processing': return { label: 'Processing', tone: 'info' };
    case 'failed': return { label: 'Failed', tone: 'danger' };
    default: return { label: 'Queued', tone: 'accent' };
  }
}

const StatusPill: React.FC<{ document: ReaderDocument }> = ({ document }) => {
  const status = analysisLabel(document);
  return <span className={`reader-pill reader-pill-${status.tone}`}>{status.label}</span>;
};

const AnalysisCell: React.FC<{ document: ReaderDocument }> = ({ document }) => {
  const data: any = document.analysis?.extractedData || {};
  const sections = Array.isArray(data.detected_sections) ? data.detected_sections.slice(0, 3) : [];
  const sheets = Array.isArray(data.sheet_numbers) ? data.sheet_numbers : [];
  return (
    <div className="min-w-[190px]">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusPill document={document} />
        {document.analysis?.pageCount ? <span className="text-[10px] reader-muted">{document.analysis.pageCount} pages</span> : null}
      </div>
      {sections.length > 0 && (
        <div className="text-[10px] reader-secondary mt-2 leading-4">
          {sections.map((section: any) => section.label).join(' • ')}
        </div>
      )}
      {sheets.length > 0 && <div className="text-[9px] reader-muted mt-1">Sheets: {sheets.slice(0, 5).join(', ')}{sheets.length > 5 ? '…' : ''}</div>}
      {document.analysis?.warnings?.length ? <div className="text-[9px] text-amber-300/80 mt-1">{document.analysis.warnings.length} warning{document.analysis.warnings.length === 1 ? '' : 's'}</div> : null}
    </div>
  );
};

const App: React.FC = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [workspace, setWorkspace] = useState<ReaderWorkspace>({ context: null, customers: [], projects: [], documents: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [documentType, setDocumentType] = useState('drawing_set');
  const [uploadTitle, setUploadTitle] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      setWorkspace(await loadReaderWorkspace());
    } catch (err: any) {
      setError(err?.message || 'Forge Reader could not load Core.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void refresh();
    void getForgeCoreClient().then(client => {
      const listener = client.auth.onAuthStateChange(() => window.setTimeout(() => void refresh(), 0));
      unsubscribe = () => listener?.data?.subscription?.unsubscribe?.();
    });
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    const project = workspace.projects.find(item => item.id === projectId);
    if (project?.customerId) setCustomerId(project.customerId);
  }, [projectId, workspace.projects]);

  const filteredDocuments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return workspace.documents;
    return workspace.documents.filter(document =>
      [document.title, document.filename, document.customerName, document.projectName, document.documentType]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(needle))
    );
  }, [workspace.documents, query]);

  const metrics = useMemo(() => ({
    documents: workspace.documents.length,
    queued: workspace.documents.filter(document => ['queued', 'processing'].includes(document.analysis?.status || '')).length,
    review: workspace.documents.filter(document => document.analysis?.status === 'review').length,
    completed: workspace.documents.filter(document => document.analysis?.status === 'completed').length
  }), [workspace.documents]);

  const sendLink = async () => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await sendReaderMagicLink(email);
      setMessage('Passwordless Forge sign-in link sent. Open it on this device.');
    } catch (err: any) {
      setError(err?.message || 'Could not send Forge sign-in link.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await signOutReader();
      setWorkspace({ context: null, customers: [], projects: [], documents: [] });
      setMessage('Signed out of Forge Core.');
    } catch (err: any) {
      setError(err?.message || 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  };

  const ingestFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await uploadReaderDocument(file, {
        projectId: projectId || undefined,
        customerId: customerId || undefined,
        documentType,
        title: uploadTitle || undefined
      });
      if (result.duplicate) {
        setMessage(`Duplicate detected. ${file.name} already exists in Forge Core, so Reader did not upload another copy.`);
      } else if (result.analysisStatus === 'completed') {
        setMessage(`${file.name} is stored in Forge Core and Reader completed a ${result.analysis?.pageCount || ''}-page deterministic text/signal analysis.`);
      } else if (result.analysisStatus === 'review') {
        setMessage(`${file.name} is safely stored. Reader found limited machine-readable text, so the document is flagged for review/vision analysis.`);
      } else {
        setMessage(`${file.name} is safely stored in Forge Core, but the deterministic analysis pass needs attention.`);
      }
      setUploadTitle('');
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Forge Reader could not ingest that PDF.');
    } finally {
      setBusy(false);
      setDragActive(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const connected = Boolean(workspace.context?.organizationId);

  return (
    <div className="min-h-screen reader-app">
      <aside className="reader-sidebar">
        <div className="px-5 pt-6 pb-5 border-b reader-border">
          <div className="flex items-center gap-3">
            <div className="reader-logo">F</div>
            <div>
              <div className="font-black tracking-[.18em] text-sm text-white">FORGE</div>
              <div className="text-[10px] uppercase tracking-[.2em] reader-muted">Reader</div>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 text-sm">
          <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-[.18em] reader-muted">Forge Suite</div>
          <a className="reader-nav" href="https://forge-crm-six.vercel.app"><span>CRM</span><ChevronRight size={14} /></a>
          <div className="reader-nav reader-nav-active"><span>Reader</span><span className="reader-dot" /></div>
          <a className="reader-nav" href="https://forge-scope.vercel.app"><span>Scope</span><ChevronRight size={14} /></a>
          <a className="reader-nav" href="https://lumber-estimator-ai.vercel.app"><span>Quote / AI Quoter</span><ChevronRight size={14} /></a>
        </nav>

        <div className="mt-auto p-4">
          <div className="reader-card p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white"><ShieldCheck size={15} className="reader-accent" /> Forge Core</div>
            <div className="text-[11px] reader-muted mt-2">{connected ? workspace.context?.organizationName : 'Not connected'}</div>
            <div className="text-[10px] reader-muted mt-1">{connected ? workspace.context?.locationName || 'Organization-wide' : 'Passwordless owner session'}</div>
          </div>
        </div>
      </aside>

      <main className="reader-main">
        <header className="reader-header">
          <div>
            <div className="text-[10px] uppercase tracking-[.22em] reader-accent font-black">Forge Reader</div>
            <h1 className="text-2xl font-black text-white mt-1">Document intake & understanding</h1>
            <p className="text-sm reader-secondary mt-1">Private drawings/PDF intake → structured analysis → Scope / Quoter.</p>
          </div>
          <div className="flex items-center gap-2">
            {connected && <button onClick={() => void refresh()} disabled={loading || busy} className="reader-button-secondary"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button>}
            {connected && <button onClick={() => void signOut()} disabled={busy} className="reader-button-secondary"><LogOut size={15} />Sign out</button>}
          </div>
        </header>

        <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
          {error && <div className="reader-alert reader-alert-danger">{error}</div>}
          {message && <div className="reader-alert reader-alert-success">{message}</div>}

          {!connected ? (
            <section className="reader-card-raised max-w-xl mx-auto mt-16 p-8">
              <div className="w-12 h-12 rounded-xl reader-accent-soft flex items-center justify-center reader-accent"><ShieldCheck size={24} /></div>
              <h2 className="text-xl font-black text-white mt-5">Connect Forge Reader to Core</h2>
              <p className="text-sm reader-secondary mt-2">Reader uses the same Forge identity and tenant as CRM. No Firebase, no separate account and no Great White Streams infrastructure.</p>
              {workspace.context && !workspace.context.organizationId ? (
                <div className="reader-alert reader-alert-warning mt-5">This Forge identity is signed in but does not have an active organization membership.</div>
              ) : (
                <div className="mt-6 space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-wider reader-muted">Forge owner email</label>
                  <input value={email} onChange={event => setEmail(event.target.value)} className="reader-input w-full" type="email" />
                  <button onClick={() => void sendLink()} disabled={busy || !email.trim()} className="reader-button-primary w-full justify-center">Send passwordless sign-in link</button>
                </div>
              )}
            </section>
          ) : (
            <>
              <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Metric label="Documents" value={metrics.documents} icon={<FileText size={18} />} />
                <Metric label="Queued / Processing" value={metrics.queued} icon={<Zap size={18} />} />
                <Metric label="Needs Review" value={metrics.review} icon={<FileSearch size={18} />} />
                <Metric label="Completed" value={metrics.completed} icon={<CheckCircle2 size={18} />} />
              </section>

              <section className="grid xl:grid-cols-[420px_minmax(0,1fr)] gap-6 items-start">
                <div className="reader-card-raised p-5 xl:sticky xl:top-24">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[.2em] reader-accent font-black">New intake</div>
                      <h2 className="text-lg font-black text-white mt-1">Add drawing / PDF</h2>
                    </div>
                    <UploadCloud className="reader-muted" size={22} />
                  </div>

                  <div className="grid gap-3 mt-5">
                    <label>
                      <span className="reader-label">Project</span>
                      <select value={projectId} onChange={event => setProjectId(event.target.value)} className="reader-input w-full">
                        <option value="">Unassigned / intake first</option>
                        {workspace.projects.map(project => <option key={project.id} value={project.id}>{project.name}{project.customerName ? ` — ${project.customerName}` : ''}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="reader-label">Customer</span>
                      <select value={customerId} onChange={event => setCustomerId(event.target.value)} className="reader-input w-full">
                        <option value="">Unassigned</option>
                        {workspace.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="reader-label">Document type</span>
                      <select value={documentType} onChange={event => setDocumentType(event.target.value)} className="reader-input w-full">
                        <option value="drawing_set">Drawing set / plans</option>
                        <option value="quote_pdf">Quote PDF</option>
                        <option value="truss_layout">Truss layout</option>
                        <option value="engineering">Engineering</option>
                        <option value="bom">BOM / material list</option>
                        <option value="specification">Specification</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <label>
                      <span className="reader-label">Title <span className="normal-case tracking-normal font-medium">(optional)</span></span>
                      <input value={uploadTitle} onChange={event => setUploadTitle(event.target.value)} className="reader-input w-full" placeholder="e.g. 60 Clarke Road Permit Drawings" />
                    </label>
                  </div>

                  <button
                    onDragEnter={event => { event.preventDefault(); setDragActive(true); }}
                    onDragOver={event => { event.preventDefault(); setDragActive(true); }}
                    onDragLeave={event => { event.preventDefault(); setDragActive(false); }}
                    onDrop={event => { event.preventDefault(); setDragActive(false); void ingestFile(event.dataTransfer.files?.[0]); }}
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className={`reader-dropzone ${dragActive ? 'reader-dropzone-active' : ''}`}
                    type="button"
                  >
                    {busy ? <RefreshCw size={28} className="animate-spin reader-accent" /> : <UploadCloud size={30} className="reader-accent" />}
                    <span className="font-black text-white mt-3">{busy ? 'Uploading & analyzing…' : 'Drop PDF here'}</span>
                    <span className="text-xs reader-muted mt-1">or click to choose a file</span>
                    <span className="text-[10px] reader-muted mt-3">SHA-256 dedupe • private tenant storage • deterministic PDF text/signals</span>
                  </button>
                  <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={event => void ingestFile(event.target.files?.[0])} />
                </div>

                <div className="reader-card-raised overflow-hidden min-w-0">
                  <div className="p-5 border-b reader-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[.2em] reader-muted font-black">Document inbox</div>
                      <h2 className="text-lg font-black text-white mt-1">Core documents</h2>
                    </div>
                    <div className="relative w-full md:w-80">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 reader-muted" />
                      <input value={query} onChange={event => setQuery(event.target.value)} className="reader-input w-full pl-9" placeholder="Search documents, project, customer…" />
                      {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 reader-muted hover:text-white"><X size={14} /></button>}
                    </div>
                  </div>

                  {loading ? (
                    <div className="p-14 text-center reader-muted"><RefreshCw className="animate-spin mx-auto mb-3" />Loading Forge Core…</div>
                  ) : filteredDocuments.length === 0 ? (
                    <div className="p-14 text-center">
                      <Archive size={34} className="reader-muted mx-auto" />
                      <div className="text-sm font-bold text-white mt-3">No Reader documents yet</div>
                      <div className="text-xs reader-muted mt-1">Upload the first drawing set to create a Core document and analysis run.</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1050px] text-left">
                        <thead>
                          <tr className="reader-table-head">
                            <th>Document</th>
                            <th>Customer / Project</th>
                            <th>Type</th>
                            <th>Analysis evidence</th>
                            <th>Size</th>
                            <th>Added</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDocuments.map(document => (
                            <tr key={document.id} className="reader-table-row">
                              <td>
                                <div className="flex gap-3 items-start">
                                  <div className="w-9 h-9 shrink-0 rounded-lg reader-accent-soft reader-accent grid place-items-center"><FileText size={17} /></div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-white truncate max-w-[320px]" title={document.title}>{document.title}</div>
                                    <div className="text-[10px] reader-muted truncate max-w-[320px]" title={document.filename}>{document.filename}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="text-xs font-semibold text-white">{document.customerName || 'Unassigned customer'}</div>
                                <div className="text-[10px] reader-muted mt-1 flex items-center gap-1"><FolderOpen size={11} />{document.projectName || 'Intake / no project'}</div>
                              </td>
                              <td><span className="text-xs reader-secondary">{document.documentType.replaceAll('_', ' ')}</span></td>
                              <td><AnalysisCell document={document} /></td>
                              <td className="text-xs reader-secondary">{formatBytes(document.fileSizeBytes)}</td>
                              <td className="text-xs reader-secondary">{formatDate(document.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              <section className="reader-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-black text-white">Reader analysis v1 is live</div>
                  <div className="text-[11px] reader-muted mt-1">Machine-readable PDFs now produce bounded page text, sheet numbers, scales, detected plans/elevations/sections/schedules and issue signals in Core. Low-text/scanned sets are deliberately flagged for the vision/OCR worker instead of being guessed.</div>
                </div>
                <div className="reader-pill reader-pill-accent whitespace-nowrap">Vision + Scope handoff next</div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="reader-card p-4 flex items-center justify-between gap-4">
    <div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-[.14em] reader-muted font-black mt-1">{label}</div>
    </div>
    <div className="w-10 h-10 rounded-xl reader-accent-soft reader-accent grid place-items-center">{icon}</div>
  </div>
);

export default App;
