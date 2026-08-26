from pathlib import Path

path = Path('src/App.tsx')
source = path.read_text()
old = '''          <a className="reader-nav" href="https://forge-crm-six.vercel.app"><span>CRM</span><ChevronRight size={14} /></a>
          <div className="reader-nav reader-nav-active"><span>Reader</span><span className="reader-dot" /></div>
          <a className="reader-nav" href="https://forge-scope.vercel.app"><span>Scope</span><ChevronRight size={14} /></a>
          <a className="reader-nav" href="https://lumber-estimator-ai.vercel.app"><span>Quote / AI Quoter</span><ChevronRight size={14} /></a>'''
new = '''          <a className="reader-nav" href="https://forge2-navy.vercel.app"><span>Home</span><ChevronRight size={14} /></a>
          <a className="reader-nav" href="https://forge-crm-six.vercel.app"><span>CRM</span><ChevronRight size={14} /></a>
          <div className="reader-nav reader-nav-active"><span>Reader</span><span className="reader-dot" /></div>
          <a className="reader-nav" href="https://forge-scope.vercel.app"><span>Scope</span><ChevronRight size={14} /></a>
          <a className="reader-nav" href="https://lumber-estimator-ai.vercel.app"><span>Quote / AI Quoter</span><ChevronRight size={14} /></a>
          <a className="reader-nav" href="https://forgemfg.vercel.app"><span>Manufacturing</span><ChevronRight size={14} /></a>
          <a className="reader-nav" href="https://forge-portal-pi.vercel.app"><span>Portal</span><ChevronRight size={14} /></a>'''
count = source.count(old)
if count != 1:
    raise SystemExit(f'Expected one Reader suite nav block, found {count}')
path.write_text(source.replace(old, new))
