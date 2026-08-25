from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text(encoding='utf-8')
old = '<div className="reader-nav reader-nav-disabled"><span>Quote / AI Quoter</span><span className="text-[9px] uppercase">Next</span></div>'
new = '<a className="reader-nav" href="https://lumber-estimator-ai.vercel.app"><span>Quote / AI Quoter</span><ChevronRight size={14} /></a>'
if new in text:
    print('Reader already links live Quoter.')
elif old not in text:
    raise SystemExit('Could not find Reader coming-soon Quoter nav item.')
else:
    path.write_text(text.replace(old, new, 1), encoding='utf-8')
    print('Reader now links live Forge Quoter.')
