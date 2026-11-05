#!/bin/bash
# Build the app page from source:  src/app/build.sh            (writes src/build/ac-cam-list.html)
#   1. the catalog data from the rental houses' item lists (src/catalog)
#   2. app_script.js spliced into app_template.html
#   3. the data and the starting catalog embedded into the page
# Then the standalone app (the GitHub Pages site) is made from that page with tools/build.py.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; SRC="$(dirname "$HERE")"; OUT="${OUT:-$SRC/build}"; mkdir -p "$OUT"
python3 -I "$SRC/catalog/build_catalog.py" "$OUT"
python3 -I "$HERE/splice.py"
python3 -I "$HERE/make_page.py" "$OUT"
node -e "const fs=require('fs');const h=fs.readFileSync(process.argv[1],'utf8');new Function(h.split('<script>')[1].split('</script>')[0]);console.log('page script parses')" "$OUT/ac-cam-list.html"
