# Build the app's LENS_FRONT table (front diameter by lens series, in mm) from front_data.json and splice it into src/app/app_script.js
# (the series' name rules are the close-focus ones, or the series' own "rx"):   python3 src/catalog/front/gen_front.py
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..', '..', 'app', 'app_script.js')
CF = os.path.join(HERE, '..', 'close_focus')
src = open(os.path.join(CF, 'gen_mod.py')).read()
RX = dict(eval(re.search(r'RX = (\[.*?\n\])', src, re.S).group(1)))
RX.update(json.load(open(os.path.join(CF, 'mod_rx.json'))))
d = json.load(open(os.path.join(HERE, 'front_data.json')))
rows = []
for k, v in sorted(d.items(), key=lambda kv: 0 if 'rx' in kv[1] else 1):   # a series' own rule first (the TLS set before the stock Super Speeds)
    rx = v.get('rx') or RX.get(k)
    if not rx: raise SystemExit('no name rule for ' + k)
    rows.append('  [' + json.dumps(k) + ', /' + re.sub(r'(?<!\\)/', r'\\/', rx) + '/i, ' + json.dumps(v['fd'], ensure_ascii=False) + ']')
js = ('/* @@LENS_FRONT: front diameter by lens series, in mm, as each maker gives it (generated from src/catalog/front/front_data.json) */\n'
      'const LENS_FRONT = [\n' + ',\n'.join(rows) + '];\n/* @@END_FRONT */')
s = open(APP).read()
if '/* @@LENS_FRONT' in s: s = re.sub(r'/\* @@LENS_FRONT.*?/\* @@END_FRONT \*/', lambda m: js, s, flags=re.S)
else:
    a = 'const LENS_MOD_OF = new WeakMap();'
    assert s.count(a) == 1; s = s.replace(a, js + '\n' + a)
open(APP, 'w').write(s)
print(len(rows), 'series;', sum(len(v['fd']) for v in d.values()), 'values')
