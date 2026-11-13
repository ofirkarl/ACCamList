#!/usr/bin/env python3
"""Build the standalone AC Cam List web app (PWA) from the Claude artifact source.

The artifact keeps its data with Claude. The standalone build answers the same calls
(tools/standalone.js): Firebase (Firestore + anonymous / Google sign-in) when config.js
holds a project, this browser's storage when it does not. Everything else (UI, logic,
styles, the catalog) is the artifact source, untouched, so the two never drift apart:
rebuild after every artifact change.

  python3 tools/build.py tools/app-source.html <out_dir> <version>
"""
import pathlib, sys

SRC = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(sys.argv[2])
VERSION = sys.argv[3] if len(sys.argv) > 3 else '1'
HERE = pathlib.Path(__file__).parent

s = SRC.read_text(encoding='utf-8')


def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, f'expected {count} match(es), found {n}: {old[:80]!r}'
    s = s.replace(old, new)


shim = (HERE / 'standalone.js').read_text(encoding='utf-8')

# ---------- a real page with install metadata ----------
rep('<title>AC Cam List</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n', '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>AC Cam List</title>
<meta name="description" content="Camera equipment lists for camera assistants: pick the rental house, build the list, export to Word or PDF.">
<meta name="theme-color" content="#f6f4f0" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f0f14" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="AC Cam List">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32-v5.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon-v5.png">
<script src="config.js"></script>
<script>
window.AC_BUILD = "''' + VERSION + '''";
''' + shim + '''</script>
''')
rep('</style>\n\n<div class="app">', '</style>\n</head>\n<body>\n<div class="app">')
assert s.rstrip().endswith('</script>')
s = s.rstrip() + '''
<script>
if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
</script>
</body>
</html>
'''

# ---------- signed in or not: say where the lists are kept ----------
rep('(app.storage === "cloud" ? "Saved to your account" : "Saved in this browser")',
    '(app.storage === "cloud" ? (window.AC_AUTH && !window.AC_AUTH.user() ? "Saved on this device" : "Saved to your account") : "Saved in this browser")')
# the account line appears once the cloud has answered
rep('render();\ninitAccount();', 'render();\ninitAccount().then(() => { if (window.AC_AUTH && (app.view === "home" || app.view === "settings")) render(); });')

OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'index.html').write_text(s, encoding='utf-8')
sw = (HERE / 'sw.template.js').read_text(encoding='utf-8').replace('__VERSION__', VERSION)
(OUT / 'sw.js').write_text(sw, encoding='utf-8')
print('built', OUT / 'index.html', 'version', VERSION, len(s), 'bytes')
