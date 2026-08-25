from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()
old = '''        <nav className="p-3 space-y-1 text-sm">
          <a className="reader-nav" href="https://forge-crm-six.vercel.app"><span>CRM</span><ChevronRight size={14} /></a>
          <a className="reader-nav" href="https://forge-scope.vercel.app"><span>Scope</span><ChevronRight size={14} /></a>
          <div className="reader-nav reader-nav-active"><span>Reader</span><span className="reader-dot" /></div>
          <div className="reader-nav reader-nav-disabled"><span>Quote / AI Quoter</span><span className="text-[9px] uppercase">Next</span></div>
          <div className="reader-nav reader-nav-disabled"><span>Operations</span><span className="text-[9px] uppercase">Later</span></div>
        </nav>'''
new = '''        <nav className="p-3 space-y-1 text-sm">
          <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-[.18em] reader-muted">Forge Suite</div>
          <a className="reader-nav" href="https://forge-crm-six.vercel.app"><span>CRM</span><ChevronRight size={14} /></a>
          <div className="reader-nav reader-nav-active"><span>Reader</span><span className="reader-dot" /></div>
          <a className="reader-nav" href="https://forge-scope.vercel.app"><span>Scope</span><ChevronRight size={14} /></a>
          <div className="reader-nav reader-nav-disabled"><span>Quote / AI Quoter</span><span className="text-[9px] uppercase">Next</span></div>
        </nav>'''
if old not in text:
    raise SystemExit('Expected Reader navigation block was not found; refusing to patch blindly.')
path.write_text(text.replace(old, new, 1))
