# Embed the catalog data and the starting catalog into the page:  make_page.py <build dir>
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1]
d = json.load(open(os.path.join(OUT, 'ac_cam_list_inventory.json'), encoding='utf-8'))
t = open(os.path.join(HERE, 'app_template.html'), encoding='utf-8').read()
s = json.dumps(d, ensure_ascii=False).replace('</', '<\\/')
st = json.dumps(json.load(open(os.path.join(HERE, 'starter_catalog.json'), encoding='utf-8')), ensure_ascii=False).replace('</', '<\\/')
assert t.count('/*STARTER*/null') == 1
open(os.path.join(OUT, 'ac-cam-list.html'), 'w', encoding='utf-8').write(t.replace('__DATA__', s).replace('/*STARTER*/null', st))
print('built', os.path.join(OUT, 'ac-cam-list.html'))
