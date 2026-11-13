# Build the app's LENS_MOD table from the close-focus research (mod_data.json, mod_rx.json; where each figure comes from: sources.md)
# and splice it into src/app/app_script.js:   python3 src/catalog/close_focus/gen_mod.py
import json, re
import os
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..', '..', 'app', 'app_script.js')
d = json.load(open(os.path.join(HERE, 'mod_data.json')))
# which catalog names each series covers (first match wins, so the narrower ones come first)
RX = [
 ('arri-signature-zoom', r'signature zoom'), ('arri-signature-prime', r'signature prime'),
 ('arri-master-macro', r'master macro'), ('arri-master-zoom', r'master zoom'), ('arri-master-prime', r'master prime'),
 ('ultra-prime', r'^(?!.*super ?16).*ultra prime'),
 ('zeiss-supreme-radiance', r'supreme (prime )?radiance'),
 ('zeiss-cp3', r'\bcp\.?3\b'), ('zeiss-cp2-superspeed', r'compact prime super speed'), ('zeiss-cp2', r'\bcp\.?2\b|compact prime'),
 ('zeiss-nano-prime', r'nano prime'), ('zeiss-lwz3', r'\blwz\.?3\b'), ('zeiss-cz2', r'\bcz\.?2\b|compact zoom'),
 ('zeiss-super-speed', r'^zeiss high speed'),
 ('cooke-anamorphic-i', r'^cooke (s6i )?anamorphic'), ('cooke-sp3', r'^cooke sp3'), ('cooke-panchro-ff', r'^cooke panchro ?\/ ?i\b|panchro\/i classic'), ('cooke-s4i', r'^cooke s4'),
 ('leitz-summilux-c', r'summilux[- ]c\b'), ('leitz-summicron-c', r'summicron[- ]c\b'), ('leica-m08', r'\bm 0\.8\b'),
 ('angenieux-optimo', r'^angenieux optimo'), ('angenieux-ez', r'^angenieux\b'),
 ('arri-alura', r'\balura\b'),
 ('fujinon-mk', r'^fujinon mk\d'), ('fujinon-xk', r'^fujinon (xk|cabrio premier)'), ('fujinon-zk', r'^fujinon (zk|cine zoom cabrio)'),
 ('canon-cine-servo', r'^canon cine zoom 17-120'),
 ('sigma-cine-ff-hs', r'^sigma (cine )?ff high[- ]speed'),
 ('tokina-cinema-macro', r'^tokina cinema at-x 100'), ('tokina-cinema-zoom', r'^tokina (cinema 11-|vista 16-28)'), ('tokina-vista', r'^tokina .*vista'),
 ('nisi-athena', r'^nisi athena'),
 ('dzofilm-vespid', r'vespid'), ('dzofilm-catta-ace', r'catta ace'), ('dzofilm-x-tract', r'x-tract|^dzofilm 18-28mm t8'),
 ('laowa-ranger', r'^laowa ranger'),
]
known = {k for k, _ in RX}
extra = [k for k in d if k not in known]
rx_extra = json.load(open(os.path.join(HERE, 'mod_rx.json'))) if os.path.exists(os.path.join(HERE, 'mod_rx.json')) else {}
for k in extra:
    if k not in rx_extra: raise SystemExit('no name rule for ' + k)
order = RX + [(k, rx_extra[k]) for k in extra]
order.sort(key=lambda kr: [i for i, (k, _) in enumerate(RX + [(k, rx_extra[k]) for k in extra]) if k == kr[0]][0])
rows = []
for k, rx in order:
    if k not in d: continue
    v = d[k]
    row = [k, '/' + re.sub(r'(?<!\\)/', r'\\/', rx) + '/i', json.dumps(v['mod'], ensure_ascii=False)]
    if v.get('macro'): row.append(json.dumps(v['macro'], ensure_ascii=False))
    rows.append('  [' + json.dumps(k) + ', ' + ', '.join(row[1:]) + ']')
js = ('/* @@LENS_MOD: close focus by lens series, as each maker marks it, in feet and inches (generated from the research notes) */\n'
      'const LENS_MOD = [\n' + ',\n'.join(rows) + '];\n/* @@END */')
p = APP; s = open(p).read()
if '/* @@LENS_MOD' in s: s = re.sub(r'/\* @@LENS_MOD.*?/\* @@END \*/', lambda m: js, s, flags=re.S)
else:
    a = 'const LENS_SPEC = new WeakMap();'
    assert s.count(a) == 1; s = s.replace(a, js + '\n' + a)
open(p, 'w').write(s)
print(len(rows), 'series in the app;', sum(len(d[k]['mod']) for k in d), 'values')
