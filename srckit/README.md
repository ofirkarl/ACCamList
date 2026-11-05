# AC Cam List: source

The site at the top of this repository is built from what's in here.

```
src/
  app/          the app itself
    app_script.js         all the app's code
    app_template.html     the page and its styles (app_script.js is spliced into it)
    starter_catalog.json  the catalog every new user starts from (saved from the app: Settings → Catalog → Save my catalog as a file)
    build.sh              builds src/build/ac-cam-list.html
    test_app.js           the app's tests:  node src/app/test_app.js   (after build.sh)
    test_starter_fixture.json   the fixed starting catalog the feature tests run on
    pwa_test.js           a browser check of the built site (Playwright)
  catalog/      the rental houses' items
    build_catalog.py      Fitussi's list, the shared rules (categories, brands, lens and camera details) and the build
    utopia_data.py        Utopia's list
    meta.py, brands.py    names, brands, formats, mounts, groups
    utopia_skus.json, item_links.json, set_stops.json   SKUs, product pages, each lens's stop in a set
    raw/                  what was read off the two websites when the lists were made (for comparing later)
  build/        output (not kept in git)
```

To build and publish: `src/app/build.sh`, then `python3 tools/build.py src/build/ac-cam-list.html <site dir> <version>`,
copy the site files to the top of the repository (keep `config.js`), commit and push.
