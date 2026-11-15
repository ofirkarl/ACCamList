# Lenses users made by hand, completed by the maker with Claude (from the makers' specs): lens_add.json, keyed by the lens's name as
# users typed it, each the lens's details as the catalog keeps them ({coverage, mounts, focals, stop, cf, fd, squeeze, ana, set, count, stops}).
# Spliced into src/app/app_script.js as LENS_ADD (by the name's key):   python3 src/catalog/lens_add/gen_add.py
import json, os, re, unicodedata
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..', '..', 'app', 'app_script.js')
d = json.load(open(os.path.join(HERE, 'lens_add.json')))
def qkey(s):   # the app's qKey: lower case, accents off, only letters and digits
    s = unicodedata.normalize('NFD', s.lower()); s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    return re.sub(r'[^a-z0-9֐-׿]+', '', s)
body = ',\n'.join('  ' + json.dumps(qkey(k)) + ': ' + json.dumps({kk: vv for kk, vv in v.items() if kk not in ('src', 'note')}, ensure_ascii=False) for k, v in d.items())
js = ('/* @@LENS_ADD: lenses users made by hand, completed by the maker (with Claude, from the makers\' specs); by name, any user\'s copy of it\n'
      '   takes the details it doesn\'t have yet (its own stay). Generated from src/catalog/lens_add/lens_add.json */\nconst LENS_ADD = {' + ('\n' + body + '\n' if body else '') + '};\n/* @@END_ADD */')
s = open(APP).read(); s = re.sub(r'/\* @@LENS_ADD.*?/\* @@END_ADD \*/', lambda m: js, s, flags=re.S); open(APP, 'w').write(s)
print(len(d), 'lenses')
