#!/bin/bash
# Copy the working source into the repo's src/ (paths made relative to the repo):  sync.sh <workspace> <repo>
set -e
S="$1"; R="$2"; A="$R/src/app"; C="$R/src/catalog"; K="$S/pwa/srckit"
mkdir -p "$A" "$C/raw"
cp "$S/app_script.js" "$S/app_template.html" "$S/starter_catalog.json" "$S/test_starter_fixture.json" "$S/pwa_test.js" "$A/"
cp "$K/splice.py" "$K/make_page.py" "$K/build.sh" "$A/"; chmod +x "$A/build.sh"
cp "$K/README.md" "$R/src/README.md"
sed -e '1a const DOC = process.argv[2] || require("path").join(__dirname, "../build/document.xml");' \
    -e 's#process.argv\[2\]#DOC#g' \
    -e 's#"/home/claude/fitussi-catalog.html"#process.env.APP_HTML || require("path").join(__dirname, "../build/ac-cam-list.html")#' \
    -e 's#__dirname + "/test_starter_fixture.json"#require("path").join(__dirname, "test_starter_fixture.json")#' \
    "$S/test_app.js" > "$A/test_app.js"
cp "$S/build_catalog.py" "$S/utopia_data.py" "$S/meta.py" "$S/brands.py" "$S/utopia_skus.json" "$S/item_links.json" "$S/set_stops.json" "$C/"
cp "$S/utopia_keys.txt" "$S/utopia_order.json" "$S/utopia_sku_order.txt" "$S/utopia_skus_raw.txt" "$S/utopia_slugs_raw.txt" "$S/fitussi_order.json" "$S/fitussi_slugs_raw.txt" /home/claude/fitussi_inventory.json "$C/raw/"
printf 'src/build/\n__pycache__/\n' > "$R/.gitignore"
