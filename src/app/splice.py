# Put app_script.js into app_template.html, between the page's <script> and </script>.
import os
HERE = os.path.dirname(os.path.abspath(__file__))
t = open(os.path.join(HERE, 'app_template.html'), encoding='utf-8').read()
js = open(os.path.join(HERE, 'app_script.js'), encoding='utf-8').read()
a = t.index('<script>\n') + len('<script>\n'); b = t.rindex('</script>')
open(os.path.join(HERE, 'app_template.html'), 'w', encoding='utf-8').write(t[:a] + js + ('' if js.endswith('\n') else '\n') + t[b:])
print('spliced', len(js))
