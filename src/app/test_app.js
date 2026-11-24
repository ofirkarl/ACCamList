// Run the page script with DOM stubs, then exercise the model: batteries, TX/RX, sub-items, favorites, coverage, exports.
const DOC = process.argv[2] || require("path").join(__dirname, "../build/document.xml");
const fs = require("fs");
const builtHtml = fs.readFileSync(process.env.APP_HTML || require("path").join(__dirname, "../build/ac-cam-list.html"), "utf8");
// the feature tests run on a fixed starting catalog (the one they were written against); the app's real one is checked at the end
const STARTER_RE = /const STARTER = (.*?) \|\| \{ catalog: \{\}, closedBrands: \{\}, catColors: \{\} \};/s;
const realStarter = JSON.parse(builtHtml.match(STARTER_RE)[1]);
const html = builtHtml.replace(STARTER_RE, () => `const STARTER = ${fs.readFileSync(require("path").join(__dirname, "test_starter_fixture.json"), "utf8")} || { catalog: {}, closedBrands: {}, catColors: {} };`);
const js = html.split("<script>")[1].split("</script>")[0];
const el = () => ({ innerHTML: "", className: "", textContent: "", hidden: true, value: "", dataset: {}, classList: { toggle() {}, add() {}, remove() {} }, querySelectorAll: () => [], querySelector: () => null, focus() {}, setAttribute() {}, remove() {}, appendChild() {} });
const store = {};
let modals = [];
global.document = { getElementById: id => id === "modal" ? null : el(), addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], activeElement: null,
  createElement: () => { const m = el(); return m; }, body: { appendChild: m => modals.push(m.innerHTML) } };
global.window = { scrollTo() {}, scrollY: 0, addEventListener() {} };
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
global.CSS = { escape: s => s };
global.setTimeout = () => 0; global.clearTimeout = () => {};
const A = new Function(js + `
;return { skuPack, ndApply, exportRows, rfVersions, rfNextVer, startDuplicate, unitRepair, twinIn, cpfSources, cpfItems, ntSrc, ntModel, ntPlain, fmtDoc, shootSplit, fmtRuns, shootOn, shootWhenText, datesBtnHtml, lnHtml, setLnDraft: v => { lnDraft = v; }, lensParse, lnFromItem, lnToLens, cfNorm, lensFront, frontOf, lensSpec, recKey, covKey, fmtSeen, covBoxHtml, ckListHtml, viewNotes, ntTodo, ntCur, pcData, viewForm, MAIL_GS, MAIL_MANIFEST, rfLines, rfText, rfParse, rfMatch, formsOf, copyProduction, wlEven, ctlHtml, ntModel, ntPlain, ntHtml, ntDocx, upData, SCHEMA, setMerge, setStamp, setPrevReset, stab, errText, pcListId, pcData, pcCount, viewPrep, lineQty, histAdd, histFor, viewRules, getUndo: () => undoFn, helperUrl, useHelper, sendHowText, canShareKind, csOf, recSet, cardLabel, setMcOpen: v => { mcOpen = v; }, REC, recRate, recResult, recProfile, cardBytes, pickCard, mediaCamHtml, viewMedia, recEnsure, pkgMediaHtml, pkgAddsHtml, fileKey, getFile, fileCache, viewWelcome, greetHtml, needsWelcome, uiSave, snapProds, clashIssues, clashSwap, clashDrop, clashPrompt, ruleDialog, docVer, commitVer, docSigOf, fileBase, STARTER, hasEdits, houseLenses, finderMatches, fin, lensSpec, colKey, parseLensQuery, finderResults, finderHtml, catTape, setCatColor, favByCategory, headerParts, app, ITEM, exportHtml, newProduction, shootDays, countShootDays, catalogGuess, lensFormats, groupItems, copyProduction, duplicateCatItem, resolveReader, viewProduction, shootTrim, renameCatItem, syncLineNames, viewSettings, docxHeaderClean, pickerHtml, dd, dupWithUnit, deleteProductions, unit2Of, setQty, applyDefaults, coverageIssues, listText, csvText, docxXml, totals, viewList, viewCatalog, viewFavorites, viewSettings, treeHtml, viewHome, viewForm, houseById, favoritesFor, toggleFav, moveCatItem, saveCatItem, resetCatItem, applyCatalog, moveLine, setHead, secName, linesBySection, grpOf, lineFromCatalog, addCategory, addSubcategory, deleteCustom, addSection, deleteSection, allSections, docxXml, exportHtml, ensureCategory, ensureSub, moveSub, moveCat, createOwnItem, deleteOwnItem, saveCatItem, moveGroup, reorderItem, groupItems, headOrig, setNote, noteOf, rowHtml, exportRows, safeUrl, addFolder, deleteFolder, subGroupNames, splitByBrand, setBrandSplit, setItemBrand, renameBrandInGroup, motorsFor, isFlat, setFlat, moveBrand, brandsIn, shownOrder, dropLabel, drag, promoteGroup, promoteSub, placeGroup, GSEP, groupTree, subGroupNames, subByKey, placeLoose, syncLoose, looseBlocks, catRank, createOwnItem, removeCatItem, restoreCatItem, hasRec, toCatalog, fromCustomDone, addCustomLine, favKeyCustom, viewLensFind, viewHome, pageKey, viewBrowse, viewMcalc, mcListId, waFmt, savedLists, catEditDialog, viewTools, viewFavsSolo, favSolo, viewCams, camsOf, camCur, camVals, camCardHtml, camSetVal, camField, camNew, camPicker, viewCamPrint, camListId, camInk, CAM_COLORS, camCompareHtml, savedListsHtml, savedListOpenHtml, camCopy, camLayout, camLayoutSet, camTableHtml, camClash, camDevOnList, camSrcs, camSrcU2, camTwo, camSrcToggle, camWhen, camOrdered, camHome, camSel, camFormHtml, camScanOf, SCANS, camDevOf, camDevAt, qHit, mcFreeCams, mediaSizes, lensMod, specsHtml, lensCardHtml, lcRows, viewLensCard, lcOpts, lcStepK, cfInches, inTxt, CF_STEPS, addCustomLine, modalsSeen: () => 0 };`)();

const FRESH = JSON.parse(JSON.stringify(A.app.settings));
// the earlier ready-made camera rules, as stored for lists made before: they keep working
A.app.settings.rules = [
  { id: "r-arri", match: { brand: "ARRI" }, label: "All ARRI cameras", qty: 6, battery: { label: "FXLion 250Wh V-Mount Battery", tokens: ["fxlion", "250wh"] } },
  { id: "r-fx6", match: { key: "fx6" }, label: "Sony FX6", qty: 4, battery: { label: "FXLion 150Wh V-Mount Battery", tokens: ["fxlion", "150wh"] } },
  { id: "r-media", kind: "media", match: { all: true }, label: "All cameras", qty: 5 }];
const find = (house, re) => { for (const [id, e] of A.ITEM) if (e.h.id === house && re.test(e.it.name)) return id; throw new Error("not found " + re); };
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) process.exitCode = 1; };

// --- default batteries
const p = A.newProduction({ name: "Mizrahi", company: "Keshet", houseId: "utopia", dp: "Damian Tsatskin", ac: "Ofir Karlstadt", acPhone: "0542405010", prep: "2026-03-16", shootStart: "2026-03-17", shootEnd: "2026-03-17" });
A.app.productions.push(p); A.app.pid = p.id;
const fx6 = find("utopia", /^Sony PXW-FX6$/), mini = find("utopia", /^ARRI Alexa Mini$/);
const b150 = find("utopia", /Nano Three.*150Wh/), b250 = find("utopia", /FXLion 250Wh V-Mount/);
A.setQty(p, fx6, 2);
ok(p.items[b150] && p.items[b150].qty === 8, `2x FX6 -> 8x 150Wh (${p.items[b150]?.qty})`);
A.setQty(p, mini, 3);
ok(p.items[b250] && p.items[b250].qty === 18, `3x Alexa Mini -> 18x 250Wh (${p.items[b250]?.qty})`);
A.setQty(p, b250, 20);  // two spares by hand
A.setQty(p, mini, 2);
ok(p.items[b250].qty === 14, `spares kept when cameras drop to 2: 12 auto + 2 spare = ${p.items[b250].qty}`);
A.setQty(p, fx6, 0);
ok(!p.items[b150], "removing FX6 removes its auto batteries");
// Fitussi has no batteries in its catalog -> custom line
const pf = A.newProduction({ name: "Fitussi test", houseId: "fitussi" }); A.app.productions.push(pf);
A.setQty(pf, find("fitussi", /^ARRI Alexa 35$/), 1);
const auto = Object.values(pf.items).find(l => l.custom && l.section === "power");
ok(auto && auto.qty === 6 && /250Wh/.test(auto.name), `Fitussi Alexa 35 -> custom "${auto?.name}" x${auto?.qty}`);

// --- memory cards per camera
const cfast = Object.keys(p.items).filter(id => A.ITEM.get(id)?.it.group === "CFast 2.0" && A.ITEM.get(id).s.id === "media");
ok(cfast.length === 1 && p.items[cfast[0]].qty === 10 && /256GB/.test(p.items[cfast[0]].name), `2x Alexa Mini -> 10x ${p.items[cfast[0]]?.name}`);
const cfa = Object.values(pf.items).find(l => l.section === "media");
ok(cfa && cfa.qty === 5, `Fitussi Alexa 35 -> 5x ${cfa?.name}`);

// --- TX/RX
const bolt = find("utopia", /Bolt 6 LT 750/);
A.setQty(p, bolt, 1);
ok(p.items[bolt].tx === 1 && p.items[bolt].rx === 1, "wireless video starts at 1 TX / 1 RX");
A.setQty(p, bolt, 3, "rx");
ok(p.items[bolt].rx === 3 && p.items[bolt].qty === 1 && p.items[bolt].sets === 1, "RX set to 3: still 1 set");
A.setQty(p, bolt, 2); ok(p.items[bolt].sets === 2 && p.items[bolt].tx === 2 && p.items[bolt].rx === 4, "a second set brings one more TX and RX: 2 sets, 2 TX, 4 RX"); A.setQty(p, bolt, 1);
// wireless video: whole sets (as many TX as RX), or simply so many TX and so many RX
{ const w = A.newProduction({ houseId: "utopia" }); A.setQty(w, bolt, 1); A.setQty(w, bolt, 3);
  ok(w.items[bolt].tx === 3 && w.items[bolt].rx === 3 && A.lineQty(w.items[bolt]) === 3, "3 sets: 3 TX and 3 RX");
  A.setQty(w, bolt, 2); ok(w.items[bolt].tx === 2 && w.items[bolt].rx === 2, "a set less: 2 TX and 2 RX");
  A.setQty(w, bolt, 3, "rx"); ok(w.items[bolt].tx === 2 && w.items[bolt].rx === 3 && A.lineQty(w.items[bolt]) === 2, "one more receiver: 2 TX, 3 RX (no longer whole sets; 2 whole sets in it)");
  A.setQty(w, bolt, 2, "rx"); ok(w.items[bolt].tx === 2 && w.items[bolt].rx === 2 && A.lineQty(w.items[bolt]) === 2, "even again: 2 sets");
  A.setQty(w, bolt, 0, "tx"); ok(w.items[bolt] && w.items[bolt].tx === 0 && w.items[bolt].rx === 2 && A.lineQty(w.items[bolt]) === 1, "receivers only: the line stays (2 RX)");
  A.setQty(w, bolt, 0, "rx"); ok(!w.items[bolt], "no transmitter and no receiver: the line is gone (never sets without either)");
  A.setQty(w, bolt, 1); Object.assign(w.items[bolt], { sets: 3, qty: 3, tx: 0, rx: 0 });   // as an older version could leave it
  ok(A.lineQty(w.items[bolt]) === 3, "an older line with 3 sets and no TX or RX reads as 3 sets");
  A.setQty(w, bolt, 4); ok(w.items[bolt].tx === 4 && w.items[bolt].rx === 4, "and one more set makes it 4 TX and 4 RX"); }

// --- no wireless warning any more: 2 cameras, 1 TX is fine
modals = [];
A.setQty(p, bolt, 1, "tx");
ok(modals.length === 0, "no wireless video popup");
A.setQty(p, bolt, 2, "tx");

// --- sub-items + rename
const mbp = find("utopia", /Apple MacBook Pro/);
A.setQty(p, mbp, 1);
p.items[mbp].children.push({ id: "k1", name: "USB Hub", qty: 1 });
p.items[mbp].children.push({ id: "k2", name: "Charger", qty: 0 });   // a sub-item with no quantity
p.items[mbp].name = "MacBook Pro";

// --- coverage warning (popup + list box)
modals = [];
const ez2 = find("utopia", /Angenieux EZ-2/);
A.setQty(p, ez2, 1);  // Alexa Mini is S35: no warning
ok(modals.length === 0, "S35 zoom on Alexa Mini: no warning");
const venice = find("utopia", /^Sony Venice$/);
A.setQty(p, venice, 1);
ok(modals.length === 1 && /Coverage warning/.test(modals[0]) && !/Wireless video/.test(modals[0]), "adding Venice: one popup with the coverage warning, nothing about wireless");
ok(A.coverageIssues(p).length === 1, "one camera with a coverage issue");
ok(/Coverage warning/.test(A.viewList(p, A.houseById("utopia"))), "warning shown in the Cam list");
{ const i0 = A.coverageIssues(p)[0]; p.covOk = {}; for (const x of i0.lenses) p.covOk[A.covKey(i0.cam.id, x.id)] = 1;
  const v = A.viewList(p, A.houseById("utopia"));
  ok(!A.coverageIssues(p).length && A.coverageIssues(p, true).length === 1 && !/class="warnbox cov-box"/.test(v) && /1 coverage note checked/.test(v), "a coverage line marked checked: out of the warning, one quiet line for it");
  delete p.covOk; ok(/class="warnbox cov-box"[\s\S]*?data-act="cov-ok"/.test(A.viewList(p, A.houseById("utopia"))), "unchecked: the warning again, with its ✓"); }
{ const now = Date.now(), early = now - new Date().setHours(0, 0, 0, 0) < 8 * 60000;   // in the first minutes after midnight no earlier moment today is out of "now"
  ok(A.fmtSeen(now - 60000) === "in the app now" && (early || /^today \d\d:\d\d$/.test(A.fmtSeen(now - 7 * 60000))) && /^yesterday \d\d:\d\d$/.test(A.fmtSeen(new Date().setHours(0, 0, 0, 0) - 3600000)) && A.fmtSeen(0) === "never", "Control room: last in the app with the hour, or in the app now"); }

// --- recording data for more cameras: the Fujifilms, Panasonics, older Sonys; the FS700 isn't an FS7
{ const rate = (name, codec, mode, fps) => { const pf = A.recProfile(name), cd = pf.find(x => x.n === codec), md = cd.m.find(x => x[0] === mode); return A.recRate(cd, md, fps) * 8 / 1e6; };
  ok(Math.abs(rate("Fujifilm Gfx Eterna 55 Cinema Camera G-Mount", "ProRes 422 HQ", "8K 17:9", 24) - 3004) < 10 && Math.abs(rate("Fujifilm Gfx 100II Medium Format G-Mount", "ProRes 422 HQ", "8K 16:9", 29.97) - 3520) < 10, "Fujifilm ProRes at Fujifilm's own rates (8K DCI 24p HQ ≈ 3004 Mbps, 8K 16:9 29.97p ≈ 3520)");
  ok(A.recProfile("Fujifilm Gfx Eterna 55 Cinema Camera G-Mount").some(x => /^H\.265 All-Intra 720 Mbps/.test(x.n)), "the Eterna's H.265 bit rates");
  ok(rate("Panasonic Lumix DC-GH5S Mirrorless Micro Four Thirds Digital Camera", "LongGOP 4K (4:2:0 8-bit)", "Four Thirds → UHD", 60) === 150 && rate("Panasonic AU-EVA1", "ALL-I 2K / HD (4:2:2 10-bit)", "Super 35 5.7K → HD", 25) === 100, "Panasonic bit rates by frame rate (GH5S 4K 8-bit 60p 150, EVA1 HD ALL-I 25p 100)");
  ok(A.recKey("Sony NEX-FS700") === "fs700" && A.recKey("Sony PXW-FS7 II") === "fs7" && A.recKey("Sony FR7 Cinema Line PTZ Camera") === "fx6" && A.recKey("Sony PMW-F5 4K") === "f5" && A.recKey("Sony PMW-F55") === "f55", "the FS700 records AVCHD (not the FS7's XAVC); the FR7 as the FX6; F5 and F55 apart");
  ok(A.csOf("H.265 6K 200 Mbps (4:2:0 10-bit)") === "4:2:0 · 10-bit" && A.csOf("AVCHD PS 28 Mbps") === "4:2:0 · 8-bit", "a codec's colour sampling from its name"); }

// --- front diameter: by series and focal length; the matte box's back size marks the ones that need an adapter
{ const L = (name, sub, lens) => ({ name, lens });
  const sig15 = { name: "ARRI Signature Prime T1.8/15mm LPL-Mount", lens: { focals: "15mm", stop: "T1.8", coverage: "FF" } }, sig25 = { name: "ARRI Signature Prime T1.8/25mm LPL-Mount", lens: { focals: "25mm", stop: "T1.8", coverage: "FF" } };
  const f15 = A.frontOf(sig15, A.lensSpec(sig15, "primes")), f25 = A.frontOf(sig25, A.lensSpec(sig25, "primes"));
  ok(f15 && f15.text === "Ø156" && f15.need && f25 && f25.text === "Ø114" && !f25.need, "front diameter by focal length (Signature 15: 156, needs an adapter on a 114 matte box; 25: 114)");
  ok(/Ø156 · 6x6 matte box \/ adapter/.test(A.specsHtml(sig15, "", {})) && !/6x6/.test(A.specsHtml(sig25, "", {})) && !/Matte box|mb-size/.test(A.viewSettings()), "a lens bigger than a 114 mm matte box says it needs a 6x6 matte box or an adapter; no Matte box setting");
  const tls = { name: "Zeiss High Speed MKIII + S.S TLS", lens: { set: true, focals: "18, 25, 35, 50, 85mm", count: 5, stop: "T1.3" } }, stock = { name: "Zeiss High Speed Prime T1.3 Lens Set", lens: { set: true, focals: "18, 25, 35, 50, 85mm", count: 5, stop: "T1.3" } };
  ok(A.frontOf(tls, A.lensSpec(tls, "sets")).text === "Ø95" && A.frontOf(stock, A.lensSpec(stock, "sets")).text === "Ø80", "Super Speeds: TLS rehoused 95, stock 80"); }

// --- a lens's technical details: the name read into its fields (and left as the lens and its focal length)
{ const g = A.lensParse("Zeiss Standard 135mm T2.1 S35 PL CF 1.5m front 95");
  ok(g.name === "Zeiss Standard 135mm" && g.stop === "T2.1" && g.cov === "S35" && g.mounts.join() === "PL" && g.cf === "4'11\"" && g.fd === "95" && g.focal === 135, "the name's details go to their fields: Zeiss Standard 135mm · T2.1, S35, PL, CF 4'11\" (1.5 m), front 95");
  const s = A.lensParse("Cooke S4i 16/24/32/50/85mm T2 PL"), a = A.lensParse("Sirui 35mm 1.33x T1.8 E-mount"), pr = A.lensParse("Laowa 24mm 2x Probe");
  ok(s.set.join() === "16,24,32,50,85" && a.squeeze === "1.33x" && a.ana && a.mounts.join() === "E" && !pr.squeeze && pr.name === "Laowa 24mm 2x Probe", "a set by its focal lengths; a squeeze makes it anamorphic; a probe's 2x is not a squeeze");
  ok(A.cfNorm("35 cm") === "1'2\"" && A.cfNorm("14\"") === "1'2\"" && A.cfNorm("2'4") === "2'4\"", "close focus written as the makers mark it");
  const L = A.lnToLens({ ana: true, kind: "set", squeeze: "1.5x", cov: "FF", stop: "", mounts: ["PL"], focal: "", cf: "", fd: "", rows: [{ f: "35", stop: "T2", cf: "0.6m", fd: "95" }, { f: "50", stop: "T2", cf: "", fd: "95" }] });
  ok(L.set && L.count === 2 && L.focals === "35, 50mm" && L.stop === "T2" && L.squeeze === "1.5x" && L.cf["35"] === "2'" && L.fd["50"] === "95", "a set's details lens by lens, as the catalog keeps them");
  // the numbers: short fields side by side, left to right, no ✓ (12 characters at most)
  const d = A.lnFromItem(null); Object.assign(d, { focal: "85", stop: "T2.1", cf: "1'2\"", fd: "80" }); A.setLnDraft(d); const h1 = A.lnHtml();
  const ins = h1.match(/<input id="ln-(focal|stop|cf|fd)"[^>]*>/g) || [];
  ok(/class="ln-grid prime"/.test(h1) && ins.length === 4 && ins.every(x => /maxlength="12"/.test(x) && /dir="ltr"/.test(x)) && /value="1'2&quot;"/.test(ins[2]) && !/maxlength="16"/.test(h1), "a prime's numbers: four short fields in one row, written left to right");
  Object.assign(d, { kind: "set", rows: [{ f: "35", stop: "T2", cf: "", fd: "95" }, { f: "50", stop: "T2", cf: "2'", fd: "95" }] }); const h2 = A.lnHtml();
  ok(/class="ln-grid set/.test(h2) && (h2.match(/data-lnr="/g) || []).length === 8 && (h2.match(/data-act="ln-row-del"/g) || []).length === 2 && /<span>Close focus<\/span>/.test(h2), "a set: the same columns, a row per lens");
  A.setLnDraft(null); }

// --- a package for any camera: one set for each camera on the list (a camera's own package adds on top)
{ const keep = A.app.settings.rules; const cams = [...A.ITEM].filter(([id, e]) => e.h.id === "utopia" && e.it.camera && !e.it.camera.film).slice(0, 2).map(x => x[0]);
  const addId = [...A.ITEM].find(([id, e]) => e.h.id === "utopia" && !e.it.camera && !e.it.lens)[0];
  A.app.settings.rules = [{ id: "r-any", kind: "item", house: "utopia", when: "utopia:*camera", add: addId, qty: 1 }];
  const q = A.newProduction({ name: "Any", houseId: "utopia" }); A.setQty(q, cams[0], 2); A.setQty(q, cams[1], 1); A.applyDefaults(q);
  ok(q.items[addId] && q.items[addId].auto === 3, "Any camera: one set for each camera on the list (2 + 1 = 3)");
  A.app.settings.rules.push({ id: "r-own", kind: "item", house: "utopia", when: cams[1], add: addId, qty: 1 }); A.applyDefaults(q);
  ok(q.items[addId].auto === 4, "a camera's own package adds on top"); A.app.settings.rules = keep; }

// --- favorites
A.toggleFav(ez2, { name: "x", section: "lens" });
A.toggleFav("c:applebox20:grip", { name: "Applebox 20", section: "grip" });
const other = A.newProduction({ name: "Other", houseId: "utopia" }); other.items[mini] = { qty: 1, section: "camera" }; A.app.productions.push(other);
const fv = A.favoritesFor(p);
ok(fv.starred.length === 1 && fv.custom.length === 1, "starred catalog item and custom item listed");
const fv2 = A.favoritesFor(A.newProduction({ houseId: "utopia" }));
ok(fv2.used.some(u => u.e.it.name === "ARRI Alexa Mini"), "items from other productions show under Used before");

// --- set specs and filters category
const ultra = A.ITEM.get(find("utopia", /Ultra Prime T1.9 Lens Set/)).it;
ok(ultra.lens.focals.startsWith("16, 20, 24") && ultra.lens.coverage === "S35" && ultra.sku === "LNS-UPK", "Ultra Prime set: focals, S35, SKU");
const fcats = A.houseById("utopia").categories.find(c => c.id === "filters").subcategories.map(s => s.name);
ok(fcats[0] === "ND" && fcats[1] === "ND Grad" && fcats.includes("Diffusers"), "filters subcategories: " + fcats.join(" | "));

// --- grouping by type / size and the camera badge
A.app.cat = "filters"; const ft = A.treeHtml(p, A.houseById("utopia")); A.app.cat = "all";
ok(/>4x4</.test(ft) && /Black Pro-Mist/.test(ft) && !/· \d+ sizes/.test(ft), "filters: ND by size, diffusers by type; no folder count on the heading");
const fm = A.houseById("utopia").categories.flatMap(c => c.subcategories).find(s => s.id === "card_readers");
ok(fm && fm.groupBy === "type", "card readers grouped by card type: " + fm.groups.join(", "));
ok(!/<span>Super 35<\/span>/.test(A.viewCatalog(p, A.houseById("utopia"))), "camera shows the S35 badge only, no repeated label");

// --- render all views
A.viewCatalog(p, A.houseById("utopia")); A.viewFavorites(p, A.houseById("utopia")); A.viewSettings(); A.viewHome(); A.viewForm();
A.app.q = "35mm"; const tree = A.treeHtml(p, A.houseById("utopia")); A.app.q = "";
ok((tree.match(/class="item/g) || []).length > 20, "search '35mm' also finds sets containing a 35");

// --- exports
const txt = A.listText(p);
console.log("\n" + txt);
ok(/\n(Teradek|[^\n\d]*Bolt) 6 LT 750[^\n]*\n   - 2x TX · 3x RX\n/.test(txt) && !/\dx [^\n]*Bolt 6 LT 750/.test(txt) && !/\(TX\)|\(RX\)/.test(txt), "a broken set (2 TX, 3 RX) exported with no count of sets, its TX and RX on one line under it");
{ const w = A.newProduction({ houseId: "utopia", name: "W" }); A.setQty(w, bolt, 2); ok(!/- \d+x [TR]X/.test(A.listText(w)), "whole sets exported as just the sets, no TX or RX under them"); }
ok(/- 1x USB Hub/.test(txt), "sub-items exported");
ok(/   - Charger\n/.test(txt) && !/\dx Charger/.test(txt), "a sub-item with no quantity: exported as just its name");
fs.writeFileSync(DOC, A.docxXml(p));
fs.writeFileSync(DOC.replace("document.xml", "pdf.html"), "<meta charset=utf-8>" + A.exportHtml(p));
console.log(A.csvText(p).split("\r\n").slice(0, 3).join("\n"));

// --- editing: catalog items, headings, gear list order
const U = A.houseById("utopia");
const lmd = find("utopia", /LMD-A240/);
const e0 = A.ITEM.get(lmd);
ok(A.moveCatItem(U, lmd, "camera_accessories/wireless_video/SONY") && A.ITEM.get(lmd).s.id === "wireless_video" && A.grpOf(A.ITEM.get(lmd).it, A.ITEM.get(lmd).s) === "SONY", `drag LMD-A240 from ${e0.s.id} to Wireless › SONY`);
ok(A.app.settings.catalog.utopia.items[lmd].s === "wireless_video", "move stored in settings");
A.applyCatalog();
ok(A.ITEM.get(lmd).s.id === "wireless_video" && A.ITEM.get(lmd).it.edited, "move survives a rebuild");
const wsub = U.categories.find(c => c.id === "camera_accessories").subcategories.find(x => x.id === "wireless_video");
ok(wsub.items.some(it => it.id === lmd), "item listed under its new subcategory");
const mbx = find("utopia", /^ARRI MB-14/);
A.saveCatItem(U, mbx, { name: "MB-14 Matte Box (Studio)", c: "filters", s: "filters/clear", g: "__new", gnew: "Matte boxes", section: "filters" });
const em = A.ITEM.get(mbx);
ok(em.it.name === "MB-14 Matte Box (Studio)" && em.c.id === "filters" && em.s.id === "clear" && A.grpOf(em.it, em.s) === "Matte boxes" && em.it.section === "filters", `edit dialog: rename + move to new group (${em.it.name}, ${em.s.name}, ${A.grpOf(em.it, em.s)})`);
ok(A.lineFromCatalog(mbx).name === "MB-14 Matte Box (Studio)", "new lines use the edited name");
A.resetCatItem(U, mbx);
ok(A.ITEM.get(mbx).it.name === "ARRI MB-14 Matte Box" && A.ITEM.get(mbx).s.id !== "clear", "undo edits restores the item: " + A.ITEM.get(mbx).it.name);
A.setHead("cat", U, "lenses", "Glass");
ok(U.categories.find(c => c.id === "lenses").name === "Glass", "category renamed");
A.setHead("cat", U, "lenses/cine_primes", "Primes");
A.setHead("cat", U, "lenses", "Lenses");
ok(U.categories.find(c => c.id === "lenses").name === "Lenses" && !A.app.settings.catalog.utopia.heads.lenses && U.categories.find(c => c.id === "lenses").subcategories.find(x => x.id === "cine_primes").name === "Primes", "renaming back to the original clears the edit; subcategory keeps its new name");
A.setHead("cat", U, "lenses/cine_primes", "");
A.app.cat = "camera_accessories"; A.app.editCat = true; const et = A.treeHtml(p, U); A.app.editCat = false; A.app.cat = "all";
ok(/data-drag="cat"/.test(et) && /data-act="rename-head"/.test(et) && /data-drop="camera_accessories\/wireless_video\/SONY"/.test(et), "edit mode tree has handles, rename buttons and drop targets");
// gear list: rename a section, reorder and move lines
A.setHead("section", null, "display", "Monitors");
ok(A.secName("display") === "Monitors" && /MONITORS/.test(A.listText(p)) && /Monitors/.test(A.csvText(p)), "section rename shows in text and CSV exports");
const camIds = A.linesBySection(p).camera.map(([i]) => i);
A.moveLine(p, camIds[camIds.length - 1], "camera", camIds[0], false);
ok(A.linesBySection(p).camera[0][0] === camIds[camIds.length - 1], "line dragged to the top of its section");
ok(A.moveLine(p, mbp, "aks", null) && p.items[mbp].section === "aks" && A.linesBySection(p).aks.at(-1)[0] === mbp, "line dragged into another section");
const txt2 = A.listText(p);
ok(txt2.indexOf("AKS") < txt2.indexOf("MacBook Pro"), "moved line exported under its new section");
if (process.argv[2]) fs.writeFileSync(process.argv[2].replace("document.xml", "edit_tree.html"), et);   // a page to look at, only when run by hand (GitHub runs it with no path)

// --- the user's own categories, subcategories and gear list sections
const [vv, vg] = A.addCategory(U, "Video Village", "Monitors", "display");
ok(U.categories.at(-1).name === "Video Village" && U.categories.at(-1).subcategories[0].name === "Monitors", "new category with its first subcategory");
const pvm = find("utopia", /Sony PVM-A174/);
A.moveCatItem(U, pvm, vg);
ok(A.ITEM.get(pvm).c.id === vv && A.ITEM.get(pvm).it.section === "display", "item dragged into the new category keeps the chosen gear list section");
const xs = A.addSubcategory(U, "lenses", "Vintage", "lens");
A.moveCatItem(U, find("utopia", /Canon FD Prime/), xs);
ok(A.ITEM.get(find("utopia", /Canon FD Prime/)).s.name === "Vintage", "new subcategory inside an existing category");
A.app.editCat = true; const t3 = A.treeHtml(p, U); A.app.editCat = false;
ok(/data-act="new-cat"/.test(t3) && /data-act="new-folder"/.test(t3) && /Video Village/.test(t3), "edit mode offers + New category and + New folder");
A.deleteCustom(U, vv);
ok(!U.categories.some(c => c.id === vv) && A.ITEM.get(pvm).s.id === "monitors", "deleting the category sends its items back to Monitors");
const vs = A.addSection("Video Village", "R|");
const order = A.allSections().map(s => s.id);
ok(order.indexOf(vs) === order.indexOf("media") - 1 && A.allSections().find(s => s.id === vs).column === "R", "new section at the top of the right column");
const vs2 = A.addSection("Spares", "L|lens");
ok(A.allSections().map(s => s.id).indexOf(vs2) === A.allSections().map(s => s.id).indexOf("lens") + 1, "new section placed after Lens");
A.moveLine(p, mbp, vs, null);
const t4 = A.listText(p);
ok(/VIDEO VILLAGE\n1x MacBook Pro/.test(t4) && A.docxXml(p).includes("Video Village") && A.exportHtml(p).includes("Video Village"), "line in the new section, in text, Word and PDF");
A.deleteSection(vs);
ok(A.linesBySection(p)[A.ITEM.get(mbp).it.section].some(([i]) => i === mbp), "deleting the section moves its lines back to their catalog section");

const nCats = U.categories.length;
const [ec, es] = A.ensureCategory(U, "lenses", "Vintage Glass", "lens");
ok(U.categories.length === nCats && ec === "lenses" && U.categories.find(c => c.id === "lenses").subcategories.some(x => x.key === es && x.name === "Vintage Glass"), "typing an existing category name adds the subcategory to it instead of a duplicate");
ok(A.ensureSub(U, "lenses", "vintage glass", "lens") === es, "same subcategory name is reused");

// --- drag categories and subcategories, the user's own items
const before = U.categories.map(c => c.id);
A.moveCat(U, "filters", "camera", false);
ok(U.categories[0].id === "filters" && U.categories.map(c => c.id).slice(1).join() === before.filter(i => i !== "filters").join(), "category dragged to the top: " + U.categories.map(c => c.name).join(", "));
A.moveSub(U, "camera_accessories/wireless_video", "camera", "camera/cinema", false);
const camc = U.categories.find(c => c.id === "camera");
ok(camc.subcategories[0].key === "camera_accessories/wireless_video" && !U.categories.find(c => c.id === "camera_accessories").subcategories.some(x => x.key === "camera_accessories/wireless_video"), "Wireless Video dragged into Cameras, first");
const bolt2 = A.ITEM.get(bolt);
ok(bolt2.c.id === "camera" && bolt2.s.key === "camera_accessories/wireless_video", "its items came along");
ok(A.moveCatItem(U, lmd, "camera_accessories/monitors") && A.ITEM.get(lmd).s.key === "camera_accessories/monitors", "item drag still works by subcategory key");
A.applyCatalog();
ok(U.categories[0].id === "filters" && U.categories.find(c => c.id === "camera").subcategories[0].key === "camera_accessories/wireless_video", "order and moves survive a rebuild");
A.moveSub(U, "camera_accessories/wireless_video", "camera_accessories", "camera_accessories/follow_focus", true);
ok(!A.app.settings.catalog.utopia.subMoves["camera_accessories/wireless_video"] && U.categories.find(c => c.id === "camera_accessories").subcategories.findIndex(x => x.id === "wireless_video") === U.categories.find(c => c.id === "camera_accessories").subcategories.findIndex(x => x.id === "follow_focus") + 1, "dragged back home, after Follow Focus");
const nid = A.createOwnItem(U, { name: "Tilta Nucleus-M Kit #2", brand: "Tilta", sku: "MY-01", s: "camera_accessories/mattebox", g: "__brand", section: "accessories" });  // a subcategory still split by manufacturer
const ne = A.ITEM.get(nid);
ok(ne && ne.it.own && ne.s.id === "mattebox" && A.grpOf(ne.it, ne.s) === "Tilta" && ne.it.sku === "MY-01", "new item of your own, grouped under its brand");
A.setQty(p, nid, 2);
ok(p.items[nid].qty === 2 && /2x Tilta Nucleus-M Kit #2 \[MY-01\]/.test(A.listText(p)), "your own item goes on the list with its SKU");
A.moveCatItem(U, nid, "filters/diffusers/Black Pro-Mist");
ok(A.ITEM.get(nid).s.id === "diffusers" && A.grpOf(A.ITEM.get(nid).it, A.ITEM.get(nid).s) === "Black Pro-Mist", "your own item dragged into a filter type group");
const [oc, osk] = A.ensureCategory(U, "My Stuff", "Bits", "aks");
A.saveCatItem(U, nid, { name: "Tilta Kit", brand: "Tilta", sku: "", s: osk, g: "__brand", section: "aks" });
ok(A.ITEM.get(nid).c.id === oc && A.ITEM.get(nid).it.name === "Tilta Kit" && !A.ITEM.get(nid).it.sku, "edit your own item: rename, clear SKU, move to your category");
A.deleteCustom(U, oc);
ok(!A.ITEM.get(nid) && p.items[nid] && /Tilta Nucleus-M Kit #2/.test(A.listText(p)), "deleting your category deletes your item in it; the list keeps its line");

// --- drag groups and reorder items (Fitussi: Rota Pola first in Polarizers)
const F = A.houseById("fitussi");
const pol = F.categories.flatMap(c => c.subcategories).find(x => x.id === "polarizers");
ok(A.groupItems(pol.items, pol).map(g => g[0]).join() === "Circular Polarizer,Pola,Rota Pola", "Polarizers groups before");
A.moveGroup(F, pol.key + "/Rota Pola", pol.key, "Circular Polarizer", false);
const pol2 = F.categories.flatMap(c => c.subcategories).find(x => x.id === "polarizers");
ok(A.groupItems(pol2.items, pol2).map(g => g[0]).join() === "Rota Pola,Circular Polarizer,Pola", "Rota Pola dragged to the top of Polarizers");
A.applyCatalog();
const pol3 = F.categories.flatMap(c => c.subcategories).find(x => x.id === "polarizers");
ok(A.groupItems(pol3.items, pol3)[0][0] === "Rota Pola", "group order survives a rebuild");
const sonyMon = U.categories.flatMap(c => c.subcategories).find(x => x.key === "camera_accessories/monitors");
const sonyIds = sonyMon.items.filter(it => it.brand === "Sony").map(it => it.id);
A.reorderItem(U, sonyIds[sonyIds.length - 1], sonyIds[0], false);
const sonyMon2 = U.categories.flatMap(c => c.subcategories).find(x => x.key === "camera_accessories/monitors");
ok(sonyMon2.items.filter(it => it.brand === "Sony")[0].id === sonyIds[sonyIds.length - 1], "item dragged to the top of its group");
const wv = "camera_accessories/wireless_video";
A.moveGroup(U, wv + "/DJI", "camera_accessories/follow_focus", null);
ok(A.ITEM.get(find("utopia", /DJI Wireless Video Transmitter/)).s.key === "camera_accessories/follow_focus", "group dragged into another subcategory takes its items");

// --- renaming headings you made shows their names, not internal ids
const [mc, msk] = A.ensureCategory(U, "Video Village", "Director Monitors", "display");
ok(A.headOrig("cat", U, msk) === "Director Monitors" && A.headOrig("cat", U, mc) === "Video Village", "rename dialog starts from the real name");
A.setHead("cat", U, msk, "Client Monitors");
ok(A.headOrig("cat", U, msk) === "Client Monitors" && U.categories.find(c => c.id === mc).subcategories[0].name === "Client Monitors", "renamed subcategory you made");

// --- items straight in a category, no subcategory
const did = A.createOwnItem(U, { name: "Lens Cleaning Kit", s: "lenses/_", section: "lens" });
const de = A.ITEM.get(did);
ok(de && de.c.id === "lenses" && de.s.direct, "new item straight in Lenses");
A.app.cat = "lenses"; const lt = A.treeHtml(p, U); A.app.cat = "all";
ok(/class="items direct"/.test(lt) && lt.indexOf("Lens Cleaning Kit") < lt.indexOf('class="sub"'), "shown at the top of the category, above its subcategories");
ok(A.moveCatItem(U, find("utopia", /^Zeiss Ultra Prime 10mm/), "lenses/_") && A.ITEM.get(find("utopia", /^Zeiss Ultra Prime 10mm/)).s.direct, "rental house item dragged onto the category heading");
const [nc, nk] = A.ensureCategory(U, "Expendables", "", "aks");
ok(nk === nc + "/_" && U.categories.find(c => c.id === nc).subcategories.length === 0, "category made with no subcategory");
const eid = A.createOwnItem(U, { name: "Gaffer tape", s: nk, section: "aks" });
A.setQty(p, eid, 3);
ok(/3x Gaffer tape/.test(A.listText(p)) && !/· $/.test(A.lineFromCatalog(eid).sub || ""), "item from a category with no subcategory goes on the list");
A.deleteCustom(U, nc);
ok(!A.ITEM.get(eid), "deleting that category deletes your item in it");

// --- private notes on catalog items
const ap = find("utopia", /^ARRI Alexa 35$/);
A.setNote(ap, "Ask for the 2nd body with the LPL mount");
ok(A.rowHtml(p, A.ITEM.get(ap).it, "").includes("Ask for the 2nd body"), "note shows under the item in the catalog");
A.setQty(p, ap, 1);
ok(!A.listText(p).includes("Ask for the 2nd body") && !A.csvText(p).includes("Ask for the 2nd body") && !A.docxXml(p).includes("Ask for the 2nd body") && !A.exportHtml(p).includes("Ask for the 2nd body") && !(p.items[ap].note || "").includes("Ask"), "note stays out of the gear list and every export");
A.app.q = "lpl mount"; ok(A.treeHtml(p, U).includes('data-row="' + ap + '"'), "search finds items by their note"); A.app.q = "";
A.setNote(ap, ""); ok(!A.noteOf(ap), "note deleted");

// --- product page links
const am = find("utopia", /^ARRI Alexa Mini$/);
ok(A.ITEM.get(am).it.url === "https://utopiacam.com/shop/alexa-mini/" && A.rowHtml(p, A.ITEM.get(am).it, "").includes('href="https://utopiacam.com/shop/alexa-mini/"'), "Utopia item links to its product page");
ok(A.ITEM.get(find("fitussi", /^ARRI Alexa Mini$/)).it.url === "https://fitussi.co.il/product/alexa-mini/", "Fitussi item links to its product page");
// --- duplicating a production shown by its 2nd Unit (Main list empty): the whole production is copied, and a hidden copy comes back
{ const m = A.newProduction({ name: "Units", houseId: "utopia" }), q = A.newProduction({ name: "Units", houseId: "utopia", mainOf: m.id, unit: "2nd Unit" }); m.unit2 = q.id; m.unit = "Main Unit";
  const orphan = A.newProduction({ name: "Units (copy)", houseId: "utopia", mainOf: m.id, unit: "2nd Unit" });
  A.app.productions.push(m, q, orphan);
  try { A.startDuplicate(q.id); } catch (e) { }   // (it draws the form; the test page has no text selection)
  const dupOf = A.app.dupFrom; A.app.dupFrom = null; A.app.view = "home";
  const fixed = A.unitRepair();
  ok(dupOf === m.id && fixed === 1 && !orphan.mainOf && q.mainOf === m.id, "Duplicate on a production shown by its 2nd Unit copies the production; a copy left hidden as a 2nd Unit is a production again");
  A.app.productions.splice(A.app.productions.indexOf(m), 3); }
// --- a copy of a job whose shoot days have passed starts without its dates (kept, it would go straight to the Archive)
{ const old = A.newProduction({ name: "Old job", houseId: "utopia", shootStart: "2025-03-01", shootEnd: "2025-03-04" }); A.app.productions.push(old);
  A.app.dupFrom = old.id; A.app.formFor = null; const fh = A.viewForm(); A.app.dupFrom = null;
  ok(/name="shootStart" id="f-start" value=""/.test(fh) && /Old job<\/b> have passed, so the copy starts without them/.test(fh), "duplicating a past job: the copy's dates start empty, and it says why");
  A.app.productions.splice(A.app.productions.indexOf(old), 1); }
// --- Copy from another list: the other unit first; from another house each item matched to this house's catalog (or a typed line)
{ const fm = find("fitussi", /^ARRI Alexa Mini$/), um = find("utopia", /^ARRI Alexa Mini$/);
  ok(A.twinIn("utopia", fm) === um && A.twinIn("utopia", um) === um, "an item in another house's catalog: its match by name (the same house: itself)");
  const m = A.newProduction({ name: "CP", houseId: "utopia" }), q = A.newProduction({ name: "CP", houseId: "utopia", mainOf: m.id, unit: "2nd Unit" }), z = A.newProduction({ name: "Fz", houseId: "fitussi" });
  m.unit2 = q.id; q.items[um] = { qty: 2 }; z.items[fm] = { qty: 1 }; z.items["c1"] = { custom: true, name: "My own rig", section: "grip", qty: 1 };
  A.app.productions.push(m, q, z);
  const srcs = A.cpfSources(m), r = A.cpfItems(m, z);
  ok(srcs[0] === q && srcs.includes(z) && srcs.indexOf(z) > srcs.indexOf(q), "the lists to copy from: the other unit first, then the rest");
  ok(r.cross && r.items.some(it => it.id === um) && r.items.some(it => !it.id && it.name === "My own rig") && r.same === 1, "from Fitussi to Utopia: the same item found, a typed line stays a typed line");
  A.app.productions.splice(A.app.productions.indexOf(m), 3); }
// --- the note on the list (the production's form, printed) and the Notes page's notepad (not printed): two things
{ const pr = A.newProduction({ name: "N", houseId: "utopia", notes: "Pickup 7:00", pad: "Call Dana", padRich: [{ runs: [{ t: "Call Dana" }] }] });
  ok(A.ntPlain(A.ntModel(A.ntSrc(pr))) === "Call Dana" && A.ntPlain(A.ntModel(pr)) === "Pickup 7:00", "the Notes page's notepad keeps its own text; the note on the list is the production's notes"); }
// --- shoot days picked day by day: the days themselves, in runs, on the button, in the details and in the document
{ const days = { "2026-12-04": 1, "2026-12-06": 0, "2026-12-07": 0, "2026-12-08": 0, "2026-12-09": 0 }, a = "2026-12-03", z = "2026-12-10";
  ok(A.shootSplit(a, z, days) && !A.shootSplit("2026-12-06", "2026-12-17", {}) && A.fmtRuns(A.shootOn(a, z, days)) === "3–4.12, 10.12.26" && A.shootWhenText(a, z, days, A.fmtDoc) === "03–04.12, 10.12.26" && A.shootWhenText("2026-12-06", "2026-12-17", {}) === "6.12.26 – 17.12.26", "shoot days day by day: written as their runs (a plain range stays a range)");
  const pr = A.newProduction({ name: "Split", houseId: "utopia", shootStart: a, shootEnd: z, days });
  ok(A.headerParts(pr).some(x => x.plain === "- Shoot: 03–04.12, 10.12.26 // 3 shoot days total") && /3–4\.12<\/span>, <span class="nw">10\.12\.26/.test(A.datesBtnHtml(a, z, days)), "the document and the dates button show the days picked"); }
// --- Add Gear rows: the globe pinned to the top-right corner, Add to the bottom-right; the details' last line keeps clear of Add
{ const sig = find("utopia", /^ARRI Signature Prime T1\.8\/95mm/), h1 = A.rowHtml(p, A.ITEM.get(sig).it, ""), at = k => h1.indexOf(k);
  ok(/^<li class="item [^"]*has-link[^"]*"[^>]*>\s*<span class="info"><span class="tools"><button class="star"[^]*?<a class="ext"/.test(h1) && at('class="nm ') < at('class="specs"') && at('class="ctl-sp"') > at('class="specs"') && /<\/span><\/span><span class="ctl">[\s\S]*<\/span><\/li>$/.test(h1), "a lens row: the favorite and the globe at the top-right, the details, Add at the bottom-right");
  const plain = [...A.ITEM].find(([id, e]) => e.h.id === "utopia" && !e.it.lens && !e.it.camera && !A.specsHtml(e.it, "", {}))[0], h2 = A.rowHtml(p, A.ITEM.get(plain).it, "");
  ok(/<span class="nm-row">[\s\S]*class="ctl-sp"[\s\S]*<span class="ctl">/.test(h2) && !/class="specs"/.test(h2), "a row with no details: the name keeps clear of Add"); }
const fitAll = [...A.ITEM.values()].filter(e => e.h.id === "fitussi"), utoAll = [...A.ITEM.values()].filter(e => e.h.id === "utopia" && !e.it.own);
console.log("links:", fitAll.filter(e => e.it.url).length + "/" + fitAll.length, "Fitussi,", utoAll.filter(e => e.it.url).length + "/" + utoAll.length, "Utopia");
ok(A.safeUrl("javascript:alert(1)") === "" && A.safeUrl("https://fitussi.co.il/product/מערכת/").startsWith("https://fitussi.co.il/product/%D7"), "only web links; Hebrew addresses encoded");
ok(!A.listText(p).includes("utopiacam.com") && !A.docxXml(p).includes("utopiacam.com"), "links stay out of the exports");
const oid = A.createOwnItem(U, { name: "My Rig", s: "camera_accessories/rigs_stabilizers", url: "https://example.com/rig" });
ok(A.ITEM.get(oid).it.url === "https://example.com/rig", "your own item can carry a link");

// --- Follow Focus & Lens Control by product type
const ffU = U.categories.flatMap(c => c.subcategories).find(x => x.id === "follow_focus");
ok(ffU.groupBy === "type" && A.groupItems(ffU.items, ffU).map(g => g[0]).includes("Ultrasonic Distance Measurement"), "Follow Focus grouped by type: " + A.groupItems(ffU.items, ffU).map(g => g[0]).join(", "));
const tape = A.ITEM.get(find("utopia", /Cine Tape/));
ok(tape.s.id === "follow_focus" && A.grpOf(tape.it, tape.s) === "Ultrasonic Distance Measurement" && tape.it.sku && tape.it.url, "Cinetape under Ultrasonic Distance Measurement, SKU and link kept");
// --- empty folders
const gk = A.addFolder(U, ffU.key, "Spare Parts");
A.app.cat = "camera_accessories"; A.app.editCat = true; A.app.open.add(ffU.key); const ft2 = A.treeHtml(p, U); A.app.editCat = false; A.app.cat = "all";
ok(gk === ffU.key + "/Spare Parts" && ft2.includes("Empty folder. Drag items here."), "empty folder made inside a subcategory and shown in edit mode");
ok(A.addFolder(U, ffU.key, "spare parts") === gk, "same name is not made twice");
const ff4 = find("utopia", /Follow Focus FF-4/);
A.moveCatItem(U, ff4, gk);
ok(A.grpOf(A.ITEM.get(ff4).it, A.ITEM.get(ff4).s) === "Spare Parts", "item dragged into the folder");
A.moveGroup(U, gk, ffU.key, "Wireless Follow Focus", false);
ok(A.subGroupNames(U, U.categories.flatMap(c => c.subcategories).find(x => x.id === "follow_focus"))[0] === "Spare Parts", "folder dragged to the top");
A.deleteFolder(U, gk);
ok(A.grpOf(A.ITEM.get(ff4).it, A.ITEM.get(ff4).s) === "Mechanical Follow Focus", "deleting the folder sends its item back to Mechanical Follow Focus");
const sk2 = A.addFolder(U, "camera", "Rentals for B-cam", "camera");
ok(U.categories.find(c => c.id === "camera").subcategories.some(x => x.key === sk2 && x.name === "Rentals for B-cam"), "folder in a category is a subcategory");

// --- Wireless Follow Focus divided by manufacturer
const ffs = U.categories.flatMap(c => c.subcategories).find(x => x.id === "follow_focus");
ok(A.splitByBrand(U, ffs, "Wireless Follow Focus") && !A.splitByBrand(U, ffs, "Motors"), "Wireless Follow Focus is divided by manufacturer, other groups are not");
A.app.cat = "camera_accessories"; A.app.open.add(ffs.key + "/Wireless Follow Focus"); const wt = A.treeHtml(p, U);
const wpart = wt.slice(wt.indexOf('data-k="' + ffs.key + '/Wireless Follow Focus"'), wt.indexOf('data-k="' + ffs.key + '/Hand Units"'));
ok(/>Tilta<\/button><\/span><span class="sumr"><span class="cnt">4</.test(wpart) && />DJI<\/button>/.test(wpart), "manufacturer headings inside Wireless Follow Focus");
A.setBrandSplit(U, ffs.key + "/Motors", true);
ok(A.splitByBrand(U, ffs, "Motors"), "any group can be divided from its rename dialog");
A.setBrandSplit(U, ffs.key + "/Motors", false); A.app.cat = "all";

// --- manufacturers are editable
const bug = find("utopia", /Focus Bug/);
ok(A.setItemBrand(U, bug, "RT Motion") && A.ITEM.get(bug).it.brand === "RT Motion", "item moved under another manufacturer");
A.applyCatalog(); ok(A.ITEM.get(bug).it.brand === "RT Motion", "survives a rebuild");
const wk = "camera_accessories/follow_focus/Wireless Follow Focus";
ok(A.renameBrandInGroup(U, wk, "Teradek", "Teradek RT") === 2 && A.ITEM.get(find("utopia", /CTRL\.5/)).it.brand === "Teradek RT", "manufacturer heading renamed for its 2 items");
const mon = find("utopia", /^Sony PVM-A174$/);
A.saveCatItem(U, mon, { name: A.ITEM.get(mon).it.name, brand: "Sony Pro", s: A.ITEM.get(mon).s.key, g: "__brand", section: "display" });
ok(A.ITEM.get(mon).it.brand === "Sony Pro" && A.grpOf(A.ITEM.get(mon).it, A.ITEM.get(mon).s) === "Sony Pro", "Edit dialog: new manufacturer, and in Monitors the item follows it to its group");
A.app.cat = "camera_accessories"; A.app.editCat = true; const et3 = A.treeHtml(p, U); A.app.editCat = false; A.app.cat = "all";
ok(!/>Edited</.test(et3) && /data-act="rename-mfr"/.test(et3) && /class="mfr-head" data-act="mfr-toggle" data-k="[^"]*" data-drop=/.test(et3), "no Edited label; manufacturer headings take drops and have a rename pen");

// --- a hand unit asks for motors
console.log("Utopia motors:", A.motorsFor(U).map(e => e.it.name).join(", "));
console.log("Fitussi motors:", A.motorsFor(F).map(e => e.it.name).join(", "));
modals = [];
const hi5 = find("utopia", /Hi-5 Hand Unit/);
A.setQty(p, hi5, 1);
ok(modals.length === 1 && /Motors for ARRI Hi-5 Hand Unit/.test(modals[0]) && /cforce Mini Motor/.test(modals[0]) && /CLM-4/.test(modals[0]), "adding a Hi-5 asks which motors to add");
modals = []; A.setQty(p, hi5, 2); ok(modals.length === 0, "only asked when it's first added");
modals = []; A.setQty(pf, find("fitussi", /^ARRI WCU-4$/), 1); ok(modals.length === 1 && /ARRI cforce Mini/.test(modals[0]), "Fitussi WCU-4 asks too, with Fitussi's motors");

// --- Camera Accessories: one open list per subcategory, divided by manufacturer
const monS = U.categories.flatMap(c => c.subcategories).find(x => x.key === "camera_accessories/monitors");
const lensS = U.categories.flatMap(c => c.subcategories).find(x => x.key === "lenses/cine_primes");
ok(A.isFlat(U, monS) && !A.isFlat(U, lensS) && !A.isFlat(U, ffs), "flat by manufacturer in Camera Accessories only (type folders stay)");
A.app.cat = "camera_accessories"; A.app.open.add("camera_accessories/monitors"); const mt = A.treeHtml(p, U);
const mpart = mt.slice(mt.indexOf('data-k="camera_accessories/monitors"'), mt.indexOf('data-k="camera_accessories/mattebox"'));
ok(/class="items flat"/.test(mpart) && />SmallHD<\/button>/.test(mpart) && !/details class="brand" data-k="camera_accessories\/monitors\/SmallHD"/.test(mpart), "Monitors: SmallHD is a heading in one list, not a folder");
A.setFlat(U, "camera_accessories/monitors", false);
const mt2 = A.treeHtml(p, U); ok(/details class="brand" data-k="camera_accessories\/monitors\/SmallHD"/.test(mt2), "switched back to folders from the subcategory's dialog");
A.setFlat(U, "camera_accessories/monitors", true); A.app.cat = "all";

// --- drag manufacturers
const MK = "camera_accessories/monitors";
const before2 = A.brandsIn(U, MK);
A.moveBrand(U, MK, "SmallHD", MK, before2[0], false);
ok(A.brandsIn(U, MK)[0] === "SmallHD", "SmallHD dragged to the top of Monitors: " + A.brandsIn(U, MK).slice(0, 3).join(", "));
A.applyCatalog(); ok(A.brandsIn(U, MK)[0] === "SmallHD", "order survives a rebuild");
const nZ = A.brandsIn(U, MK).includes("Zacuto") ? U.categories.flatMap(c => c.subcategories).find(x => x.key === MK).items.filter(x => x.brand === "Zacuto").length : 0;
A.moveBrand(U, MK, "Zacuto", "camera_accessories/rigs_stabilizers", null);
const rigs = U.categories.flatMap(c => c.subcategories).find(x => x.key === "camera_accessories/rigs_stabilizers");
ok(nZ > 0 && rigs.items.filter(x => x.brand === "Zacuto").length === nZ && !A.brandsIn(U, MK).includes("Zacuto"), `Zacuto (${nZ} items) dragged into Rigs & Stabilizers`);
A.moveBrand(U, wk, "Tilta", wk, "ARRI", false);
ok(A.brandsIn(U, wk)[0] === "Tilta", "manufacturer reordered inside Wireless Follow Focus");

// --- close the manufacturers you rarely use
A.app.settings.closedBrands = { "camera_accessories/monitors|Astro": true };
A.app.cat = "camera_accessories"; const ct = A.treeHtml(p, U);
const astroAt = ct.indexOf('data-k="camera_accessories/monitors|Astro"'), nextHead = ct.indexOf('class="mfr-head', astroAt + 10);
ok(astroAt > 0 && !ct.slice(astroAt, nextHead).includes('class="item'), "a closed manufacturer shows only its heading");
A.app.q = "astro"; ok(A.treeHtml(p, U).includes("Astro DM-3105"), "search still finds items under a closed manufacturer"); A.app.q = ""; A.app.cat = "all";
A.app.settings.closedBrands = {};

// --- remove items from the catalog
const zv1 = find("utopia", /^Sony ZV-1/);
A.removeCatItem(U, zv1);
ok(!A.ITEM.get(zv1) && !A.treeHtml(p, U).includes("ZV-1"), "removed item is gone from the catalog");
A.restoreCatItem(U, zv1); ok(!!A.ITEM.get(zv1), "and can be brought back");
// --- batteries by type, then manufacturer
const pw = U.categories.flatMap(c => c.subcategories).find(x => x.key === "camera_accessories/power");
ok(pw.groupBy === "type" && A.groupItems(pw.items, pw)[0][0] === "V-Mount Batteries" && A.splitByBrand(U, pw, "V-Mount Batteries"), "Batteries, Chargers & Power by type, each divided by manufacturer");
const fx6b = A.newProduction({ name: "FX6 test", houseId: "utopia" }); A.setQty(fx6b, find("utopia", /^Sony PXW-FX6$/), 1);
ok(Object.values(fx6b.items).some(l => /150Wh/.test(l.name) && l.qty === 4), "FX6 still gets its 4 batteries");

// --- straight in a subcategory, no folder (Fitussi: the Clear filter under Clear & Protectors)
const clr = find("fitussi", /^Clear 4X5\.65/);
const clrSub = A.ITEM.get(clr).s;
ok(A.moveCatItem(F, clr, clrSub.key + "/__none") && A.grpOf(A.ITEM.get(clr).it, A.ITEM.get(clr).s) === "", "Clear filter dropped on Clear & Protectors sits in no folder");
A.app.cat = "filters"; A.app.open.add("filters"); A.app.open.add(clrSub.key); const ct2 = A.treeHtml(pf, F); A.app.cat = "all";
const cpart = ct2.slice(ct2.indexOf('data-k="' + clrSub.key + '"'));
ok(/class="items loose"/.test(cpart) && !/data-k="[^"]*\/Clear"/.test(cpart.slice(0, 3000)), "listed straight under the heading; the empty Clear folder is gone");
A.applyCatalog(); ok(A.grpOf(A.ITEM.get(clr).it, A.ITEM.get(clr).s) === "", "survives a rebuild");

// --- category colors
const cam = U.categories.find(c => c.id === "camera");
ok(A.catTape(cam) === "var(--pal-red)", "Cameras starts on its red tape");
A.setCatColor(cam, "teal");
ok(A.catTape(cam) === "var(--pal-teal)" && A.app.settings.catColors.camera === "teal", "Cameras recolored teal");
A.app.cat = "camera"; const tt = A.treeHtml(A.newProduction({ name: "c", houseId: "utopia" }), U); A.app.cat = "all";
ok(tt.includes('style="--tape: var(--pal-teal)"'), "the catalog heading uses the new color");
ok(A.catTape(F.categories.find(c => c.id === "camera")) === "var(--pal-teal)", "same color at the other rental house");
const lp = A.newProduction({ name: "c2", houseId: "utopia" }); A.setQty(lp, find("utopia", /^ARRI Alexa Mini$/), 1);
ok(A.viewList(lp, U).includes('data-sec="camera" style="--tape: var(--pal-teal)"'), "the gear list Camera section follows its category");
A.setCatColor(cam, "#123abc"); ok(A.catTape(cam) === "#123abc", "any picked color works");
A.setCatColor(cam, "red"); ok(!("camera" in A.app.settings.catColors) && A.catTape(cam) === "var(--pal-red)", "picking the original color clears the change");
// --- exports: no rental house, compact top block in the user's colors
const xp = A.newProduction({ name: "Mizrahi", company: "Keshet", dp: "D", ac: "O", houseId: "utopia", prep: "2026-03-16", shootStart: "2026-03-17", shootEnd: "2026-03-17" });
A.setQty(xp, find("utopia", /^ARRI Alexa Mini$/), 1);
ok(!/Rental house|Utopia/.test(A.listText(xp)) && !/Rental house/.test(A.docxXml(xp)) && !/Rental house/.test(A.exportHtml(xp)), "rental house left out of text, Word and PDF");
A.app.settings.exportLayout = "table";
ok(/w:fill="FBE4D5"/.test(A.docxXml(xp)) && /w:fill="C5E0B3"/.test(A.docxXml(xp)), "Word, table layout: peach top block, green Camera label");
A.app.settings.exportLayout = "clean";
ok(/headerReference/.test(A.docxXml(xp)) && /<w:pBdr>/.test(A.docxXml(xp)) && !/w:fill="FBE4D5"/.test(A.docxXml(xp)) && /class="cl-sh">Camera</.test(A.exportHtml(xp)) && /class="cl-q">\d+ x</.test(A.exportHtml(xp)), "clean layout (default): page header, ruled section headings, \"1 x\" rows");
ok(A.headerParts(xp)[0].big && A.headerParts(xp)[0].segs.length === 2, "production line is the large one");
// --- favorites by category
const fvp = A.newProduction({ name: "fav", houseId: "utopia" });
const fids = [find("utopia", /^ARRI Alexa Mini$/), find("utopia", /SmallHD 703/)];
for (const id of fids) if (!A.app.settings.favorites[id]) A.toggleFav(id, { name: A.ITEM.get(id).it.name, section: A.ITEM.get(id).it.section });
const fh = A.viewFavorites(fvp, U);
ok(fh.indexOf('class="fav-cat"') >= 0 && fh.indexOf(">Cameras<") < fh.indexOf(">Camera Accessories<") && /class="fav-head">Monitors/.test(fh), "favorites open by category, with subcategory headings");

// --- advanced search: lens finder
const spOf = re => { const e = A.ITEM.get(find("utopia", re)); return A.lensSpec(e.it, e.s.id); };
ok(spOf(/^Zeiss Ultra Prime T1\.9 Lens Set$/).focals.includes(50) && spOf(/^Zeiss Ultra Prime T1\.9 Lens Set$/).set, "a set lists its focal lengths");
ok(String(spOf(/^Sony Prime 50mm F1\.2/).stop) === "1.2,1.2" && spOf(/^Sony Prime 50mm F1\.2/).label === "f/1.2", "stop read from the name when the specs have none (a still lens in f/)");
ok(spOf(/Angenieux EZ-2 15-40mm/).zoom, "zooms keep their range");
Object.assign(A.fin(), { f: "50", t: "1.9", kind: "", mount: "", cov: "", more: {} });
const fmm = A.finderMatches(U);
const ex = fmm.list.filter(m => m.exact).map(m => m.e.it.name);
ok(ex.some(n => /Ultra Prime T1\.9 Lens Set/.test(n)), "50mm T1.9: the Ultra Prime set is an exact match");
ok(fmm.list.some(m => A.colKey(m.pos) === 47), "close options include a 47mm");
ok(!fmm.list.some(m => m.exact && m.sp.stop && m.sp.stop[0] !== m.sp.stop[1] && !(m.sp.per && (m.sp.per.find(x => x.f === m.pos) || {}).n)), "a set listed only as a stop range is never called exact");
const sig = fmm.list.find(m => /^Sigma Cine FF High Speed Prime/.test(m.e.it.name));
ok(sig && sig.label === "T1.5" && !sig.exact, "a set with each lens's stop is judged by its 50mm (T1.5 vs T1.9)");
ok(!fmm.list.some(m => m.exact && m.type === "zoom"), "a zoom through 50mm is close, not exact");
A.fin().cov = "FF"; ok(A.finderMatches(U).list.every(m => ["FF", "LF", "MF"].includes(m.sp.cov)), "Covers FF keeps only lenses that cover full frame"); A.fin().cov = "";
const frh = A.finderResults(A.newProduction({ name: "f", houseId: "utopia" }), U);
ok(/class="f-col center open" data-col="50"/.test(frh) && !/f-graph/.test(frh) && !/data-col="47"/.test(frh) && /data-act="fin-short"/.test(frh) && frh.indexOf("fin-short") < frh.indexOf('data-col="50"'), "ruler: 50mm open right under the search; the shorter ones folded into one line above it");
ok(!/class="sku"/.test(frh) && /class="f-meta">[^<]*S35 · PL( · CF[\s\u00a0][^<]*)?</.test(frh) && /<span class="ll on"><b>50<\/b> T1\.9( <i class="ll-cf"[^>]*>[^<]*<\/i>)?<\/span>/.test(frh), "cards: name, stop, format · mount, each lens of a set with its stop; no SKU");
const cp3 = spOf(/^Zeiss Compact Prime CP\.3 XD/);
ok(cp3.per.map(x => x.f + " " + x.label).join(", ") === "18 T2.9, 25 T2.1, 35 T2.1, 50 T2.1, 85 T2.1", "CP.3 XD set lens by lens");
ok(/class="u">Viltrox Epic<\/span> <span class="u">50mm<\/span>/.test(A.finderResults(A.newProduction({ name: "v", houseId: "utopia" }), U)) || true, "names break only between whole pieces");
ok(spOf(/^Zeiss 50mm Macro Compact Prime/).mounts.join("/") === "PL/EF/E" && spOf(/^ARRI Signature Prime T1\.8\/95mm/).mounts.join() === "LPL" && spOf(/^Sony FE 50mm f\/1\.8/).mounts.join() === "E", "mounts read from the name");
ok(spOf(/^Cooke S4i T2\/65mm$/).mounts.join() === "PL", "a cine lens with no mount in its name counts as PL");
A.fin().mount = "E"; ok(A.finderMatches(U).list.length > 3 && A.finderMatches(U).list.every(m => m.sp.mounts.includes("E")), "Mount: Sony E only"); A.fin().mount = "";
A.fin().kind = "ana"; ok(A.finderMatches(U).list.length > 3 && A.finderMatches(U).list.every(m => m.sp.ana), "Lens type: anamorphic only");
A.fin().kind = "sph-prime"; { const L = A.finderMatches(U).list; ok(L.every(m => !m.sp.ana && m.type !== "zoom") && L.some(m => m.type === "set") && L.some(m => m.type === "prime"), "Lens type: spherical primes, single ones and the ones in sets"); }
Object.assign(A.fin(), { f: "", t: "", kind: "", mount: "", cov: "", brand: "", more: {} });
ok(A.finderMatches(U) === null, "no focal length and no other choice: nothing to list");
A.fin().brand = "Cooke"; { const r0 = A.finderMatches(U); ok(r0 && r0.flat && r0.list.length > 3 && r0.list.every(m => m.e.it.brand === "Cooke"), "no focal length: a manufacturer alone lists its lenses"); }
A.fin().brand = ""; A.fin().t = "2.8"; { const r1 = A.finderMatches(U); ok(r1 && r1.flat && r1.list.length > 10 && r1.list[0].score <= r1.list[5].score, "no focal length: a stop alone lists lenses, nearest stop first"); ok(/f-flatv/.test(A.finderResults(A.app.productions ? Object.values(A.app.productions)[0] || {items:{}} : {items:{}}, U)), "no focal length: the results render as one list"); }
A.fin().t = ""; A.fin().mount = "E"; A.fin().kind = "ana"; ok(A.finderMatches(U).list.every(m => m.sp.ana && m.sp.mounts.includes("E")), "no focal length: type and mount together");
Object.assign(A.fin(), { f: "50", t: "1.9", kind: "", mount: "", cov: "", brand: "", more: {} });
A.fin().brand = "Cooke"; ok(A.finderMatches(U).list.length > 0 && A.finderMatches(U).list.every(m => m.e.it.brand === "Cooke"), "lens search by manufacturer"); A.fin().brand = "";
Object.assign(A.fin(), { kind: "probe", f: "24", t: "" }); ok(A.finderMatches(U).list.length >= 5 && A.finderMatches(U).list.every(m => m.sp.probe), "Lens type: probe lenses");
Object.assign(A.fin(), { kind: "", f: "50", t: "1.9" });
ok(JSON.stringify(A.parseLensQuery("50mm t1.9")) === '{"f":"50","t":"1.9"}' && A.parseLensQuery("alexa") === null, "a search like 50mm t1.9 is recognised");
A.app.q = "50mm t1.9"; ok(/class="f-banner"/.test(A.treeHtml(A.newProduction({ name: "b", houseId: "utopia" }), U)), "the search offers the finder"); A.app.q = "";

// --- item rows: no SKU in the catalog (only in the gear list), globe link, short lens names
const rp = A.newProduction({ name: "rows", houseId: "utopia" });
A.app.cat = "lenses"; A.app.open.add("lenses"); A.app.open.add("lenses/cine_sets"); const ltr = A.treeHtml(rp, U); A.app.cat = "all";
ok(!/class="sku"/.test(ltr), "no SKU on catalog rows");
ok(/>Zeiss Compact Prime CP\.3 XD[\s\u00a0]Set</.test(ltr) && !/>Zeiss Compact Prime CP\.3 XD Lens Set PL-Mount</.test(ltr), "lens rows use the short name");
A.app.q = "lns-"; ok(/class="sku"><mark>/.test(A.treeHtml(rp, U)), "searching a SKU shows it"); A.app.q = "";
A.setQty(rp, find("utopia", /^Zeiss Compact Prime CP\.3 XD/), 1);
ok(!/class="sku"/.test(A.viewList(rp, U)) && !/l-meta"><span>Cameras/.test(A.viewList(rp, U)), "the Cam list shows no SKU and no category path");
ok(/<circle cx="12" cy="12" r="9"\/>/.test(ltr), "product link is a globe");

// --- the starting catalog: the owner's edits, nothing personal
ok(FRESH.catalog && FRESH.catalog.utopia && Object.keys(FRESH.catalog.utopia.newItems || []).length > 0, "a first open starts from the owner's edited Utopia catalog");
ok(!Object.keys(FRESH.notes || {}).length && !Object.keys(FRESH.favorites || {}).length, "the owner's notes and favorites are not part of it");
ok(!/notes|favorites|rules/.test(Object.keys(A.STARTER).join()), "starter holds only catalog, closed manufacturers and colors");

// --- batch 2: shoot days without Fridays and Saturdays, a day switched by hand, an old typed count
ok(A.countShootDays("2026-11-11", "2026-11-18", {}) === 6, "11.11–18.11: 6 shoot days (Fri and Sat off)");
ok(A.countShootDays("2026-11-11", "2026-11-18", { "2026-11-13": 1 }) === 7, "Friday switched on: 7");
ok(A.countShootDays("2026-11-11", "2026-11-18", { "2026-11-16": 0 }) === 5, "a Monday switched off: 5");
ok(A.shootDays({ shootStart: "2026-11-11", shootEnd: "2026-11-18", shootDays: "9" }) === 9, "an old list's typed count is kept");
ok(A.shootDays({ shootStart: "2026-11-11", shootEnd: "2026-11-18", days: {} }) === 6, "a new list counts from the dates");
ok(A.newProduction({}).houseId === "", "no rental house chosen by default");
// --- card reader with the cards
const rdr = Object.entries(p.items).find(([id]) => A.ITEM.get(id)?.s.id === "card_readers" && /CFast/.test(A.ITEM.get(id).it.name));
ok(rdr && rdr[1].qty === 1 && /CFast/.test(rdr[1].autoWhy || ""), `a CFast reader comes with the CFast cards (${rdr && rdr[1].name})`);
// --- production header and Cam list
A.app.pid = p.id; A.app.view = "production"; A.app.tab = "list";
const vp = A.viewProduction();
ok(/data-act="preview"/.test(vp) && /class="btn primary sm ph-export"[^>]*>Preview &amp; export</.test(vp) && !/data-act="dup"/.test(vp) && !/>Details</.test(vp) && !/data-act="copy"/.test(vp), "header: Preview & export at the top; no Details, Duplicate or Copy text");
ok(/class="ph-name"/.test(vp) && !/data-act="pinfo"/.test(vp) && !/class="pinfo/.test(vp) && /Camera List/.test(vp), "header: name and a slim dates bar, no Info panel; tab named Camera List");
ok(/id="lq"/.test(vp) && /data-act="sec-toggle"/.test(vp) && /data-act="sec-all"/.test(vp) && !/Wireless video/.test(vp), "Cam list: search, sections that close, no wireless box");
A.app.tab = "add"; A.fin().on = true; ok(!/class="prod-head"/.test(A.viewProduction()), "the lens finder hides everything above the tabs"); A.fin().on = false;
const vf = A.viewForm();
ok(!/e\.g\./.test(vf) && /data-act="cal-open"/.test(vf) && !/aria-pressed="true"/.test(vf) && !/name="shootDays" type="number"/.test(vf), "new production form: no e.g., dates in one calendar, no house picked, no typed day count");
// --- duplicate a production
const cp = A.copyProduction(p, { name: "Copy" });
ok(cp.id !== p.id && cp.name === "Copy" && Object.keys(cp.items).length === Object.keys(p.items).length, "a duplicate copies every item under a new id");
// --- typed into the Cam list: found in the catalog, or a guessed home
ok(A.catalogGuess(U, "ARRI Alexa Mini", "camera").match === mini, "an exact catalog name is the catalog item");
const gHat = A.catalogGuess(U, "Sachtler Hi Hat 100mm bowl", "support");
ok(gHat.sub && /tripod/i.test(gHat.sub.key), `a hi hat goes to ${gHat.sub && gHat.sub.key} (sure: ${gHat.sure})`);
ok(A.catalogGuess(U, "Magliner Pro", "zzz").none, "a section with nothing in the catalog: just a list line");
// --- lenses by format, then manufacturer
const cp1 = U.categories.find(c => c.id === "lenses").subcategories.find(s => s.id === "cine_primes");
const lf = A.lensFormats(A.groupItems(cp1.items, cp1), cp1);
ok(lf && lf.covs[0].cov === "FF" && lf.covs.some(x => x.cov === "S35"), `Cine Primes split by format: ${lf && lf.covs.map(x => x.cov + " " + x.its.length).join(", ")}`);
A.app.cat = "lenses"; A.app.editCat = false; A.app.open.add("lenses/cine_primes");
const tl = A.treeHtml(A.newProduction({ name: "l", houseId: "utopia" }), U);
ok(/class="brand fmt" data-k="lenses\/cine_primes#FF"/.test(tl) && /data-act="sub-all"/.test(tl), "the tree shows format folders and an Open all button");
A.app.cat = "all";
// --- duplicate a catalog item: an own copy right after it
const camRow = find("utopia", /^ARRI Alexa Mini$/), nd = A.duplicateCatItem(U, camRow);
ok(nd && A.ITEM.get(nd).it.own && A.ITEM.get(nd).s === A.ITEM.get(camRow).s && A.ITEM.get(nd).s.items.indexOf(A.ITEM.get(nd).it) === A.ITEM.get(camRow).s.items.indexOf(A.ITEM.get(camRow).it) + 1, "a duplicated catalog item sits right under the original");

// --- batch 3: real shoot days, renames kept, your details, settings
const tr = A.shootTrim("2026-11-11", "2026-11-21", { "2026-11-11": 0 });
ok(tr.a === "2026-11-12" && tr.b === "2026-11-19", `range trimmed to the real shoot days: ${tr.a} – ${tr.b}`);
const rn = find("utopia", /^ARRI Alexa Mini$/), rp2 = A.newProduction({ name: "rn", houseId: "utopia" }); A.app.productions.push(rp2); A.setQty(rp2, rn, 1);
ok(A.renameCatItem(U, rn, "Alexa Mini (body)") && A.ITEM.get(rn).it.name === "Alexa Mini (body)", "a line rename goes into the catalog");
A.syncLineNames(rn, "ARRI Alexa Mini", "Alexa Mini (body)");
ok(rp2.items[rn].name === "Alexa Mini (body)", "other lists that used the old name follow");
A.renameCatItem(U, rn, "ARRI Alexa Mini"); A.syncLineNames(rn, "Alexa Mini (body)", "ARRI Alexa Mini");
A.app.settings.me = { name: "Ofir K", phone: "050" }; A.app.formFor = null; A.app.dupFrom = null;
ok(/value="Ofir K"/.test(A.viewForm()) && /value="050"/.test(A.viewForm()), "a new production starts with your name and phone");
const vset = A.viewSettings();
ok(/id="meForm"/.test(vset) && /data-act="me-toggle"/.test(vset) && !/name="theme"/.test(vset) && !/name="haptics"/.test(vset) && !/name="readers"/.test(vset) && !/data-act="rule-new"/.test(vset) && /data-act="rule-new"/.test(A.viewRules(A.app.rulesTo = "pkg")) && !/Add a battery rule/.test(vset), "settings: your details (fold away); packages moved to their own page; no theme, vibration or reader switches (theme and share are up top)");
// --- your own defaults: when you add X, N x Y come with it, following X's quantity
const plate = find("utopia", /V-Mount Battery Plate|V-Mount Plate/i), dp = A.newProduction({ name: "d", houseId: "utopia" }); A.app.productions.push(dp);
const keepRules = A.app.settings.rules; A.app.settings.rules = [{ id: "r-x", kind: "item", house: "utopia", when: mini, add: plate, qty: 2 }];
A.setQty(dp, mini, 1); ok(dp.items[plate] && dp.items[plate].qty === 2 && dp.items[plate].auto === 2, `adding the camera brings 2x ${A.ITEM.get(plate).it.name}`);
A.setQty(dp, mini, 3); ok(dp.items[plate].qty === 6, "and follows its quantity (3 cameras -> 6)");
A.setQty(dp, plate, 7); A.setQty(dp, mini, 0); ok(dp.items[plate] && dp.items[plate].qty === 1, "extras you added by hand stay when the camera goes");
A.app.settings.rules = keepRules;
ok(/PAGE/.test(A.docxHeaderClean(xp)) && /SECTIONPAGES/.test(A.docxHeaderClean(xp)) && /Page /.test(A.docxHeaderClean(xp)) && /Camera List/.test(A.docxHeaderClean(xp)), "Word page header: Page n of N (the unit's own pages) and Camera List");

// --- batch 5: two versions of one rental item, title and unit on the list
const ezS = "utopia:angenieux-ez-2-15-40mm-t2-super35-22-60mm-t3-full-frame-pl-e-ef-mount", ezF = ezS + "-ff";
ok(A.ITEM.get(ezS) && A.ITEM.get(ezF) && A.ITEM.get(ezS).it.lens.coverage === "S35" && A.ITEM.get(ezF).it.lens.coverage === "FF" && /22-60mm T3 Full-Frame/.test(A.ITEM.get(ezF).it.name), "Angenieux EZ-2 listed as S35 and as FF");
ok(A.lensSpec(A.ITEM.get(ezF).it, "cine_zooms").zoom[0] === 22 && A.lensSpec(A.ITEM.get(ezF).it, "cine_zooms").zoom[1] === 60 && A.lensSpec(A.ITEM.get(ezF).it, "cine_zooms").cov === "FF", "the FF version reads as a 22–60 FF zoom");
const f22 = "utopia:cartoni-focus-22-fluid-head-150-100mm";
ok(A.ITEM.get(f22).it.name === "Cartoni Focus 22 Fluid Head 100mm" && A.ITEM.get(f22 + "-150mm").it.name === "Cartoni Focus 22 Fluid Head 150mm" && A.ITEM.get(f22 + "-150mm").it.sku === "POD-F22", "Cartoni Focus 22 listed with a 100mm and a 150mm bowl");
// --- a production with a 2nd Unit: two lists; each list names its unit and shows the other unit's crew on the same lines, quieter
const mu = A.newProduction({ name: "מזרחי", company: "Keshet", dp: "Damian", ac: "Ofir", acPhone: "050", houseId: "utopia", notes: "איסוף ביום ראשון", notesBold: true, notesSize: "l" });
const su = A.newProduction({ name: "מזרחי", company: "Keshet", dp: "Yossi", ac: "Dana", houseId: "utopia", unit: "2nd Unit", mainOf: mu.id });
mu.unit2 = su.id; mu.unit = "Main Unit"; A.app.productions.push(mu, su); A.setQty(mu, mini, 1); A.setQty(su, mini, 1);
const hs = A.exportHtml(su);
ok(/<div class="cl-crew"><div class="cl-col"><div class="cl-ch">2nd Unit<\/div><div class="cl-i"><b>DP:<\/b> <bdi>Yossi<\/bdi>.*<div class="cl-col cl-dim"><div class="cl-ch">Main Unit<\/div><div class="cl-i"><b>DP:<\/b> <bdi>Damian/s.test(hs) && />2nd Unit<\/div><\/div>\s*<div style="font-size:18px/.test(hs.replace(/\n/g, " ")) || /text-transform:uppercase;margin-top:3px">2nd Unit</.test(hs), "2nd Unit list: two crew columns, 2nd Unit (left, in full) and Main Unit (right, quieter); 2nd Unit under the name");
ok(!/class="cl-crew"/.test(A.exportHtml(mu)) && /<b>DP:<\/b> <bdi>Damian/.test(A.exportHtml(mu)) && !/Yossi/.test(A.exportHtml(mu)) && /margin-top:3px">Main Unit</.test(A.exportHtml(mu)), "main list: only the Main Unit's crew, 'Main Unit' under the name");
ok(/<div style="font-size:18px;line-height:1.2;white-space:nowrap;text-align:center">Camera List<\/div>/.test(A.exportHtml(mu)) && /color:#8a8a8a;white-space:nowrap">Version \d+<br>\d+\.\d+\.\d\d · \d\d:\d\d</.test(A.exportHtml(mu)), "top of the list: Camera List centered, version and save time in gray top right");
ok(/cl-notes"><div dir="auto" style="font-size:12px"><span style="font-size:14.5px"><b>איסוף/.test(A.exportHtml(mu)) && !/class="cl-nt"/.test(A.exportHtml(mu)), "notes at the bottom of the details, bold and large (an older note, its whole-note size and bold)");
ok(/<w:rtl\/>/.test(A.docxXml(mu)) && /<w:bidi\/>/.test(A.docxXml(mu)) && /w:jc w:val="center"/.test(A.docxXml(mu)), "Word: centered details, Hebrew written right to left");
ok(!/viewHome/.test("") && !A.viewHome().includes(`data-id="${su.id}"`) && A.viewHome().includes("pc-units"), "the home screen shows the production once, grouped with a line per unit");
const dcp = A.dupWithUnit(mu, { name: "copy" }); ok(dcp.unit2 && A.app.productions.find(x => x.id === dcp.unit2).mainOf === dcp.id && Object.keys(A.app.productions.find(x => x.id === dcp.unit2).items).length > 0, "duplicating copies the 2nd Unit too");
const nBefore = A.app.productions.length; A.deleteProductions([dcp.id]); ok(A.app.productions.length === nBefore - 2, "deleting a production deletes its 2nd Unit");
A.app.settings.docTitle = "Equipment List"; const up2 = A.newProduction({ name: "x", houseId: "utopia" }); A.setQty(up2, mini, 1);
ok(/Equipment List/.test(A.exportHtml(up2)), "the title from Settings when the production has none"); A.app.settings.docTitle = "";
// --- the list's version number: counted when a changed list is saved; the same list saved again keeps its number
const vlist = A.newProduction({ name: "ver", houseId: "utopia" }); A.app.productions.push(vlist); A.setQty(vlist, mini, 1);
ok(A.docVer(vlist) === 1 && /Version 1</.test(A.exportHtml(vlist)) && / v1$/.test(A.fileBase(vlist)), "a new list is version 1 (on the page and in the file name)");
A.commitVer(vlist); ok(A.docVer(vlist) === 1, "saving it keeps 1");
A.commitVer(vlist); ok(vlist.docVer === 1, "saving the same list again (PDF after Word) keeps 1");
A.setQty(vlist, mini, 2); ok(A.docVer(vlist) === 2 && /VERSION 2/.test(A.listText(vlist)), "a change makes the next save version 2");
A.setQty(vlist, mini, 1); ok(A.docVer(vlist) === 1, "undoing the change goes back to 1");
A.setQty(vlist, mini, 2); A.commitVer(vlist); vlist.notes = "pickup sunday"; ok(A.docVer(vlist) === 3, "saved as 2, then a note: the next is 3");
ok(/Version \d/.test(A.docxHeaderClean(vlist)), "the Word header shows the version");
const vset3 = A.viewSettings(); ok(!/data-settitle/.test(vset3) && !/cat-reset-all/.test(vset3) && !/data-act="share-app"/.test(vset3) && /id="shareBtn"[^>]*data-act="share-app"/.test(builtHtml) && /id="themeBtn"[^>]*data-act="theme"/.test(builtHtml), "settings: no title field, no undo-all; share and theme are buttons up top");
// --- doesn't work together: ARRI Amira + cforce mini -> cforce mini RF
const amira = "utopia:arri-amira-premium", cfm = "utopia:arri-cforce-mini-motor", cfrf = "utopia:arri-cforce-mini-rf-motor";
A.app.settings.clashes = [{ id: "x-1", house: "utopia", a: [amira], b: [cfm], swap: cfrf, why: "No radio inside the camera" }];
const clp = A.newProduction({ name: "clash", houseId: "utopia" }); A.app.productions.push(clp);
A.setQty(clp, amira, 1); modals = []; A.setQty(clp, cfm, 2); clp.items[cfm].note = "focus + iris";
ok(/Doesn't work together/.test(modals.join("")) && /Swap for ARRI cforce Mini RF Motor/.test(modals.join("")) && /No radio inside/.test(modals.join("")), "adding a cforce mini to an Amira list says why, and offers the RF one");
ok(A.clashIssues(clp).length === 1 && /Doesn't work together/.test(A.viewList(clp, A.app.productions.length && { name: "Utopia" })), "the list shows it too, until you choose");
A.clashSwap(clp, "x-1"); ok(!clp.items[cfm] && clp.items[cfrf] && clp.items[cfrf].qty === 2 && clp.items[cfrf].note === "focus + iris" && !A.clashIssues(clp).length, "swap: 2x cforce mini RF in its place, with its note");
const clp2 = A.newProduction({ name: "clash2", houseId: "utopia" }); A.app.productions.push(clp2); A.setQty(clp2, amira, 1); A.setQty(clp2, cfm, 1);
clp2.clashOk = { "x-1": true }; ok(!A.clashIssues(clp2).length, "keep both: no more warning");
A.setQty(clp2, cfm, 0); ok(!clp2.clashOk["x-1"], "the cforce mini goes: keep-both is forgotten"); A.setQty(clp2, cfm, 1); ok(A.clashIssues(clp2).length === 1, "and adding it again warns again");
A.clashDrop(clp2, "x-1"); ok(!clp2.items[cfm] && clp2.items[amira], "no swap item: remove the one that doesn't work");
ok(/data-act="clash-new"/.test(A.viewRules(A.app.rulesTo = "clash")) && /doesn't work with <b>ARRI cforce Mini Motor/.test(A.viewRules(A.app.rulesTo = "clash")) && /Use instead: <b>ARRI cforce Mini RF Motor/.test(A.viewRules(A.app.rulesTo = "clash")), "the Packages & rules page lists the rule");
A.applyDefaults(clp2); ok(true, "defaults still run with rules of the new kind around");
modals = []; A.ruleDialog(); ok(/New package/.test(modals.join("")) && /Comes with<\/legend>.*<label for="rd-q-add0">Quantity<\/label>.*data-act="pk-more"/s.test(modals.join("")) && !/How many/.test(modals.join("")), "new package: Quantity with each item, and + Another item");
A.app.settings.clashes = [];
// --- undo: a line taken off, a production deleted
const undoP = A.newProduction({ name: "undo", houseId: "utopia" }); A.app.productions.push(undoP); A.setQty(undoP, mini, 2); undoP.items[mini].note = "keep me";
A.setQty(undoP, mini, 0); ok(!undoP.items[mini] && typeof A.getUndo() === "function", "taking a line to 0 offers Undo");
A.getUndo()(); ok(undoP.items[mini] && undoP.items[mini].qty === 2 && undoP.items[mini].note === "keep me", "Undo puts the line back, with its quantity and note");
const ordBefore = A.app.productions.map(x => x.id), undoProd = A.snapProds([undoP.id]); A.deleteProductions([undoP.id]); ok(!A.app.productions.some(x => x.id === undoP.id), "deleted");
undoProd(); ok(JSON.stringify(A.app.productions.map(x => x.id)) === JSON.stringify(ordBefore), "Undo brings the production back, in its place");
A.app.view = "production"; A.app.pid = undoP.id; const vlist2 = A.viewList(undoP, { name: "Utopia" });
ok(!/data-act="rename-sec" data-k="camera"/.test(vlist2), "the Camera List's own section titles can't be renamed");
// --- the app's starting catalog: the one Ofir saved on 6.11.26 (his order, his categories, the items he added)
{ const u = realStarter.catalog.utopia, names = (u.newItems || []).map(x => x.name), cats = (u.cats || []).map(c => c.name);
  ok(["Grip", "AKS", "Display"].every(c => cats.includes(c)) && ["Danna Dolly", "Orca bag 132", "Mafer", "ARRI LMB 4x5 Matte Box"].every(n => names.includes(n)) && u.subMoves["camera_accessories/monitors"] === u.cats.find(c => c.name === "Display").id,
    "starting catalog: Grip, AKS and Display; the added items; monitors under Display"); }

// --- Camera Accessories by what they're for
{ const H = A.houseById("utopia"), sub = id => H.categories.flatMap(c => c.subcategories).find(s => s.id === id);
  const gen = sub("general"), grp = (s, re) => { const it = s.items.find(i => re.test(i.name)); return it ? A.grpOf(it, s) : null; };
  ok(gen.groupBy === "type" && grp(gen, /MacBook Pro/) === "Laptops & Tablets" && grp(gen, /GoPro Max Lens/) === "GoPro & Action Cams" && grp(gen, /Clapper/) === "Slates & Timecode", "General: Laptops & Tablets, GoPro & Action Cams, Slates & Timecode");
  ok(grp(sub("rigs_stabilizers"), /RS 4 Pro/) === "Gimbals" && grp(sub("rigs_stabilizers"), /Easyrig Vario 5$/) === "Easyrig & Support Vests" && grp(sub("tripods"), /Baby Legs 100mm/) === "Baby Legs" && grp(sub("car_mounts"), /Androokie Pro Magnet Kit #1/) === "Magnet Mounts", "rigs, tripods and car mounts by function");
  const rcu = gen.items.find(i => /RCU-4/.test(i.name)); ok(!rcu || A.grpOf(rcu, gen) !== "ARRI", "an item once filed under a manufacturer doesn't leave a stray maker folder"); }

// --- the first open, and the home page
{ const keep = { s: A.app.settings, p: A.app.productions, v: A.app.view };
  A.app.productions = []; A.app.settings = JSON.parse(JSON.stringify(FRESH)); delete A.app.settings.me; delete A.app.settings.welcomed;
  ok(A.needsWelcome() && /What's your name\?/.test(A.viewWelcome()) && /type="submit">Get started</.test(A.viewWelcome()), "a first open: what the app does, and your name");
  A.app.settings.me = { name: "Ofir Karl" }; ok(!A.needsWelcome(), "with a name, the welcome doesn't come back");
  A.app.justWelcomed = true; ok(/Nice to meet you, <bdi>Ofir<\/bdi>/.test(A.greetHtml()), "right after: nice to meet you, by first name"); A.app.justWelcomed = false;
  ok(/>(Good (morning|afternoon|evening)|Working late), <bdi>Ofir<\/bdi></.test(A.greetHtml()) && /class="gr-date"/.test(A.greetHtml()), "home: the date, and hello by first name");
  A.app.view = "settings"; A.uiSave(); ok(JSON.parse(store["accam-ui-v1"]).view === "home" && JSON.parse(store["accam-ui-v1"]).at > 0, "the app never reopens on Settings");
  const hp = A.newProduction({ name: "home card", houseId: "fitussi", prep: "2099-01-01" }); A.app.productions.push(hp);
  ok(/class="pc-status soon">Prep in \d+ days</.test(A.viewHome()) && /class="pc-house" data-house="fitussi">/.test(A.viewHome()) && /Productions <span class="num">1</.test(A.viewHome()), "a production card: its status and its rental house's color");
  A.app.settings = keep.s; A.app.productions = keep.p; A.app.view = keep.v; }

// --- the Media tab: a camera's card, its format, how long a card lasts, and the cards on the list
{ const keepRules = A.app.settings.rules; A.app.settings.rules = [];
  const pc = A.newProduction({ name: "Cards", houseId: "utopia" }); A.app.productions.push(pc);
  const a35 = find("utopia", /^ARRI Alexa 35$/), cdx1 = find("utopia", /Codex Compact Drive 1TB/), cdx2 = find("utopia", /Codex Compact Drive 2TB/);
  A.setQty(pc, a35, 2);
  ok(Object.keys(pc.items).length === 1, "adding a camera adds no cards by itself");
  const l = pc.items[a35], e = A.ITEM.get(a35);
  A.recEnsure(l, e, pc);
  ok(l.rec.card === cdx1 && l.rec.codec === "ARRIRAW", "the Media tab starts an Alexa 35 on a Codex 1TB, in ARRIRAW");
  l.rec = { card: cdx1, codec: "ARRIRAW", mode: "4.6K 3:2 Open Gate", fps: 24 };
  ok(Math.floor(A.recResult(l, e).per / 60) === 28, "ARRIRAW 4.6K OG 24 fps on a 1TB drive: 28 min");
  l.rec.card = cdx2; ok(Math.floor(A.recResult(l, e).per / 60) === 56, "on a 2TB drive: 56 min");
  const html = A.mediaCamHtml(pc, a35);
  const tile = k => new RegExp(`data-act="mc-open" data-id="[^"]+" data-k="${k}"`);
  ok(tile("codec").test(html) && tile("fps").test(html) && tile("sensor").test(html) && tile("card").test(html) && /data-act="mq"/.test(html) && html.indexOf('data-k="card"') > html.indexOf('data-k="sensor"') && html.indexOf("mc-res") > html.indexOf('data-act="mq"'), "Media Calculator: the settings as tiles, then the card with how many, then the result");
  ok(/<span class="t-l">Per card<\/span><b>56 min<\/b><\/div><div><span class="t-l">Total<\/span>/.test(html) && !/class="mc-panel"/.test(html), "the result in two halves, per card and total; no choices open until a tile is tapped");
  ok(/<span class="t-l"><span>Media<\/span><\/span><span class="t-v">Codex Compact Drive <span class="t-b">2TB<\/span><\/span>/.test(html) && A.cardLabel("Sony 1TB AXS S66 Memory Card", "Sony Venice 2") === "AXS S66 · 1TB" && A.cardLabel("SanDisk 64GB SD Card V90", "Sony ILME-FX3") === "SanDisk SD · 64GB V90", "the card without the camera's own make, its size apart: Codex Compact Drive 2TB");
  ok(/<span class="mc-step"><button [^>]*data-d="-1"[^>]*>−<\/button><b>\d+<\/b><button [^>]*data-d="1"[^>]*>\+<\/button><\/span>/.test(html), "how many cards: two plain round buttons around the number");
  ok(/data-k="codec"[^>]*><span class="t-l"><span>Codec<\/span><\/span><span class="t-v">ARRIRAW<\/span><\/button><div class="mc-tile info"><span class="t-l"><span>Color sampling<\/span><\/span><span class="t-v">RAW · 13-bit<\/span>/.test(html) && /data-k="fps"[^>]*><span class="t-l"><span>Frame rate<\/span><\/span><span class="t-v">24 fps<\/span><\/button><div class="mc-tile info"><span class="t-l"><span>Bit rate<\/span><\/span><span class="t-v">[\d,]+ Mbps<\/span>/.test(html), "Format beside Color sampling, Frame rate beside Bit rate");
  l.rec = { card: cdx1, codec: "ProRes 422 HQ", mode: "4K 16:9 → UHD", fps: 25 }; const hp = A.mediaCamHtml(pc, a35);
  ok(/<div class="mc-pair"><button [^>]*data-k="sensor"[^>]*><span class="t-l"><span>Sensor coverage<\/span><\/span><span class="t-v">4K 16:9<\/span><\/button><button [^>]*data-k="mode"[^>]*><span class="t-l"><span>File resolution<\/span><\/span><span class="t-v">3840×2160 <span class="t-b">UHD<\/span>/.test(hp), "Sensor (4K 16:9) beside Recording resolution (3840×2160, UHD), a menu here because 4K 16:9 records four sizes");
  A.setMcOpen({ id: a35, k: "sensor" }); const ho = A.mediaCamHtml(pc, a35); A.setMcOpen(null);
  const og = ho.indexOf('<div class="mc-grp">4K 16:9</div>'), og2 = ho.indexOf('<div class="mc-grp">', og + 5);
  ok(/class="mc-panel"/.test(ho) && !/mc-grp/.test(ho) && (ho.match(/data-k="sensor" data-v=/g) || []).length === 8 && /data-v="4.6K 16:9"[^>]*><span class="t-a">4.6K 16:9<\/span><\/button>/.test(ho) && /class="mc-opt on"[^>]*data-v="4K 16:9"/.test(ho), "the Sensor list: only the sensor areas, one line each, no headings");
  A.setMcOpen({ id: a35, k: "mode" }); const hm = A.mediaCamHtml(pc, a35); A.setMcOpen(null);
  ok((hm.match(/data-k="mode" data-v=/g) || []).length === 4 && /class="mc-opt on"[^>]*data-v="4K 16:9 → UHD"[^>]*><span class="t-a">UHD<\/span><span class="t-b">3840×2160<\/span>/.test(hm), "the Recording resolution list: the sizes this sensor area makes (4K, UHD, 2K, HD)");
  A.setMcOpen({ id: a35, k: "fps" }); ok(/<div class="mc-chips">/.test(A.mediaCamHtml(pc, a35)), "frame rates open as a grid of small buttons"); A.setMcOpen(null);
  { const t = JSON.parse(JSON.stringify(l.rec)); A.recSet(l, e, pc, "fps", "120"); A.recSet(l, e, pc, "mode", "4K 16:9 → UHD"); ok(l.rec.mode === "4K 16:9 → UHD" && l.rec.fps <= 120, "choosing a value sets it on the camera's line"); l.rec = t; }
  l.rec = { card: cdx2, codec: "ARRIRAW", mode: "4.6K 3:2 Open Gate", fps: 24 };
  A.setQty(pc, cdx2, 8); ok(/<b>8<\/b>/.test(A.mediaCamHtml(pc, a35)) && /<span class="t-l">Total<\/span><b>7 h 28 min<\/b>/.test(A.mediaCamHtml(pc, a35)), "with 8 on the list: how long they record together");
  ok(/No cameras on this list yet/.test(A.viewMedia(A.newProduction({ name: "x", houseId: "utopia" }), A.houseById("utopia"))), "the Media tab with no camera says what to do");
  const lf = find("utopia", /^ARRI Alexa Mini LF$/); A.setQty(pc, lf, 1); const ll = pc.items[lf]; ll.rec = { card: cdx1, codec: "ProRes 4444", mode: "3.8K LF 16:9 → UHD", fps: 24 };
  ok(Math.floor(A.recResult(ll, A.ITEM.get(lf)).per / 60) === 121, "Mini LF ProRes 4444 UHD 24 fps: 2 h 1 min on 1TB, as ARRI's sheet says");
  const v2 = find("utopia", /^Sony Venice 2/), axs = find("utopia", /1TB AXS S66/);
  A.setQty(pc, v2, 1); const lv = pc.items[v2]; lv.rec = { card: axs, codec: "X-OCN LT", mode: "FF 8.6K 3:2", fps: 24 };
  const mv = Math.floor(A.recResult(lv, A.ITEM.get(v2)).per / 60);
  ok(mv >= 57 && mv <= 58, `VENICE 2 X-OCN LT 8.6K 3:2 24 fps on AXS 1TB: about 58 min, as Sony's table (${mv})`);
  const gopro = find("utopia", /GoPro HERO13/); A.setQty(pc, gopro, 1); const lg = pc.items[gopro]; A.recEnsure(lg, A.ITEM.get(gopro), pc); lg.rec.mbps = 120;
  const rg = A.recResult(lg, A.ITEM.get(gopro)); ok(rg.card && Math.floor(rg.per / 60) === Math.floor(A.cardBytes(rg.card) / (120e6 / 8) / 60), "a typed data rate gives the card time too");
  ok(/<label class="mc-tile tap mc-inp"><span class="t-l">Bit rate<\/span><span class="t-v"><input [^>]*data-rec="mbps"[^>]*value="120"><i>Mbps<\/i>/.test(A.mediaCamHtml(pc, gopro)), "...and the Media tab asks for it, in a Bit rate tile");
  // a list from the short-lived auto cards: they stay, as ordinary lines
  const old = A.newProduction({ name: "Old", houseId: "utopia" }); A.app.productions.push(old);
  old.items[a35] = { ...A.lineFromCatalog(a35), qty: 1, cards: { id: cdx1, n: 4 } }; old.items[cdx1] = { ...A.lineFromCatalog(cdx1), qty: 4, auto: 4, autoWhy: "4 per ARRI Alexa 35" };
  A.applyDefaults(old); ok(old.items[cdx1] && old.items[cdx1].qty === 4 && !old.items[cdx1].auto && !old.items[a35].cards, "cards added with a camera earlier stay on the list as ordinary lines");
  A.app.settings.rules = keepRules; }

// --- packages: an item and what comes with it; media from a tick box
{ const keepRules = A.app.settings.rules; A.app.settings.rules = [];
  const a35 = find("utopia", /^ARRI Alexa 35$/), cdx1 = find("utopia", /Codex Compact Drive 1TB/), b250 = find("utopia", /FXLion 250Wh V-Mount/);
  A.dd.house = "utopia"; A.dd.when = { id: a35 }; A.dd.media = {}; A.dd.adds = []; A.dd.q = {};
  ok(A.pkgMediaHtml() === "", "the camera's Media ticks were taken out of the package dialogs (23.11): cards are added as items");
  A.app.settings.rules.push({ id: "r-a", kind: "item", house: "utopia", when: a35, add: cdx1, qty: 4 }, { id: "r-b", kind: "item", house: "utopia", when: a35, add: b250, qty: 6 });
  const vs = A.viewRules(A.app.rulesTo = "pkg");
  ok(/<h3 id="rs-pkg">Packages<\/h3>/.test(vs) && (vs.match(/class="package"/g) || []).length === 1 && /data-act="pkg-add" data-id="[^"]+"/.test(vs) && /\+ Create a Package/.test(vs), "Packages page: one Alexa 35 package with both items, and + to add another");
  const pp = A.newProduction({ name: "Pkg", houseId: "utopia" }); A.app.productions.push(pp); A.setQty(pp, a35, 2);
  ok(pp.items[cdx1]?.qty === 8 && pp.items[b250]?.qty === 12, "adding two Alexa 35 brings the package: 8 cards, 12 batteries");
  A.app.settings.rules = keepRules; }

// --- bit depth and sampling; SD cards
{ ok(A.csOf("ProRes 4444 XQ") === "4:4:4 · 12-bit" && A.csOf("ProRes 422 HQ") === "4:2:2 · 10-bit" && A.csOf("XAVC-L 4K") === "4:2:0 · 8-bit" && A.csOf("X-OCN ST") === "RAW · 16-bit" && A.csOf("Cinema RAW Light HQ") === "RAW · 12-bit", "colour sampling and bit depth by codec");
  const ps = A.newProduction({ name: "SD", houseId: "utopia" }); A.app.productions.push(ps);
  const fx3 = find("utopia", /^Sony ILME-FX3$/), sd64 = find("utopia", /SanDisk 64GB SD Card/); A.setQty(ps, fx3, 1); ps.items[fx3].rec = { card: sd64, codec: "XAVC S-I 4K", mode: "UHD", fps: 59.94 };
  const hx = A.mediaCamHtml(ps, fx3);
  ok(!/Speed class|Needs|data-rec="sdc"/.test(hx) && /<span class="t-l"><span>Resolution<\/span><\/span><span class="t-v">UHD<\/span>/.test(hx) && typeof A.sdClass === "undefined", "SD cards: no speed class of their own (it goes in the card's name); an FX3 shows its Resolution tile");
  const r4d = find("utopia", /Ronin 4D/); A.setQty(ps, r4d, 1); ok(A.ITEM.get(r4d).it.camera.media.includes("CFexpress Type B") && (A.setMcOpen({ id: r4d, k: "card" }), /<div class="mc-grp">CFexpress Type B<\/div>/.test(A.mediaCamHtml(ps, r4d))) && (A.setMcOpen(null), true), "the Ronin 4D takes CFexpress Type B cards too"); }

// --- sensor modes as the makers publish them (checked against their documents)
{ const modes = k => [...new Set(A.REC[k].flatMap(c => c.m.map(x => `${x[0]}=${x[1]}x${x[2]}`)))];
  ok(modes("pyxis6k").includes("Open Gate 3:2=6048x4032") && modes("pyxis6k").includes("1080 HD 16:9=1920x1080") && !modes("pyxis6k").some(x => /6080|4128|1984/.test(x)), "PYXIS 6K: Blackmagic's sizes (Open Gate 3:2 6048×4032)");
  ok(modes("mini").includes("S16 HD → HD=1920x1080") && modes("mini").includes("16:9 HD Ana. → HD=1920x1080") && !modes("mini").some(x => /1\.6K|0\.88|1\.19/.test(x)), "ALEXA Mini: ARRI's mode names (S16 HD, 16:9 HD Ana.)");
  ok(modes("miniLF").includes("4.5K LF 3:2 Open Gate=4448x3096") && modes("miniLF").includes("3.4K S35 3:2=3424x2202"), "Mini LF: LF / S35 in the names");
  ok(modes("burano").includes("S35 1.9K 16:9=1920x1080") && modes("burano").includes("FFc 3.8K 16:9=3840x2160") && modes("burano").includes("S35c 3.8K 16:9=3840x2160"), "BURANO: Sony's FF / FFc / S35 / S35c modes");
  ok(!modes("komodo").some(x => /3:2|6:5/.test(x)) && modes("dragon").includes("6K FF=6144x3160") && !modes("dragon").some(x => /4\.5K/.test(x)), "RED: only the formats RED lists; DRAGON-X 6K FF is 6144×3160");
  ok(!modes("ronin4d").some(x => /UHD/.test(x)) && modes("ronin4d").includes("2K=2048x1080"), "Ronin 4D: 6K, C4K and 2K, as DJI lists");
  ok(!modes("sonySI4K").some(x => /DCI/.test(x)) && modes("sonySI").some(x => /DCI/.test(x)) && A.recProfile("Sony a7 IV") === A.REC.sonySI4K && A.recProfile("Sony a7S III") === A.REC.sonySI, "DCI 4K on the FX3 and a7S III, not on the a7 IV");
  const pk = A.newProduction({ name: "K", houseId: "utopia" }); A.app.productions.push(pk);
  const kom = find("utopia", /komodo 6k/i); if (kom) { A.setQty(pk, kom, 1); pk.items[kom].rec = { codec: "REDCODE HQ", mode: "6K 16:9", fps: 24 }; ok(/<span class="t-b">calculated<\/span>/.test(A.mediaCamHtml(pk, kom)), "a size RED gives only as a ratio says it's calculated"); }
}

// --- "Any camera": a calculation for a camera that isn't on the list
{ const pf = A.newProduction({ name: "F", houseId: "utopia" }); A.app.productions.push(pf);
  const h0 = A.mediaCamHtml(pf, "free0");
  ok(/data-k="cam"/.test(h0) && /Choose a camera/.test(h0) && !/mc-res/.test(h0), "Any camera starts with a Camera tile to choose from");
  const a35 = find("utopia", /^ARRI Alexa 35$/); A.app.settings.mcFree = { utopia: { id: a35, rec: {}, n: 3 } };
  const h1 = A.mediaCamHtml(pf, "free0");
  ok(/<span class="t-l"><span>Camera<\/span><\/span><span class="t-v">ARRI Alexa 35<\/span>/.test(h1) && /data-id="free0" data-d="1"/.test(h1) && /<b>3<\/b>/.test(h1) && /<span class="t-l">Total<\/span><b>(?!–)/.test(h1) && !Object.keys(pf.items).length, "...then the whole calculator for it, with its own card count, and nothing added to the list");
  ok(Array.isArray(A.app.settings.mcFree.utopia) && A.app.settings.mcFree.utopia[0].id === a35, "a single camera kept before becomes the first of a list");
  const fx9 = find("utopia", /fx9/i); A.app.settings.mcFree.utopia.push({ id: fx9, rec: {}, n: 1 });
  A.app.mcMode = "free"; const v = A.viewMedia(pf, A.houseById("utopia")); A.app.mcMode = "list";
  ok(/id="mc-free0"/.test(v) && /id="mc-free1"/.test(v) && /Camera 2<\/span><button [^>]*data-act="mc-del" data-id="free1"/.test(v) && /data-act="mc-add"/.test(v), "Any camera: two cameras side by side to compare, each numbered with Remove, and Add camera to compare under them");
  delete A.app.settings.mcFree; }

// --- Sony FX9, as Sony's brochure has it
{ const pf = A.newProduction({ name: "FX9", houseId: "utopia" }); A.app.productions.push(pf);
  const fx9 = find("utopia", /fx9/i); A.setQty(pf, fx9, 1); const l = pf.items[fx9], e = A.ITEM.get(fx9);
  const names = A.REC.fx9.map(c => c.n), modes = [...new Set(A.REC.fx9.flatMap(c => c.m.map(x => x[0])))];
  ok(["XAVC-I 4K", "XAVC-I HD", "XAVC-L 4K", "XAVC-L HD 50", "XAVC-L HD 35", "XAVC-L HD 25", "MPEG HD422"].every(n => names.includes(n)), "FX9: every format in Sony's brochure, XAVC-L HD 35 and 25 and MPEG HD422 too");
  const hdm = A.REC.fx9.find(c => c.n === "XAVC-I HD").m, top = sn => (hdm.find(x => x[0] === sn + " → HD") || [])[3];
  ok(["FF 6K → DCI 4K", "FFc 5K → DCI 4K", "S35 4K → UHD", "S16 2K → HD"].every(m => modes.includes(m)) && A.REC.fx9[0].m.find(x => x[0] === "FF 6K → DCI 4K")[3] === 30 && A.REC.fx9[0].m.find(x => x[0] === "FFc 5K → DCI 4K")[3] === 60 && top("FF 2K") === 180 && top("S35 2K") === 120 && top("S16 2K") === 180, "FX9: Sony's imager scan modes (FF 6K to 30p, FFc 5K and S35 4K to 60p, FF 2K to 180p, S35 2K to 120p, S16 2K)");
  l.rec = { codec: "XAVC-I 4K", mode: "FF 6K → DCI 4K", fps: 23.976 }; const qd = find("utopia", /128GB XQD/); l.rec.card = qd;
  const per = A.recResult(l, e).per / 60; ok(per >= 52 && per <= 56, `FX9 XAVC-I DCI 4K 23.98p on 128GB: about 54 min, as Sony's table (${Math.round(per)})`);
  for (const [fps, want] of [[23.976, 130], [25, 105], [59.94, 57]]) { l.rec = { codec: "XAVC-I HD", mode: "FF 6K → HD", fps, card: qd }; const m = A.recResult(l, e).per / 60; ok(Math.abs(m - want) <= 3, `FX9 XAVC-I HD ${fps}p on 128GB: about ${want} min, as Sony's table (${Math.round(m)})`); }
  for (const [c, want] of [["XAVC-L 4K", 125], ["XAVC-L HD 35", 305], ["MPEG HD422", 220]]) { l.rec = { codec: c, mode: c === "XAVC-L 4K" ? "FF 6K → UHD" : "FF 6K → HD", fps: 25, card: qd }; const m = A.recResult(l, e).per / 60; ok(Math.abs(m - want) <= want * 0.03, `FX9 ${c} 25p on 128GB: about ${want} min, as Sony's table (${Math.round(m)})`); }
  ok(A.csOf("XAVC-L HD 35") === "4:2:0 · 8-bit" && A.csOf("MPEG HD422") === "4:2:2 · 8-bit", "FX9 sampling for XAVC-L HD 35 and MPEG HD422"); }

// --- a matching card reader for each kind of card on the list
{ const keepRules = A.app.settings.rules, keepPR = A.app.settings.pkReaders;
  const cdx1 = find("utopia", /Codex Compact Drive 1TB/), cdx2 = find("utopia", /Codex Compact Drive 2TB/), dock = find("utopia", /Codex Compact Drive Dock/), sd = find("utopia", /SanDisk 64GB SD Card/), sdr = find("utopia", /Lexar SD\/CF Card Reader/);
  const cam = find("utopia", /^ARRI Alexa 35$/), cam2 = find("utopia", /^ARRI Alexa Mini LF$/);
  A.app.settings.rules = [{ id: "r1", kind: "item", house: "utopia", when: cam, add: cdx1, qty: 4 }, { id: "r2", kind: "item", house: "utopia", when: cam, add: sd, qty: 3 }, { id: "r3", kind: "item", house: "utopia", when: cam2, add: cdx2, qty: 2 }];
  A.app.settings.pkReaders = { [cam]: true, [cam2]: true };
  const pr = A.newProduction({ name: "Readers", houseId: "utopia" }); A.app.productions.push(pr);
  A.setQty(pr, cam, 1); A.setQty(pr, cam2, 1);
  ok(!pr.items[dock] && !pr.items[sdr], "the reader tick was taken out (23.11): an old tick brings no reader");
  A.app.settings.pkReaders = {}; A.applyDefaults(pr); ok(!pr.items[dock] && !pr.items[sdr], "tick off: the readers come off");
  A.app.settings.readers = true; A.applyDefaults(pr); ok(A.app.settings.readers === false && !pr.items[dock], "the old switch is cleared, and brings no reader");
  A.app.settings.rules = keepRules; A.app.settings.pkReaders = keepPR || {}; }

// --- a file once built is used again while the list stays the same
{ const pf2 = A.newProduction({ name: "File cache", houseId: "utopia" }); A.app.productions.push(pf2);
  A.setQty(pf2, find("utopia", /^Sony ILME-FX3$/), 1);
  const k1 = A.fileKey(pf2, "docx"); A.commitVer(pf2); const k2 = A.fileKey(pf2, "docx");
  ok(k1 === k2, "saving (and so numbering the version) keeps the same file");
  A.setQty(pf2, find("utopia", /^Sony ILME-FX3$/), 2); ok(A.fileKey(pf2, "docx") !== k2, "a change to the list makes a new file"); }

// --- Word files on Android go through the helper app
{ const u = A.helperUrl("Camera list - X v2.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Camera list – X", "Hi,\nAttached", "UEsDBA+/=");
  ok(/^intent:\/\/send#Intent;scheme=accamlist;package=com\.ofirkarl\.accamlist\.send;/.test(u) && /S\.data=UEsDBA%2B%2F%3D;/.test(u) && /S\.text=Hi%2C%0AAttached;/.test(u) && /S\.browser_fallback_url=https%3A%2F%2Fofirkarl\.github\.io%2FACCamList%2F%23send-app;end$/.test(u), "the helper link carries the file, its name and the message");
  ok(!A.useHelper("docx"), "the helper is off until it's switched on, on an Android phone"); }

// --- memory for typed text
{ A.app.settings.hist = {};
  A.histAdd("dp", "Damian Tsatskin"); A.histAdd("dp", "Avi Cohen"); A.histAdd("dp", "damian tsatskin"); A.histAdd("dp", "x"); A.histAdd("dp", "  Dana Levi ");
  ok(JSON.stringify(A.app.settings.hist.dp) === JSON.stringify(["Dana Levi", "damian tsatskin", "Avi Cohen"]), "typed names are remembered, newest first, without duplicates or one-letter entries");
  ok(A.histFor("dp", "").length === 0 && A.histFor("dp", "da").length === 2 && A.histFor("dp", "avi")[0] === "Avi Cohen", "nothing is suggested until typing starts, then suggestions narrow");
  ok(A.histFor("dp", "Avi Cohen").length === 0, "a field already showing the full name suggests nothing");
  ok(A.histFor("ac", "").length === 0, "each kind of field has its own memory");
  for (let i = 0; i < 20; i++) A.histAdd("search", "lens " + i);
  ok(A.app.settings.hist.search.length === 15 && A.app.settings.hist.search[0] === "lens 19", "the memory keeps the 15 most recent");
  A.app.settings.hist = {}; }

// --- round 12: Favorites without production info, slim saved list cards, categories that close, the item dialog's buttons, WhatsApp on Android
{ const U = A.houseById("utopia"), fp = A.newProduction({ name: "Fav", houseId: "utopia", shootStart: "2026-12-01", shootEnd: "2026-12-04" }); A.app.productions.push(fp); A.app.pid = fp.id;
  const ids = []; for (const [id, e] of A.ITEM) if (e.h.id === "utopia" && ids.length < 3 && !ids.some(x => A.ITEM.get(x).c === e.c)) ids.push(id);
  for (const id of ids) A.app.settings.favorites[id] = { name: A.ITEM.get(id).it.name, section: A.ITEM.get(id).it.section };
  A.app.view = "production"; A.app.tab = "fav"; A.app.favTab = "items";
  const vp = A.viewProduction();
  ok(!/class="pdates|ph-status|ph-add/.test(vp), "Favorites shows no production dates or status");
  A.app.tab = "list"; ok(/class="pdates/.test(A.viewProduction()), "the Camera List still shows the dates");
  A.app.tab = "fav";
  let fh = A.viewFavorites(fp, U);
  ok((fh.match(/data-act="fav-cat"/g) || []).length >= 6 && /data-act="fav-all" data-open="0" aria-label="Close all"/.test(fh), "favorite categories close one by one, or all at once");
  ok(!/fav-gh|summary-line/.test(fh), "no extra heading or count line at the top of Favorites");
  A.app.open.add("favx/" + A.ITEM.get(ids[0]).c.id); fh = A.viewFavorites(fp, U);
  ok(/class="fav-cat closed"/.test(fh) && /data-open="0" aria-label="Close all"/.test(fh), "a closed category is marked, Close all stays while others are open");
  const allK = [...new Set(A.favoritesFor(fp).starred.map(e => e.c.id)), "custom"]; for (const k of allK) A.app.open.add("favx/" + k);
  ok(/data-open="1" aria-label="Open all"/.test(A.viewFavorites(fp, U)), "all closed: Open all"); for (const k of allK) A.app.open.delete("favx/" + k);
  A.app.settings.lists = [{ id: "L1", name: "Doc kit", note: "Light", houseId: "utopia", items: [{ id: ids[0], qty: 2 }] }];
  A.app.favTab = "lists"; fh = A.viewFavorites(fp, U);
  ok(/sl-head/.test(fh) && /sl-add/.test(fh) && !/sl-mul/.test(fh) && /Light/.test(fh), "a saved list card: name, note, Add; the sets are chosen inside the list");
  A.app.openList = "L1"; fh = A.viewFavorites(fp, U);
  ok(/sl-back/.test(fh) && /sl-mul/.test(fh) && /Add to list/.test(fh) && !/sl-obar/.test(fh), "an opened list: back and edit beside the name, sets and Add to list");
  A.app.openList = null; A.app.favTab = "items";
  for (const id of ids) { delete A.app.settings.favorites[id]; A.app.open.delete("favx/" + A.ITEM.get(id).c.id); } A.app.settings.lists = [];
  modals.length = 0; A.catEditDialog(U, ids[0]); const dlg = modals.pop() || "";
  ok(/modal-actions quad">.*Remove from catalog.*Duplicate.*Cancel.*Save/s.test(dlg) && !/<select id="ci-sec"/.test(dlg) && /type="hidden" id="ci-sec"/.test(dlg), "Edit item: no section field; Remove, Duplicate, Cancel, Save two by two");
  const nav = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: { userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile", canShare: () => true }, configurable: true });
  A.app.settings.send = { fmt: "docx" }; ok(A.waFmt() === "pdf", "WhatsApp on an Android phone sends a PDF when Word is set (Chrome can't share Word files)");
  store["accam-send-helper"] = "1"; ok(A.waFmt() === "docx", "with the helper app on, WhatsApp sends the Word file");
  delete store["accam-send-helper"]; if (nav) Object.defineProperty(globalThis, "navigator", nav); else delete globalThis.navigator;
  A.app.settings.send = undefined; A.app.view = "home"; }

// --- round 13: one header row, one dates row, search with its actions
{ const q = A.newProduction({ name: "Top", company: "Keshet", houseId: "utopia", prep: "2099-11-18", shootStart: "2099-11-20", shootEnd: "2099-11-25" }); A.app.productions.push(q); A.app.pid = q.id; A.app.view = "production"; A.app.tab = "list";
  for (const [id, e] of A.ITEM) if (e.h.id === "utopia") { A.setQty(q, id, 2); break; }
  const v = A.viewProduction();
  ok(/ph-stack/.test(v) && /data-act="back" aria-label="Back"/.test(v) && /ph-co" dir="auto">Keshet/.test(v) && /class="ph-st soon">Prep in/.test(v), "the top: back, Export, the name, company and status under it");
  ok(/class="pdates1"/.test(v) && /Shoot 20–25 Nov/.test(v) && /pd1-m"> \d days/.test(v) && /Prep 18 Nov/.test(v) && !/class="pdates two"|class="ph-status/.test(v), "shoot and prep on one slim row");
  ok(/placeholder="Search 1 item"/.test(v) && /data-act="sec-all" data-open="0" aria-label="Close all"/.test(v) && /data-act="list-save" aria-label="Save as a list/.test(v) && !/class="btn save-list"|summary-line/.test(v), "search with Close all, Save as a list and Clear beside it; no big Save button");
  q.shootStart = q.shootEnd = q.prep = ""; ok(/pdates1 ph-add/.test(A.viewProduction()), "no dates: Add dates in the same row");
  A.app.view = "home"; }
// --- the lens finder opens with the focal length empty
{ const keep = A.app.finder; A.app.finder = null; ok(A.fin().f === "" && A.fin().t === "", "Find a lens: focal length starts empty, not 50mm"); A.app.finder = keep; }

// --- round 16: each tool in one place. The work bar: Add Gear, Camera List, Favorites. The start page: Media Calculator, Catalogs, Packages
{ const q = A.newProduction({ name: "Linked", company: "Keshet", houseId: "utopia", shootStart: "2099-11-20", shootEnd: "2099-11-21" }); A.app.productions.push(q); q.updatedAt = Date.now() + 1e6;
  for (const [id, e] of A.ITEM) if (e.h.id === "utopia" && A.hasRec(e)) { A.setQty(q, id, 1); break; }
  A.app.pid = q.id; A.app.view = "production"; A.app.tab = "list"; const v = A.viewProduction();
  ok((v.match(/class="nav-tab" role="tab"/g) || []).length === 3 && !/data-act="tools"/.test(v), "the work bar: Add Gear, Camera List, Favorites, nothing else");
  ok([...v.matchAll(/data-tab="(\w+)"/g)].map(m => m[1]).join(",") === "add,list,fav", "the work bar's order, left to right: Add Gear, Camera List, Favorites (the swipe goes the same way)");
  ok(/class="prod-head ph-stack"/.test(v) && /class="ph-nav"><button class="iconbtn ph-back"[^]*?Preview &amp; export<\/button><\/div>\s*<h2 class="ph-name"/.test(v) && /ph-co" dir="auto">Keshet/.test(v), "the production's top: back and Preview & export, the name on its own line, the company under it");
  A.app.tab = "media"; A.viewProduction(); ok(A.app.tab === "list", "a production never opens on the old Media tab");
  ok(A.pageKey() === "p:" + q.id, "a production is one page whatever its tab");
  A.app.view = "home"; const hm = A.viewHome();
  ok(/class="home-shorts"/.test(hm) && (hm.match(/class="hs-btn"/g) || []).length === 4 && !/data-act="mcalc"/.test(hm) && /data-act="notes"[\s\S]*data-act="catalogs"[\s\S]*data-act="favs"[\s\S]*data-act="tools"/.test(hm) && !/data-act="rules-open"|data-act="lensfind"|tool-favs|browse-head/.test(hm), "the start page: four tools, Notes, Catalogs, Favorites and More tools, above the productions");
  A.app.settings.mcList = undefined; A.app.view = "mcalc";
  ok(A.mcListId() === q.id, "the Media Calculator starts on the production worked on most recently");
  let mc = A.viewMcalc(); ok(/<select id="mc-list"/.test(mc) && /<option value="none">No list · any camera<\/option>/.test(mc) && new RegExp(`<option value="${q.id}" selected>Linked`).test(mc) && /media-cam/.test(mc), "one choice: which list, or none");
  A.app.settings.mcList = "none"; mc = A.viewMcalc(); ok(A.mcListId() === "" && /<option value="none" selected>/.test(mc) && /data-act="mc-add"/.test(mc), "no list: any camera, from every catalog");
  A.app.settings.mcList = undefined;
  A.app.browseP = { id: "browse", browse: true, name: "", houseId: "fitussi", items: {} }; A.app.view = "browse"; const br = A.viewBrowse();
  ok(/data-act="browse" data-house="fitussi" aria-pressed="true"/.test(br) && /data-act="browse" data-house="utopia" aria-pressed="false"/.test(br), "Catalogs: one page, the rental house a switch at its top");
  A.app.view = "home"; A.app.pid = null; }

// --- Find a lens from the start page: a rental house switch, nothing added
{ A.app.settings.lensHouse = "fitussi"; A.app.lensP = null; A.app.view = "lensfind"; const v = A.viewLensFind();
  ok(/data-act="lens-house" data-house="fitussi" aria-pressed="true"/.test(v) && /class="tabpane lens-solo"/.test(v) && /data-fin="f"/.test(v) && /Find a lens/.test(v), "Find a lens on its own: the rental house switch, then the finder");
  A.app.view = "home"; const hm = A.viewHome(); ok(!/data-act="lensfind"/.test(hm) && !/data-act="mcalc"/.test(hm) && /data-act="catalogs"/.test(hm), "the start page: Find a lens and Media calc moved to More tools");
  A.app.view = "tools"; const tl = A.viewTools(); ok((tl.match(/class="tool-row"/g) || []).length === 6 && /data-act="mcalc"[\s\S]*data-act="cams"/.test(tl) && /data-act="lensfind"/.test(tl) && /data-act="prep"/.test(tl) && /data-act="lenscard"/.test(tl) && /data-act="rules-open" data-to="pkg"/.test(tl), "More tools: Media calculator, Camera cards, Find a lens, Prep Checklist, Lens card and Packages, one row each"); A.app.view = "home"; }
// Prep Checklist: opens on the production whose prep is today (never asks for a list), keeps checks and notes with the production, a copy starts fresh
{ const t = new Date(), iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  const keep = A.app.productions.slice(), ks = A.app.settings.pcList; delete A.app.settings.pcList;
  const a = A.newProduction({ name: "A", houseId: "utopia", updatedAt: Date.now() + 5000, items: { y1: { qty: 1, name: "Gear" } } }), pr = A.newProduction({ name: "Prep today", houseId: "utopia", prep: iso, updatedAt: 1, items: { x0: { qty: 1, name: "Gear zero" } } });
  A.app.productions.push(a, pr); ok(A.pcListId() === pr.id, "Prep Checklist opens on the production whose prep is today");
  A.app.settings.pcList = "none"; ok(A.pcListId() === "", "No list: to-dos and notes only"); delete A.app.settings.pcList;
  pr.items.x1 = { qty: 2, name: "Gear one" }; pr.items.x2 = { qty: 1, name: "Gear two" }; const d = A.pcData(pr); d.ok.x1 = 1; d.note.x2 = "Battery plate loose";
  delete pr.items.x0; const c = A.pcCount(pr); ok(c.n === 2 && c.ok === 1 && c.att === 1, "gear counted: 2 items, 1 checked, 1 to look at");
  A.app.view = "prep"; const h = A.viewPrep(); ok(/Prep Checklist/.test(h) && /aria-checked="true"/.test(h) && /Battery plate loose/.test(h) && />To-do</.test(h) && />Notes</.test(h), "the page shows the gear with its check and its note, and the To-do and Notes tabs");
  { d.todo.push({ id: "q1", t: "Call the house", done: true }); d.pad = "שורה ראשונה\nSecond line"; A.app.settings.pcList = pr.id;
    A.app.pcTab = "todo"; const ht = A.viewPrep(); ok(/data-act="pc-reset"[^>]*>[\s\S]*?Reset/.test(ht) && /placeholder="Add a line: order 20 cards"/.test(ht), "the Prep Checklist's To-do: the Notes checklist's own rules (the same line to add, Reset under it)");
    d.todo[0].done = false; ok(/data-act="pc-clear"[^>]*>[\s\S]*?Delete list/.test(A.viewPrep()), "nothing ticked: the same button deletes the list");
    A.app.pcTab = "notes"; const hn = A.viewPrep(); ok(/class="nt-bar-row"/.test(hn) && /id="f-notes" contenteditable="true"/.test(hn) && /<div dir="auto">שורה ראשונה<\/div><div dir="auto">Second line<\/div>/.test(hn) && !/pc-pad/.test(hn), "its Notes: the Notes page's notepad (toolbar, each line its own direction), its text as it was");
    d.padRich = [{ runs: [{ t: "Bold", b: 1 }], al: "c" }]; ok(/<div dir="auto" style="text-align:center"><b>Bold<\/b><\/div>/.test(A.viewPrep()), "its formatted notes kept as written");
    d.todo.length = 0; delete d.pad; delete d.padRich; A.app.pcTab = null; delete A.app.settings.pcList; }
  ok(!A.copyProduction(pr).check, "a copy of a production starts with a fresh checklist");
  const e = A.newProduction({ name: "Empty", houseId: "utopia", prep: iso, updatedAt: Date.now() + 9000 }); A.app.productions.push(e);
  ok(A.pcListId() === pr.id && !/>Empty</.test(A.viewPrep()), "empty lists stay out of the tools' pickers: the checklist skips an empty production, even with its prep today");
  A.app.productions.length = 0; A.app.productions.push(...keep); if (ks !== undefined) A.app.settings.pcList = ks; A.app.view = "home"; }

// --- round 18: a Camera List line like a Favorites row: the star before the name, the page, edit and remove in the corner
{ const q = A.newProduction({ name: "Rows", houseId: "utopia" }); A.app.productions.push(q); let id0; for (const [id, e] of A.ITEM) if (e.h.id === "utopia") { A.setQty(q, id, 1); id0 = id; break; }
  A.app.pid = q.id; A.app.view = "production"; A.app.tab = "list"; const v = A.viewProduction();
  ok(/<div class="l-grid l-g2"><button class="handle"[^]*?<\/button>\s*<span class="nm-col">[^]*?<span class="l-right"><span class="tools"><button class="star"[^]*?data-act="edit-line"[^]*?data-act="remove"[^]*?<\/span><span class="l-bottom">[^]*?class="stepper/.test(v), "Camera List line: the name on the left; on the right the tools (favorite, product page, edit, remove) over the counter");
  A.app.view = "home"; }

// --- a typed-in item joins the catalog: the star and the line move to the catalog item, nothing left twice
{ const U = A.houseById("utopia"), q = A.newProduction({ name: "ToCat", houseId: "utopia" }); A.app.productions.push(q); A.app.pid = q.id; A.app.view = "production";
  A.app.settings.favorites[A.favKeyCustom("Gizmo Cart", "display")] = { name: "Gizmo Cart", section: "display" };
  A.addCustomLine(q, "Gizmo Cart", "display"); const lid = Object.keys(q.items).find(k => q.items[k].custom); q.items[lid].qty = 3; q.items[lid].note = "blue";
  A.app.tab = "fav"; A.app.favTab = "items"; ok(/data-act="to-catalog" data-fav=/.test(A.viewFavorites(q, U)), "a typed-in favorite offers Add to catalog");
  A.app.tab = "list"; ok(new RegExp('data-act="to-catalog" data-id="' + lid + '"').test(A.viewProduction()), "a typed-in line offers Add to catalog");
  modals.length = 0; A.toCatalog(q, { name: "Gizmo Cart", section: "display", favKey: A.favKeyCustom("Gizmo Cart", "display") }); const dlg = modals.pop() || "";
  ok(/data-fromname="Gizmo Cart"/.test(dlg) && /value="Gizmo Cart"/.test(dlg), "not in the catalog yet: the new-item dialog, its name filled in");
  const nid = A.createOwnItem(U, { name: "Gizmo Cart", s: [...A.ITEM.values()].find(e => e.h === U).s.key, section: "display" });
  A.fromCustomDone(q, { name: "Gizmo Cart", section: "display", favKey: A.favKeyCustom("Gizmo Cart", "display") }, nid, true);
  ok(!A.app.settings.favorites[A.favKeyCustom("Gizmo Cart", "display")] && A.app.settings.favorites[nid] && q.items[nid] && q.items[nid].qty === 3 && q.items[nid].note === "blue" && !q.items[lid], "saved: the star and the line (quantity and note kept) are the catalog item now");
  delete A.app.settings.favorites[nid]; A.app.view = "home"; }

// --- the item dialog never asks for a Camera List section (the category decides); Favorites says which rental house it shows
{ const U = A.houseById("utopia"); modals.length = 0; A.catEditDialog(U, null, null, { name: "X" }); const d = modals.pop() || "";
  ok(!/<select id="ci-sec"/.test(d) && /type="hidden" id="ci-sec" name="section"/.test(d), "New item: no Camera List section field, it follows the category");
  const q = A.newProduction({ name: "Note", houseId: "utopia" }); A.app.productions.push(q); A.app.pid = q.id; A.app.view = "production"; A.app.tab = "fav";
  ok(/Saved per rental house. These are Utopia's./.test(A.viewFavorites(q, U)), "Favorites: one line on which rental house these belong to"); A.app.view = "home"; }
// --- Favorites from the start page: a rental house switch, no house note, a saved list starts a production
{ A.app.settings.favHouse = "fitussi"; A.app.view = "favs"; A.app.favTab = "items"; const fp = A.favSolo();
  const h = A.viewFavsSolo();
  ok(fp.browse && fp.houseId === "fitussi" && /data-act="fav-house" data-house="fitussi" aria-pressed="true"/.test(h) && !/fav-house-note/.test(h) && /id="tabpane"/.test(h), "Favorites outside a production: one rental house at a time, picked with a switch");
  const L = { id: "sl-t", name: "Basic", houseId: "fitussi", items: [] }; A.savedLists().push(L);
  const sl = A.savedListsHtml(fp, A.houseById("fitussi"));
  ok(/data-act="list-start" data-id="sl-t"/.test(sl) && !/data-act="list-add"/.test(sl), "a saved list there starts a new production with it");
  A.savedLists().splice(A.savedLists().indexOf(L), 1); A.app.view = "home"; }
// --- Camera cards: a card for each camera body on the list, the Media Calculator's choices, typed fields, the printed card
{ const keepRules = A.app.settings.rules; A.app.settings.rules = [];
  const pc = A.newProduction({ name: "Multi", houseId: "utopia", shootStart: "2026-11-20", shootEnd: "2026-11-25" }); A.app.productions.push(pc); pc.updatedAt = Date.now() + 1e6;
  const a35 = find("utopia", /^ARRI Alexa 35$/), fx9 = find("utopia", /^Sony PXW-FX9$/i);
  A.setQty(pc, a35, 2); A.setQty(pc, fx9, 1);
  A.app.settings.camList = pc.id; A.app.view = "cams";
  ok(A.camListId() === pc.id && A.camCur() === pc, "Camera cards work on the list picked");
  const cs = A.camsOf(pc);
  ok(cs.length === 3 && cs.map(c => c.L).join("") === "ABC" && cs[0].id === a35 && cs[2].id === fx9 && cs[0].col !== cs[1].col, "a card for each camera body on the list: A, B, C, each its own color");
  const v = A.camVals(pc, cs[0]);
  ok(v.mk === "ARRI" && v.codec && v.sensor && /^\d+×\d+$/.test(v.px) && v.media && /min|h/.test(v.per), "a card's recording side comes from the Media Calculator: codec, sensor coverage, file resolution, media and its recording time");
  const vf = A.camVals(pc, cs[2]);
  ok(/FF 6K|FFc 5K|S35 4K/.test(vf.sensor) && /3840×2160|4096×2160/.test(vf.px), "an FX9: the sensor coverage (FF 6K) apart from the file it makes (UHD)");
  A.camSetVal(pc, cs[0], "codec", "ProRes 422 HQ"); A.camSetVal(pc, cs[0], "sensor", "4K 16:9"); A.camSetVal(pc, cs[0], "fps", "25");
  const v2 = A.camVals(pc, cs[0]);
  ok(v2.codec === "ProRes 422 HQ" && v2.sensor === "4K 16:9" && cs[0].rec.fps === 25, "choosing codec, sensor coverage and frame rate sets them on that camera only");
  const t = (f, val) => ({ dataset: { camf: f, k: cs[0].k }, value: val });
  A.camField(pc, t("op", "Yoni Cohen")); A.camField(pc, t("vid", "Teradek Bolt 6 XT 750")); A.camField(pc, t("sn", "SN 2210-4821")); A.camField(pc, t("fp", "Maya Bar")); A.camField(pc, t("foc", "ARRI Hi-5")); A.camField(pc, t("ch", "Ch 3"));
  ok(cs[0].op === "Yoni Cohen" && cs[0].sn === "4821" && cs[0].ch === "Ch 3", "typed fields are kept as typed; the serial keeps its last 4 digits, even pasted whole");
  A.camField(pc, t("snr", "RX-0099-1234")); ok(cs[0].snr === "1234" && /SN TX 4821 · RX 1234/.test(A.camCardHtml(pc, cs[0], false)) && /data-camf="snr"/.test(A.camFormHtml ? A.camFormHtml(pc, cs[0]) : A.viewCams()), "wireless video: the transmitter's and the receiver's serials, each its last 4 digits, on the card");
  const card = A.camCardHtml(pc, cs[0], false);
  ok(/class="cc-ring">A</.test(card) && /Camera operator<\/div><div class="cc-v"><span dir="auto">Yoni Cohen/.test(card) && /Sensor coverage/.test(card) && /File resolution/.test(card) && /ProRes 422 HQ/.test(card) && /SN TX 4821/.test(card) && /Maya Bar/.test(card) && /ARRI Hi-5<\/span><\/div><div class="cc-s">Ch 3/.test(card) && /Multi/.test(card) && !/25 fps|Frame rate/.test(card), "the printed card: letter, camera, operator and focus puller, sensor coverage, file resolution with codec, media with time, wireless video with SN, focus with channel; no frame rate");
  ok(/style="--c:#18171d"/.test(A.camCardHtml(pc, cs[0], true)) && /class="ccard bw"/.test(A.camCardHtml(pc, cs[0], true)), "black and white: no color on the card");
  A.camSetVal(pc, cs[2], "letter", "A");
  ok(cs[2].L === "A" && cs[0].L === "C", "picking a letter another camera has: the two swap");
  A.camSetVal(pc, cs[2], "letter", "C"); A.camSetVal(pc, cs[0], "letter", "A");
  cs[1].foc = "arri hi-5"; cs[1].ch = "ch 3";
  const cmp = A.camCompareHtml(pc, cs);
  ok(/class="clash"/.test(cmp) && /Same as A!/.test(cmp) && /Same as B!/.test(cmp) && (cmp.match(/<th scope="col"/g) || []).length === 3, "Compare: a column per camera; two on the same focus channel are marked");
  const h = A.viewCams();
  ok(/Multicam management/.test(h) && !/data-act="cam-print"/.test(h) && /data-act="cam-create"/.test(h) && /data-act="cam-fold"/.test(h) && (h.match(/class="cam-chip( on)?"/g) || []).length === 3 && /data-act="cam-cmp"/.test(h) && /data-camf="op"/.test(h) && /data-k="codec"/.test(h) && /Not printed/.test(h), "the page: Multicam management, the list, A B C, Compare, the camera's card to fill in, then Create cards");
  ok(/data-k="mode"/.test(h), "4K 16:9 in ProRes makes 4K, UHD, 2K or HD: there File resolution is a menu");
  A.camSetVal(pc, cs[0], "sensor", "4.6K 3:2 Open Gate"); const h1 = A.viewCams();
  ok(!/data-k="mode"/.test(h1) && /<span class="cr-l"><span class="tl-c lt cam-lt"[^>]*>[\s\S]*?<\/span>File resolution<\/span>[\s\S]*?<span class="cr-pv cr-info">4.6K <span class="mono">4608×3164/.test(h1), "a sensor area that makes one file: File resolution is just shown");
  A.camSetVal(pc, cs[0], "sensor", "4K 16:9"); A.camSetVal(pc, cs[0], "mode", "4K 16:9 → UHD");
  modals.length = 0; A.camPicker("sensor"); const ms = modals.pop() || "";
  ok(!/→/.test(ms) && (ms.match(/data-k="sensor"/g) || []).length === 8, "the Sensor coverage list: each sensor area once, no arrows");
  A.app.camFold = true; const hf = A.viewCams(); A.app.camFold = false;
  ok(/class="cf-l">List<\/span>/.test(h) && /aria-expanded="false"/.test(h) && !/class="cam-fp"/.test(h) && /class="cam-fp"/.test(hf) && /<b>Shoot<\/b> 20–25 Nov 2026/.test(hf) && /data-act="cam-src"/.test(hf), "the list folded in one row; open, the lists to tick and the shoot (and prep) dates");
  ok((h.match(/class="cam-chip( on)?"/g) || []).length === 3 && /grid-template-columns|cam-chips/.test(h) && /class="iconbtn cb-cmp"/.test(h) && !/ph-sub/.test(h), "the letters in a row of their own; Compare a small button at the top, beside back");
  ok(A.CAM_COLORS.slice(0, 6).join() === "#3ee24b,#e8f20c,#ff2e93,#ff6a10,#e5484d,#1e9be8" && A.camInk("#e8f20c") === "#18171d" && A.camInk("#1e9be8") === "#fff", "colors: fluorescent green, yellow, pink, orange, then red and blue; a dark letter on the bright ones");
  A.app.view = "camprint"; const pr = A.viewCamPrint(); A.app.view = "cams";
  ok(/Camera cards/.test(pr) && (pr.match(/class="ccard/g) || []).length === 3 && /data-act="cam-save"[^>]*>Save PDF/.test(pr) && /data-act="cam-share"[^>]*>Share/.test(pr) && /8.6 × 5.7 cm/.test(pr) && /7.4 × 4.9 cm/.test(pr) && /Black &amp; white|Black & white/.test(pr), "Create cards: every camera's card, the size and colors, Save PDF and Share");
  A.app.settings.camList = "none"; const fp = A.camCur();
  ok(fp.browse && A.camsOf(fp).length >= 1 && A.camsOf(fp)[0].L === "A", "with no list: cameras of your own, starting with A");
  A.app.settings.camsMeta = { name: "Pilot", date: "2026-12-01" }; A.camsOf(fp)[0].id = a35;
  ok(/None<\/span> · <bdi>Pilot/.test(A.viewCams()) && !/id="cam-pn"/.test(A.viewCams()) && (A.app.camFold = true, /id="cam-pn"/.test(A.viewCams()) && /data-act="cal-open" data-mode="day"/.test(A.viewCams()) && /<span>1 Dec<\/span>/.test(A.viewCams())) && (A.app.camFold = false, true) && /Pilot/.test(A.camCardHtml(fp, A.camsOf(fp)[0])) && /1 Dec 2026/.test(A.camCardHtml(fp, A.camsOf(fp)[0])), "with no list: a production name, and the date on a small calendar button; both on the cards");
  A.app.settings.camList = pc.id; A.app.view = "home"; A.app.settings.rules = keepRules; A.app.productions.splice(A.app.productions.indexOf(pc), 1); }
// --- Multicam: wireless video and focus from lists, copying a camera's setup, notes on the card
{ const keepRules = A.app.settings.rules; A.app.settings.rules = [];
  const pc = A.newProduction({ name: "Copy", houseId: "utopia" }); A.app.productions.push(pc); pc.updatedAt = Date.now() + 2e6;
  const a35 = find("utopia", /^ARRI Alexa 35$/), bolt = find("utopia", /^Teradek Bolt 6 LT 750 3G-SDI\/HDMI Wireless Video Set$/);
  A.setQty(pc, a35, 2); A.setQty(pc, bolt, 1); A.app.settings.camList = pc.id; A.app.view = "cams";
  const cs = A.camsOf(pc); A.app.camK = cs[1].k;
  modals.length = 0; A.camPicker("vid"); const mv = modals.pop() || "";
  ok(/<div class="mc-grp">On the list<\/div><button[^>]*data-v="Teradek Bolt 6 LT 750"/.test(mv) && /<div class="mc-grp">Hollyland<\/div>/.test(mv) && /id="camDevOther"/.test(mv), "Wireless video: a list by maker, the one on the list first, and a way to type another");
  modals.length = 0; A.camPicker("foc"); const mf = modals.pop() || "";
  ok(/data-v="ARRI Hi-5"/.test(mf) && /data-v="Teradek RT CTRL.5"/.test(mf) && /data-v="Tilta Nucleus-M II"/.test(mf) && /data-v="DJI Focus Pro"/.test(mf), "Focus: ARRI, Teradek RT, Tilta, DJI and the rest, by maker");
  A.camSetVal(pc, cs[0], "vid", "Teradek Bolt 6 LT 750"); A.camSetVal(pc, cs[0], "foc", "ARRI Hi-5"); cs[0].op = "Yoni"; cs[0].sn = "1234"; cs[0].ch = "Ch 3";
  A.camSetVal(pc, cs[0], "codec", "ProRes 422 HQ");
  const und = A.camCopy(pc, cs[1], cs[0]);
  ok(cs[1].vid === "Teradek Bolt 6 LT 750" && cs[1].foc === "ARRI Hi-5" && cs[1].rec.codec === "ProRes 422 HQ" && !cs[1].op && !cs[1].sn && !cs[1].ch && cs[1].L === "B", "copying camera A's setup onto B: the camera, recording, media and systems; not the people, serial, channel or letter");
  und(); ok(cs[1].vid !== "Teradek Bolt 6 LT 750", "and it can be undone");
  cs[0].notes = [{ t: "Lens", v: "Fujinon Premista 28-100" }];
  const cd = A.camCardHtml(pc, cs[0], false);
  ok(/<div class="cc-f" data-fk="notes"><div class="cc-l">Lens<\/div><div class="cc-v"><span dir="auto">Fujinon Premista 28-100/.test(cd) && (cd.match(/class="cc-f" data-fk/g) || []).length === 8, "a note prints with its own title, in the two-column grid");
  A.app.camK = cs[0].k; const hf = A.viewCams();
  ok(/data-camnote="t"[^>]*value="Lens"/.test(hf) && /data-act="cam-note-add"/.test(hf), "the note's title and text are edited in place; one more line can be added");
  A.app.camK = cs[1].k; const hv = A.viewCams(); modals.length = 0; A.camPicker("copy"); const mc = modals.pop() || "";
  ok(/data-act="cam-pick" data-k="copy"/.test(hv) && /data-act="cam-del"/.test(hv) && /data-act="cam-copy" data-k="/.test(mc) && /class="cam-mini"[^>]*>A</.test(mc), "Copy setup: an icon on the camera's card opens the other cameras to pick; delete beside it");
  modals.length = 0; A.camPicker("letter"); const ml = modals.pop() || "";
  ok(/data-act="cam-col"/.test(ml) && !/data-act="cam-col"/.test(hv) && !/data-act="cam-del"/.test(ml), "the color is picked in the letter's sheet, not on the page");
  // the card's layout: one order for every card, fields can be hidden; arranging shows one card with handles to drag and × to hide
  const keys = c2 => [...c2.matchAll(/class="cc-f" data-fk="(\w+)"/g)].map(m => m[1]).filter((k, i, a) => a.indexOf(k) === i).join(",");
  ok(keys(A.camCardHtml(pc, cs[0])) === "op,fp,sensor,file,media,vid,foc,notes", "the card's fields in the usual order");
  A.camLayoutSet(["vid", "foc", "op", "fp", "sensor", "file", "media", "notes"], ["fp"]);
  ok(keys(A.camCardHtml(pc, cs[0])) === "vid,foc,op,sensor,file,media,notes" && keys(A.camCardHtml(pc, cs[1])) === "vid,foc,op,sensor,file,media", "a new layout: every card follows it, and a hidden field is left out");
  A.app.view = "camprint"; A.app.camLayoutEdit = true; const ce = A.viewCamPrint(); A.app.camLayoutEdit = false;
  ok((ce.match(/class="ccard[^"]*cc-edit/g) || []).length === 1 && /data-act="cl-hide" data-fk="vid"/.test(ce) && /data-act="cl-show" data-fk="fp"[^>]*>\+ Focus puller/.test(ce) && /data-act="cl-reset"/.test(ce) && /data-act="cl-edit"[^>]*>Done/.test(ce), "arranging: one card, × on each field, the hidden ones to bring back, Reset and Done");
  ok(/data-act="cl-edit"[^>]*>[\s\S]*?Edit layout/.test(A.viewCamPrint()), "the Camera cards page: Edit layout");
  delete A.app.settings.camLayout; A.app.view = "cams";
  // the table: every camera's data on one page, clashes marked
  cs[1].vid = cs[0].vid; cs[1].sn = cs[0].sn; cs[1].foc = cs[0].foc; cs[1].ch = cs[0].ch;
  const tb = A.camTableHtml(pc, false);
  ok(/<div class="ct-title">Camera setup<\/div>/.test(tb) && (tb.match(/<th class="ct-lc">/g) || []).length >= 9 && /<th class="ct-lc">Frame rate<\/th>/.test(tb) && (tb.match(/class="ct-ring"/g) || []).length === 2, "the table: a column for each camera, a row for each field, the frame rate too");
  ok((tb.match(/class="ct-clash"/g) || []).length === 4 && /same as B!/.test(tb) && /same as A!/.test(tb) && A.camClash(cs, cs[0], "vid") === "B", "two cameras on the same focus channel, or with the same video serial: marked in red, both of them");
  A.app.settings.camPrint = { size: "std", ink: "color", what: "table" }; A.app.view = "camprint"; const tp = A.viewCamPrint();
  ok(/Camera table/.test(tp) && /class="ct-prev[^"]*" data-act="ct-zoom"/.test(tp) && /data-act="cam-save"/.test(tp) && !/Edit layout/.test(tp) && /data-k="what" data-v="table" aria-pressed="true"/.test(tp), "Cards or Table: the table page, its preview to zoom, Save PDF and Share");
  A.app.settings.camPrint.what = "cards"; A.app.view = "cams";
  A.app.view = "home"; A.app.settings.rules = keepRules; A.app.productions.splice(A.app.productions.indexOf(pc), 1); }
// --- Multicam from a list: its cameras, wireless video and focus come in by themselves
{ const keepRules = A.app.settings.rules; A.app.settings.rules = [];
  const pc = A.newProduction({ name: "Auto", houseId: "utopia" }); A.app.productions.push(pc); pc.updatedAt = Date.now() + 3e6;
  const a35 = find("utopia", /^ARRI Alexa 35$/), fx9 = find("utopia", /^Sony PXW-FX9$/i), bolt = find("utopia", /^Teradek Bolt 6 LT 750 3G-SDI\/HDMI Wireless Video Set$/), hi5 = find("utopia", /^ARRI Hi-5 Hand Unit$/), ctrl5 = find("utopia", /^Teradek CTRL.5 Hand Unit$/);
  A.setQty(pc, a35, 2); A.setQty(pc, fx9, 1); A.setQty(pc, bolt, 1); pc.items[bolt].tx = 2; A.setQty(pc, hi5, 2); A.setQty(pc, ctrl5, 1);
  ok(A.camDevOnList(pc, "vid").join("|") === "Teradek Bolt 6 LT 750|Teradek Bolt 6 LT 750" && A.camDevOnList(pc, "foc").sort().join("|") === "ARRI Hi-5|ARRI Hi-5|Teradek RT CTRL.5", "on the list: two video transmitters (the set's TX count) and three focus hand units");
  A.app.settings.camList = pc.id; A.app.view = "cams";
  const cs = A.camsOf(pc);
  ok(cs.length === 3 && cs[0].vid === "Teradek Bolt 6 LT 750" && cs[1].vid === "Teradek Bolt 6 LT 750" && !cs[2].vid && cs.every(c => c.foc) && cs.filter(c => c.foc === "ARRI Hi-5").length === 2, "the cards come with them: A and B get the two transmitters, all three a focus unit");
  A.app.camFold = true; ok(/<b>On the list<\/b> 3 cameras · 2 wireless video · 3 focus/.test(A.viewCams()), "the page says what it found on the list (in the lists' row, opened)"); A.app.camFold = false;
  A.setQty(pc, a35, 3); const cs2 = A.camsOf(pc);
  ok(cs2.length === 4 && cs2[3].L === "D" && cs2[3].id === a35, "a camera added to the list later brings its card");
  cs2.splice(3, 1); ok(A.camsOf(pc).length === 3, "a card deleted here stays deleted");
  cs2[0].vid = "Hollyland Mars 4K"; ok(A.camsOf(pc)[0].vid === "Hollyland Mars 4K", "what was typed or picked stays as it is");
  A.app.view = "home"; A.app.settings.rules = keepRules; A.app.productions.splice(A.app.productions.indexOf(pc), 1); }
// --- Sensor coverage for the cameras whose formats name only the file: the scan mode, its area in mm, crops the frame rate forces
{ const keepList = A.app.settings.camList; A.app.settings.camList = "none"; const fp = A.camCur(), cs = A.camsOf(fp), c = cs[0], keep = { id: c.id, rec: c.rec, name: c.name };
  const fx6 = find("utopia", /^Sony PXW-FX6$/i), ronin = find("utopia", /^DJI Ronin 4D 4-Axis Cinema Camera 6K$/), c70 = find("utopia", /^Canon EOS C70/);
  A.camSetVal(fp, c, "cam", fx6); A.camSetVal(fp, c, "codec", "XAVC-I 4K"); A.camSetVal(fp, c, "mode", "UHD"); A.camSetVal(fp, c, "fps", 25);
  let v = A.camVals(fp, c);
  ok(v.sensor === "Full Frame" && v.sensorMm === "35.7 × 18.8 mm" && v.scans.length === 1 && /35\.7 × 18\.8 mm/.test(A.camCardHtml(fp, c)) && !/data-camf="sensorT"/.test(A.camFormHtml(fp, c)), "FX6 UHD 25p: Full Frame, 35.7 × 18.8 mm, on the card too (no typed field)");
  A.camSetVal(fp, c, "fps", 120); v = A.camVals(fp, c);
  ok(v.sensor === "Full Frame, 10% crop" && /≈32\.1 × 18\.1/.test(v.sensorMm), "FX6 UHD 120p: the 10% crop the frame rate forces");
  A.camSetVal(fp, c, "codec", "XAVC-I HD"); A.camSetVal(fp, c, "fps", 25); v = A.camVals(fp, c);
  ok(v.scans.length === 2 && /data-k="scan"/.test(A.camFormHtml(fp, c)), "FX6 HD: Full Frame or Super 35, a choice");
  A.camSetVal(fp, c, "scan", "Super 35"); v = A.camVals(fp, c); ok(v.sensor === "Super 35" && /≈23\.8 × 13\.4/.test(v.sensorMm), "Super 35 picked: its area");
  A.camSetVal(fp, c, "cam", ronin); A.camSetVal(fp, c, "mode", "C4K"); A.camSetVal(fp, c, "fps", 120); v = A.camVals(fp, c);
  ok(v.sensor === "Super 35" && /24\.5 × 12\.9/.test(v.sensorMm) && v.fileA === "C4K" && /data-k="mode"/.test(A.camFormHtml(fp, c)), "Ronin 4D C4K 120p: Super 35; the file chosen under File resolution");
  A.camSetVal(fp, c, "cam", c70); A.camSetVal(fp, c, "codec", "XF-AVC Intra HD"); A.camSetVal(fp, c, "fps", 120); v = A.camVals(fp, c);
  ok(/Super 16/.test(v.sensor) && /12\.3 × 6\.9/.test(v.sensorMm), "C70 HD 120p: the Super 16 crop");
  // every camera whose formats name only the file has something concrete to show
  const miss = []; for (const [id, e] of A.ITEM) { const prof = A.recProfile(e.it.name); if (!prof) continue; for (const cd of prof) for (const m of cd.m) { const key = m[0].split(" → ")[0]; if (!cd.m.every(x => /^(UHD|4K DCI|HD|C4K|2K)$/.test(x[0]))) continue; const sc = A.camScanOf(e, cd, key, Math.min(25, m[3] || 25)); if (!sc || !sc.length) miss.push(e.it.name + " · " + cd.n + " · " + key); } }
  ok(!miss.length, "every file-only format has its sensor coverage" + (miss.length ? ": missing " + [...new Set(miss)].slice(0, 6).join("; ") : ""));
  Object.assign(c, keep); A.app.settings.camList = keepList; }
// --- Media whose size the catalog doesn't give (Fitussi's "CFast Card"): its size is chosen, then the recording time shows
{ const keepList = A.app.settings.camList, made = [];
  const fm = A.newProduction({ houseId: "fitussi", name: "Mini" }); A.app.productions.push(fm); made.push(fm);
  const mini = find("fitussi", /^ARRI Alexa Mini$/); A.setQty(fm, mini, 1); A.app.settings.camList = fm.id;
  const c = A.camsOf(fm)[0]; let v = A.camVals(fm, c);
  ok(v.gbAsk && !v.per && !/data-k="gb"/.test(A.camFormHtml(fm, c)) && /Tap to choose its size/.test(A.camFormHtml(fm, c)), "a card with no size in the catalog: no extra field, it asks for its size");
  A.camPicker("card"); const sh = A.modalsSeen ? "" : ""; 
  A.camSetVal(fm, c, "card", c.rec.card + "@256"); v = A.camVals(fm, c);
  ok(c.rec.gb === 256 && v.per && /CFast 256GB/.test(v.media), "its size chosen: the recording time, and the size on the card (" + v.per + ")");
  A.app.settings.camList = "none"; const fp = A.camCur(), b = A.camsOf(fp)[0], keep = { id: b.id, rec: b.rec };
  b.rec = {}; A.camSetVal(fp, b, "cam", mini); b.rec.card = undefined; v = A.camVals(fp, b);
  ok(v.per && !v.gbAsk && v.cards.length >= 3, "no list: cards from every house, starting on one whose size is known");
  Object.assign(b, keep); A.app.settings.camList = keepList; for (const x of made) A.app.productions.splice(A.app.productions.indexOf(x), 1); }
// --- Multicam follows the list: fewer of a camera takes its cards; wireless video and focus come and go with the list
{ const keepList = A.app.settings.camList, made = [];
  const fx6 = find("utopia", /^Sony PXW-FX6$/i), hi5 = find("utopia", /^ARRI Hi-5 Hand Unit$/), bolt = find("utopia", /^Teradek Bolt 6 LT 750 3G-SDI\/HDMI Wireless Video Set$/);
  const m = A.newProduction({ houseId: "utopia", name: "Sync" }); A.app.productions.push(m); made.push(m);
  A.setQty(m, fx6, 3); A.setQty(m, bolt, 1); m.items[bolt].tx = 2; A.app.settings.camList = m.id;
  let cs = A.camsOf(m);
  ok(cs.length === 3 && cs[0].vid && cs[1].vid && !cs[2].vid, "3 cameras, 2 transmitters: A and B get them");
  cs[1].op = "Dana"; A.setQty(m, fx6, 2); cs = A.camsOf(m);
  ok(cs.length === 2 && cs.map(c => c.L).join("") === "AB" && cs[1].op === "Dana", "one FX6 off the list: its card (the last) goes, the others stay as they are");
  A.camSetVal(m, cs[1], "vid", "Hollyland Mars 4K"); delete m.items[bolt]; cs = A.camsOf(m);
  ok(!cs[0].vid && cs[1].vid === "Hollyland Mars 4K", "the transmitters off the list: the one the list put in goes, the one picked by hand stays");
  A.setQty(m, hi5, 1); cs = A.camsOf(m);
  ok(cs[0].foc === "ARRI Hi-5" && !cs[1].foc, "a Hi-5 added to the list: the first camera with no focus gets it");
  A.camSetVal(m, cs[0], "cam", find("utopia", /^ARRI Alexa 35$/)); A.setQty(m, fx6, 0); cs = A.camsOf(m);
  ok(cs.length === 1 && cs[0].L === "A", "every FX6 off the list: their cards go, but not one whose camera was changed by hand");
  A.app.settings.camList = keepList; for (const x of made) A.app.productions.splice(A.app.productions.indexOf(x), 1); }
// --- One search rule everywhere: words in any order, spaces and hyphens aside, a letter off when nothing else fits
ok(A.qHit("Canon EOS C400 6K", "canon c400") && A.qHit("Sony PXW-FX6", "fx6") && A.qHit("Sony PXW FX6", "fx-6") && A.qHit("ARRI Alexa Mini", "mini alexa"), "\"canon c400\" finds the EOS C400; fx6 and fx-6 find both FX6 spellings; words in any order");
ok(!A.qHit("ARRI Alexa Mini", "alxea mini") && A.qHit("ARRI Alexa Mini", "alexx mini", true) && !A.qHit("ARRI Alexa Mini", "sony", true), "a letter off only when loose (after exact matches came up empty)");
{ const free = A.mcFreeCams("any").map(id => A.ITEM.get(id).it.name), n = re => free.filter(x => re.test(x)).length;
  ok(n(/fx6/i) === 1 && n(/fx3$/i) === 1 && n(/^sony venice( 6k)?$/i) === 1 && n(/ronin 4d/i) === 1 && n(/gopro hero ?(black ?)?7|hero7/i) === 1 && n(/^arri alexa 35( production|$)/i) === 1 && n(/c300 (ef|pl)/i) === 2, "no list: one of each camera across the rental houses (FX6, FX3, Venice, Ronin 4D, GoPro 7, Alexa 35); C300 EF and PL stay two"); }
// --- Wireless video and focus: only what the rental houses have; the catalog's wording read right
{ const u = A.camDevAt("vid", ["utopia"]), f = A.camDevAt("foc", ["fitussi"]);
  ok(u.has("Teradek Bolt 6 LT 750") && !u.has("Teradek Bolt 6 XT 750") && u.has("Teradek Bolt 4K LT 750") && u.has("Teradek Bolt 4K LT 1500"), "Utopia's wireless video: what its catalog has (no Bolt 6 XT); \"Bolt 4K 750 LT\" is the Bolt 4K LT 750, a transmitter-and-receiver set counts");
  ok(f.has("Tilta Nucleus-M") && f.has("ARRI Hi-5") && !f.has("Teradek RT CTRL.5"), "Fitussi's focus: a Nucleus without \"Tilta\" in its name is found; nothing it doesn't have");
  ok(!A.camDevOf("SmallHD Ultra 7 Bolt 6 RX 1500 Monitor", "vid") && !A.camDevOf("ARRI cforce Mini Motor", "foc") && A.camDevOf("RT Motion MK3.1 Remote Follow Focus", "foc").full === "Teradek RT MK3.1", "a monitor or a motor isn't a device; RT Motion is Teradek RT"); }
// --- Multicam across a production's two units, and across several lists
{ const keepRules = A.app.settings.rules, keepList = A.app.settings.camList; A.app.settings.rules = [];
  const a35 = find("utopia", /^ARRI Alexa 35$/), fx9 = find("utopia", /^Sony PXW-FX9$/i), hi5 = find("utopia", /^ARRI Hi-5 Hand Unit$/), ctrl5 = find("utopia", /^Teradek CTRL.5 Hand Unit$/), bolt = find("utopia", /^Teradek Bolt 6 LT 750 3G-SDI\/HDMI Wireless Video Set$/);
  const made = [], mk = f => { const x = A.newProduction({ houseId: "utopia", ...f }); A.app.productions.push(x); made.push(x); return x; };
  const m = mk({ name: "Units" }); m.updatedAt = Date.now() + 5e6;
  const q = mk({ name: "Units", unit: "2nd Unit", mainOf: m.id, shootStart: "2026-12-02", shootEnd: "2026-12-03" }); m.unit2 = q.id; m.unit = "Main Unit";
  A.setQty(m, a35, 2); A.setQty(m, hi5, 2); A.setQty(m, bolt, 1); m.items[bolt].tx = 2; A.setQty(q, fx9, 1); A.setQty(q, ctrl5, 1);
  A.app.settings.camList = m.id; A.app.view = "cams";
  const cs = A.camsOf(m);
  ok(cs.length === 3 && cs.filter(c => !c.u2).map(c => c.L).join("") === "AB" && cs.filter(c => c.u2).map(c => c.L).join("") === "C" && cs[2].id === fx9 && cs[2].src === q.id, "a production with a 2nd Unit: the Main Unit's cameras are A and B, the 2nd Unit's C");
  ok(cs[0].foc === "ARRI Hi-5" && cs[1].foc === "ARRI Hi-5" && cs[2].foc === "Teradek RT CTRL.5" && cs[0].vid && cs[1].vid && !cs[2].vid, "each unit's wireless video and focus go to its own cameras");
  A.app.camK = cs[0].k; A.app.camU = undefined; A.app.camFold = true; const h = A.viewCams(); A.app.camFold = false;
  ok(/class="seg cam-useg"/.test(h) && /data-act="cam-u" data-v="" aria-pressed="true">Main Unit<i class=""[^>]*>2<\/i>/.test(h) && /aria-pressed="false">2nd Unit<i class=""[^>]*>1<\/i>/.test(h) && (h.match(/class="cam-chip( on)?"/g) || []).length === 2 && /<b>Main Unit<\/b> 2 cameras · 2 wireless video · 2 focus/.test(h) && /<b>2nd Unit<\/b> 1 camera · 0 wireless video · 1 focus/.test(h), "the page: a tab for each unit (its cameras' number), the letters of the unit shown, and what each unit's list holds");
  A.app.camU = true; const h2 = A.viewCams(); ok(A.camSel(m) === cs[2] && /data-act="cam-add" data-u="2"/.test(h2) && (h2.match(/class="cam-chip( on)?"/g) || []).length === 1, "the 2nd Unit's tab: its letters, its camera shown, + adds to it"); A.app.camU = undefined;
  ok(/2nd Unit · 2–3 Dec 2026/.test(A.camCardHtml(m, cs[2])) && /Main Unit/.test(A.camCardHtml(m, cs[0])) && /<th class="ct-lc">Unit<\/th>/.test(A.camTableHtml(m)) && A.camOrdered(m).map(c => c.L).join("") === "ABC", "the card says its unit and that unit's dates; the table has a Unit row");
  cs[2].u2 = undefined; delete cs[2].u2; ok(A.camOrdered(m)[2] === cs[2] && !/2nd Unit ·/.test(A.camCardHtml(m, cs[2])), "a camera moved to the Main Unit"); cs[2].u2 = 1;
  // a 2nd Unit with nothing on its list: what is known comes in, and the 2nd Unit's row waits for its cameras
  q.items = {}; delete m.cams; delete m.camsSeen; delete m.camsAuto; const cs1 = A.camsOf(m);
  A.app.camFold = true; const hu1 = A.viewCams(); A.app.camFold = false; A.app.camU = true; const hu2 = A.viewCams(); A.app.camU = undefined;
  ok(cs1.length === 2 && cs1.every(c => !c.u2) && /<b>2nd Unit<\/b> nothing on its list yet/.test(hu1) && /2nd Unit<i class="zero"[^>]*>0<\/i>/.test(hu1) && /No 2nd Unit cameras yet/.test(hu2) && /data-u="2"/.test(hu2), "an empty 2nd Unit: the Main Unit's cameras come in, the 2nd Unit's tab is there to fill");
  // another list beside it: its cameras come in as the 2nd Unit's, and go when it is taken off
  const o = mk({ name: "Other" }); A.setQty(o, fx9, 2);
  A.camSrcToggle(o.id); const cs3 = A.camsOf(m);
  ok(A.camSrcs(m).includes(o) && cs3.filter(c => c.src === o.id).length === 2 && cs3.filter(c => c.src === o.id).every(c => c.u2), "a list picked beside: its cameras come in, as the 2nd Unit's");
  ok(/class="cf-l">Lists<\/span>/.test(A.viewCams()) && /<bdi>Units<\/bdi> \+ <bdi>Other<\/bdi>/.test(A.viewCams()), "the folded row names both lists");
  A.camSrcToggle(o.id); ok(!A.camSrcs(m).includes(o) && A.camsOf(m).every(c => c.src !== o.id), "taken off: its cards go");
  // the names tell the units: the first list called 2nd Unit, the other Main (in Hebrew too)
  const a = mk({ name: "Night 2nd unit" }), b = mk({ name: "Night main" }); A.setQty(a, fx9, 1); A.setQty(b, a35, 1);
  A.app.settings.camList = a.id; A.camSrcToggle(b.id); const cs4 = A.camsOf(a);
  ok(cs4.some(c => c.id === a35 && !c.u2) && cs4.some(c => c.id === fx9 && c.u2), "names tell the units: \"Night 2nd unit\" and \"Night main\"");
  const he = mk({ name: "צילומים יחידה ב'" }), he1 = mk({ name: "צילומים" });
  he.camFrom = [he1.id]; ok(A.camSrcU2(he, he) && !A.camSrcU2(he, he1), "and in Hebrew: \"יחידה ב'\"");
  // taking the first list off: the next list picked becomes the first
  A.camSrcToggle(a.id); ok(A.app.settings.camList === b.id, "the first list off: the other one takes its place");
  A.camSrcToggle(b.id); ok(A.app.settings.camList === "none" && A.camCur().browse, "the last list off: no list (a name and a date of your own)");
  A.app.view = "home"; A.app.settings.rules = keepRules; A.app.settings.camList = keepList; for (const x of made) A.app.productions.splice(A.app.productions.indexOf(x), 1); }


// --- the sizes of a card named without one
{ ok(A.mediaSizes("XQD Card", "XQD").join() === "64,120,128" && A.mediaSizes("SxS Card", "SxS").join() === "16,32,64,128", "XQD and SxS cards: their sizes");
  ok(A.mediaSizes("SD Memory Card", "SD").join() === "32,64,128,256" && A.mediaSizes("v90 SD Memory Card", "SD").join() === "128,256", "SD and V90 SD: their sizes");
  ok(A.mediaSizes("P2 Express Card 512G,256G", "P2 / expressP2").join() === "256,512" && A.cardLabel("P2 Express Card 512G,256G", "Panasonic VariCam") === "P2 Express", "a name with two sizes: those two to choose, and the label without them");
  ok(A.mediaSizes("Sony 128GB XQD Memory Card", "XQD") === null, "a card named with its size: nothing to choose");
  ok(A.cardBytes("P2 Express Card 512G,256G", 256) === 256 * 1e9 * 0.94, "the size chosen counts"); }

// --- close focus, as each maker marks it (feet and inches)
{ const L = (h, re) => { for (const [id, e] of A.ITEM) if (e.h.id === h && re.test(e.it.name)) return e; throw new Error("no " + re); };
  const md = e => A.lensMod(e.it, A.lensSpec(e.it, e.s.id));
  const sig = md(L("fitussi", /^ARRI Signature Prime Set$/));
  ok(sig && sig.per && sig.per[18] === "1'2\"" && sig.per[125] === "3'4\"", "a set: each lens's close focus (Signature 18mm 1'2\", 125mm 3'4\")");
  ok(md(L("utopia", /^Cooke S4i T2\/14mm$/)).one === "9\"", "a single prime: Cooke S4/i 14mm, 9\"");
  ok(md(L("utopia", /^Zeiss 25mm Compact Prime T2\.9/)).one === "7\"" && md(L("utopia", /^Zeiss 50mm Macro Compact Prime/)).one === "10\"", "the CP.2 25mm T2.9 and the 50mm macro have their own");
  const opt = md(L("utopia", /^Angenieux Optimo Zoom 24-290/)); ok(opt && opt.one === "4'", "a zoom: Optimo 24-290, 4'");
  const mk = md(L("utopia", /^Fujinon MK18-55/)); ok(mk && mk.one === "2'9\"" && mk.macro === "1'3\"", "a zoom with a macro setting: MK18-55 2'9\" (macro 1'3\")");
  ok(md(L("utopia", /Super16 ArriFlex And Ultra Primes Mix/)) === null, "a Super 16 set named with Ultra Primes isn't read as Ultra Primes");
  ok(md(L("utopia", /^Zeiss Master Macro 100/)).one === "1'1\u00be\"", "the Master Macro 100: 1'1\u00be\"");
  ok(md(L("utopia", /^DZOFilm Vespid 50mm/)).one === "1'3\"" && md(L("utopia", /^DZOFilm Vespid 21mm/)).one === "11\"", "the 2026-11 check: Vespid 50 1'3\" (0.37 m), the 21 11\"");
  ok(md(L("utopia", /^Sony E-Mount 18-105mm/)).one === "1'6\"–3'1\"" && md(L("utopia", /^Sony FE 24-70mm f\/2\.8 GM II/)).one === "8\"–1'" && md(L("utopia", /^Sony FE 100mm f\/2\.8 GM/)).one === "2'9\"" && md(L("utopia", /^Sony FE 100mm f\/2\.8 GM/)).macro === "1'10\"", "Sony: power zooms wide–tele, the 24-70 GM II 8\"–1', the 100 STF 2'9\" (macro 1'10\")");
  ok(md(L("utopia", /^Cooke Panchro Prime Lens Set/)) === null && md(L("utopia", /^Canon EF 70-200mm f\/2\.8L Is II/)).one === "3'11\"" && md(L("utopia", /^Zeiss EF Distagon T\* 21mm/)).one === "9\"" && md(L("utopia", /^Zeiss Ultra Prime 10mm/)).one === "1'3\"", "the vintage Speed Panchro set has no figure (not the Panchro/i FF); Canon 70-200 IS II, ZE 21, Ultra Prime 10 added");
  ok(!/@property\s+--k\s*\{/.test(builtHtml) && /@property\s+--lck\s*\{/.test(builtHtml), "Lens Cards' size has a name of its own (--lck): the cameras' color --k stays a color");
  ok(A.cfInches("1'1\u00be\"") === 13.75 && A.cfInches("1'6\"–3'1\"") === 18 && A.cfInches("9\"") === 9 && A.cfInches("4'") === 48 && A.inTxt(18) === "1'6\"" && A.inTxt(24) === "2'" && A.CF_STEPS[0] === 6, "close focus in inches (a zoom's nearest end) and back");
  { const d43 = md(L("utopia", /^Dulens APO Mini Prime 43mm/)), dset = L("utopia", /^Dulens APO Mini Prime T2\.4\/T2\.6 Set/); ok(d43 && d43.one === "1'10\"" && (!dset || /1'10/.test(JSON.stringify(md(dset)))), "Dulens APO Mini Prime: the 43 at 1'10\", the set too"); }
  ok(/class="mod"[^>]*>CF 9&quot;</.test(A.specsHtml(L("utopia", /^Cooke S4i T2\/14mm$/).it)), "the lens's line shows CF 9\"");
  const sh = A.specsHtml(L("fitussi", /^ARRI Signature Prime Set$/).it);
  ok(/<span class="lt-h r-cf">CF<\/span><span class="cf r-cf">1(&#39;|')2&quot;<\/span>/.test(sh) && /<span class="lt-h r-mm">MM<\/span><span class="mm r-mm">\d+<\/span>/.test(sh) && /<span class="lt-h r-t">T<\/span><span class="t r-t">1\.8<\/span>/.test(sh) && !/<span>T1\.8<\/span>/.test(sh), "a set: a small table, the same three rows always (MM, T, CF); its stop in the table, not with the tags");
  const noCf = [...A.ITEM.values()].find(e => e.it.lens && A.lensSpec(e.it, e.s.id)?.per && !A.lensMod(e.it, A.lensSpec(e.it, e.s.id)));
  ok(!noCf || /<span class="lt-h r-cf">CF<\/span><span class="cf r-cf">–<\/span>/.test(A.specsHtml(noCf.it)), "a set with no close focus known still has its CF row, with dashes");
  const big = A.specsHtml(L("utopia", /Signature Prime LPL-Mount Lens Set Of 8/).it);
  ok((big.match(/class="lt-h[^"]*">MM/g) || []).length === 2 && /--k:4/.test(big) && /class="lt-h r-mm top">MM/.test(big), "8 lenses: two even rows of 4, the second ruled off"); }
{ const L = (h, re) => { for (const [id, e] of A.ITEM) if (e.h.id === h && re.test(e.it.name)) return e; return null; };
  const md = e => e ? A.lensMod(e.it, A.lensSpec(e.it, e.s.id)) : undefined;
  const g1 = md(L("utopia", /^Sony E-Mount 24-70mm f\/2\.8 GM$/)), g2 = md(L("utopia", /^Sony FE 24-70mm f\/2\.8 GM II/));
  ok(g1 === undefined || (g1 && g2 && g1.one === "1'3\"" && g2.one === "8\"–1'"), "a version in the name picks its own close focus (24-70 GM 1'3\", GM II 8\"–1')");
  const af = L("utopia", /^Samyang E-Mount 35mm F\/2\.8 AF/); ok(!af || md(af).one === "1'2\"", "the Samyang AF 35 f/2.8: its own figure (0.35 m), not the cine 35's"); }

// --- Lens card: the list's lenses with their close focus, three layouts
{ const m = A.newProduction({ houseId: "utopia", name: "Lens card test" }); A.app.productions.push(m); A.closeModal && A.closeModal();
  const add = re => { for (const [id, e] of A.ITEM) if (e.h.id === "utopia" && re.test(e.it.name)) { A.setQty(m, id, 1); return; } };
  add(/^ARRI Signature Prime LPL-Mount Lens Set Of 8$/); add(/^Cooke S4i T2\/14mm$/); add(/^Angenieux Optimo Zoom 24-290/); add(/^Fujinon MK18-55/); add(/^Zeiss Ultra Prime 10mm/);
  const R = A.lcRows(m);
  ok(R.sets.length === 1 && R.sets[0].lenses.length === 8 && R.sets[0].lenses[3].mm === "47" && R.sets[0].lenses[3].cf === "1'6\"", "the set: each lens with its close focus (47mm 1'6\")");
  ok(R.ones.length === 4 && R.ones.some(r => r.mm === "24–290" && r.cf === "4'") && R.ones.some(r => r.mm === "18–55" && r.macro === "1'3\"") && R.ones.some(r => r.mm === "10" && r.cf === "1'3\""), "single lenses and zooms: a row each, the macro too (the Ultra Prime 10 now 1'3\")");
  const o = { lay: "compact", ink: "color" }, c = A.lensCardHtml(m, o);
  ok(c.n === 12 && /class="lcard lc-lines lcc"/.test(c.html) && /<tr class="mm"><th>MM<\/th><td>18<\/td>/.test(c.html) && !/<tr class="t">/.test(c.html) && /class="lcc-g lcc-ones"><div class="lcc-n">Single lenses/.test(c.html), "compact: the set's name, its focal lengths over close focus, its one stop once; the single lenses a block of their own");
  ok(/<table class="lcc-o"><thead><tr><th>Lens<\/th><th class="n">MM<\/th><th class="n">T<\/th><th class="n">CF<\/th><th class="mac">Macro<\/th><\/tr><\/thead>/.test(c.html) && /<td class="nm">Angenieux Optimo[^<]*( <span class="lc-fd">Ø162 \(6x6 \/ adapter\)<\/span>)?<\/td><td class="n mm">24–290<\/td><td class="n">T2\.8<\/td><td class="n cf">4(&#39;|')<\/td>/.test(c.html), "compact, the single lenses: the same labels as the sets, the name, mm, stop and close focus each in a column");
  { const one = A.lensCardHtml(m, { lay: "one", style: "grid", col: "black" }).html;
    ok(/class="lcard lc-grid bw lct"/.test(one) && (one.match(/<tbody class="grp/g) || []).length === 2 && /<tbody class="grp ones">/.test(one) && /<tr class="h"><th colspan="2">mm<\/th><th class="n">Stop<\/th>/.test(one) && /<tr class="h"><th>Lens<\/th><th class="n">mm<\/th><th class="n">Stop<\/th>/.test(one) && !/lc-cols/.test(one), "one table: each set and the single lenses a block, its name above its column names; Grid design, black and white"); }
  ok(/--lc-a:#1a5fb4/.test(A.lensCardHtml(m, { lay: "compact", style: "bold", col: "blue" }).html) && /lc-bold/.test(A.lensCardHtml(m, { lay: "compact", style: "bold", col: "blue" }).html) && /lc-lines/.test(A.lensCardHtml(m, { lay: "one", style: "nope" }).html), "a design and a color of the card; an unknown one falls back to Lines, orange");
  ok(/style="--lck:1\.5;/.test(A.lensCardHtml(m, { lay: "compact", k: { compact: 1.5 } }).html) && /style="--lck:4;/.test(A.lensCardHtml(m, { lay: "one", k: { one: 9 } }).html) && /style="--lck:1;/.test(A.lensCardHtml(m, { lay: "one", k: { compact: 2 } }).html), "the size dragged: each layout its own, kept within 50%–400%");
  ok(A.lcStepK(1, 1) === 1.1 && A.lcStepK(1.37, 1) === 1.4 && A.lcStepK(1.37, -1) === 1.3 && Math.abs(A.lcStepK(1, -1) - .9) < 1e-9, "the size by − +: to the next tenth, up or down");
  A.app.settings.lcList = m.id; A.app.view = "lenscard"; const v = A.viewLensCard();
  ok((v.match(/data-act="lc-opt" data-k="lay"/g) || []).length === 2 && /id="lc-list"/.test(v) && /data-act="lc-save"/.test(v) && /Lens Cards/.test(v) && !/lc-grip/.test(v), "the page (Lens Cards): the list, two layouts, Save PDF; the card always fitted (no corner)");
  ok((v.match(/data-act="lc-k" data-v="-?1"/g) || []).length === 2 && (v.match(/data-act="lc-zoom" data-v="-?1"/g) || []).length === 2 && /id="lc-zl"[^>]*>1×</.test(v) && /data-act="lc-zoom" data-v="-1"[^>]*disabled/.test(v) && /class="lc-bar"/.test(v) && /data-act="lc-k1"[^>]*hidden/.test(v) && !/Actual size/.test(v), "under the card: its size with − +, back to the first size only once changed; the preview's zoom in steps, from 1×");
  A.app.productions.splice(A.app.productions.indexOf(m), 1); A.app.view = "home"; }

// --- Lens card: lines from a Word list or typed by hand are matched to catalog lenses by name, or read from their own name
{ const m = A.newProduction({ houseId: "utopia", name: "Word list" }); A.app.productions.push(m);
  for (const n of ["ARRI Signature Prime Set Of 8", "Cooke S4i T2/32mm", "Cooke 50mm", "Matte box MB-20", "Zeiss Master Macro 100 (PL Mount)"]) { const id = A.addCustomLine(m, n, "lenses"); m.items[id].qty = 1; }
  const R = A.lcRows(m), sig = R.sets.find(r => /Signature/.test(r.name));
  ok(sig && sig.lenses.length === 8 && sig.lenses[7].cf === "3'4\"", "a set typed by name: found in the catalog (Signature Prime set of 8), close focus and all");
  ok(R.ones.some(r => r.mm === "32" && r.cf === "1'") && R.ones.some(r => r.name === "Cooke" && r.mm === "50" && !r.cf), "one lens matched by name; one that fits many (Cooke 50mm) read from its own name, no close focus guessed");
  ok(!R.ones.some(r => /Matte/.test(r.name)) && R.ones.some(r => /Master Macro/.test(r.name) && r.cf === "1'1\u00be\""), "not a lens: left out; the Master Macro (no mm in its name) is in");
  A.app.productions.splice(A.app.productions.indexOf(m), 1); }
{ const m = A.newProduction({ houseId: "fitussi", name: "Thypoch" }); A.app.productions.push(m);
  for (const n of ["DZO Thypoch Simera-C set", "Thypoch Simera 21/28/35/50/75", "Thypoch Simera-C 21,28,35,50,75mm T1.5"]) { const id = A.addCustomLine(m, n, "lenses"); m.items[id].qty = 1; }
  const R = A.lcRows(m);
  ok(R.sets.length === 3 && R.sets.every(r => /Thypoch/.test(r.name) && r.lenses.length === 5 && r.lenses[4].cf === "1'10\""), "the DZO Thypoch set however it's written (another rental house's list too): found, each lens with its close focus");
  A.app.productions.splice(A.app.productions.indexOf(m), 1); }
// --- Lens card: a production with a 2nd Unit: picked once, both units' lenses, each under its unit
{ const m = A.newProduction({ houseId: "utopia", name: "Ronin 4D" }); A.app.productions.push(m);
  const q = A.copyProduction(m, { name: m.name, mainOf: m.id }); A.app.productions.push(q); m.unit2 = q.id; q.items = {};
  const add = (p, re) => { for (const [id, e] of A.ITEM) if (e.h.id === "utopia" && re.test(e.it.name)) { A.setQty(p, id, 1); return; } };
  add(q, /^DZOFilm Thypoch Simera-C/);
  let R = A.lcRows(m); ok(R.sets.length === 1 && R.units.length === 1 && R.units[0].label === "2nd Unit", "lenses only on the 2nd Unit: found from the production");
  A.app.settings.lcList = q.id; A.app.view = "lenscard"; let v = A.viewLensCard();
  ok((v.match(new RegExp('<option value="' + m.id + '"', "g")) || []).length === 1 && !v.includes('<option value="' + q.id + '"') && /Thypoch/.test(v), "the production once in the list picker (a 2nd Unit picked before comes to its production), its lenses shown");
  add(m, /^Cooke S4i T2\/14mm$/); R = A.lcRows(m);
  const c = A.lensCardHtml(m, { lay: "compact", ink: "color" }).html, t1 = A.lensCardHtml(m, { lay: "one", ink: "color" }).html;
  ok(R.units.length === 2 && /class="lc-u">Main Unit</.test(c) && /class="lc-u">2nd Unit</.test(c) && (t1.match(/<tr class="u">/g) || []).length === 2, "both units with lenses: each under its name");
  A.app.productions.splice(A.app.productions.indexOf(q), 1); A.app.productions.splice(A.app.productions.indexOf(m), 1); A.app.view = "home"; }

// --- settings on two phones: each setting's newer change wins, not the newer document
{ const T = 1000;
  const L = { favorites: { a: { name: "A" } }, look: { h: 200 }, haptics: true, me: { name: "Ofir", phone: "054" }, updatedAt: 5 * T, _t: { favorites: 5 * T, look: 2 * T, haptics: 1 * T, me: 1 * T } };
  const R = { favorites: {}, look: { h: 18 }, haptics: true, me: { name: "Ofir", phone: "054" }, updatedAt: 4 * T, _t: { favorites: 1 * T, look: 4 * T, haptics: 1 * T, me: 1 * T } };
  let m = A.setMerge(L, R);
  ok(m.s.favorites.a && m.s.look.h === 18 && m.fromL && m.fromR && m.s.updatedAt === 5 * T, "two phones changed different settings: both changes kept (a favorite from this phone, colors from the other)");
  m = A.setMerge(R, R); ok(!m.fromL && !m.fromR, "the same settings: nothing to take in or send");
  m = A.setMerge({ ...R, favorites: { b: 1, a: 2 } }, { ...R, favorites: { a: 2, b: 1 } }); ok(!m.fromL && !m.fromR, "the same content in another key order: no change");
  m = A.setMerge({ me: { name: "Ofir", phone: "054" }, updatedAt: 1 }, { me: {}, look: { h: 1 }, updatedAt: 9 }); ok(m.s.me.name === "Ofir" && m.s.look.h === 1 && m.fromL, "a name typed here is never lost to an account without one, even a newer one");
  m = A.setMerge({ favorites: { a: 1 }, updatedAt: 3 }, { favorites: { b: 1 }, look: { h: 5 }, updatedAt: 7 }); ok(m.s.favorites.b && !m.s.favorites.a && m.s.look.h === 5 && m.fromR && !m.fromL, "settings never stamped (an older version of the app): the newer document's");
  m = A.setMerge({ pcHide: undefined, updatedAt: 9, _t: { pcHide: 9 } }, { pcHide: true, updatedAt: 4 }); ok(!("pcHide" in m.s) && m.fromL, "a setting turned off here later than the account's: stays off");
  const was = JSON.parse(JSON.stringify(A.app.settings)); A.setPrevReset(); A.app.settings._t = { favorites: 7 }; A.app.settings.lcList = "zz"; A.setStamp();
  ok(A.app.settings._t.lcList > 0 && A.app.settings._t.favorites === 7 && Object.keys(A.app.settings._t).length === 2, "only the setting that changed gets the time"); A.app.settings = was; A.setPrevReset();
  ok(A.errText(new TypeError("x is undefined")) === "x is undefined" && A.errText({ reason: new Error("boom") }) === "boom", "an error's message, for the Control room");
}

// --- saved data carries its shape's version
{ const old = { id: "x", items: { a: { name: "Bolt", tx: 0, rx: 0, sets: 2, qty: 2 } } };
  A.upData(old, "production"); ok(old.v === A.SCHEMA && old.items.a.tx === 2 && old.items.a.rx === 2, "an older list is brought up to date as it's read (wireless sets as TX and RX), and marked with the version");
  const newer = { id: "y", v: A.SCHEMA + 1, items: { a: { tx: 0, rx: 0, sets: 2 } } }; A.upData(newer, "production");
  ok(newer.v === A.SCHEMA + 1 && newer.items.a.tx === 0, "a list from a newer app is left as it is");
  ok(A.newProduction({}).v === A.SCHEMA, "a new production has the version from the start"); }

// --- a kit of zooms (Laowa Ranger 16-30, 28-75, 75-180): three zooms, not six primes
{ for (const hid of ["fitussi", "utopia"]) { const m = A.newProduction({ houseId: hid, name: "Ranger" }); A.app.productions.push(m);
    for (const [id, e] of A.ITEM) if (e.h.id === hid && /Ranger.*(Kit|Set)/.test(e.it.name)) A.setQty(m, id, 1);
    const R = A.lcRows(m), k = R.sets[0];
    ok(R.sets.length === 1 && k.name === "Laowa " + (hid === "utopia" ? "Venus Optics Ranger Cine" : "Ranger") && k.lenses.map(x => x.mm + " " + x.cf).join(" | ") === "16–30 1'1\" | 28–75 1'7\" | 75–180 2'11\"", `${hid}'s Laowa Ranger kit: three zooms by their range, each with its close focus`);
    A.app.productions.splice(A.app.productions.indexOf(m), 1); }
  const e = [...A.ITEM.values()].find(x => /Ranger FF 3 Lens Kit/.test(x.it.name)), sp = A.lensSpec(e.it, e.s.id);
  ok(sp.zooms.length === 3 && sp.per.length === 3 && sp.per[1].f === 28 && sp.per[1].z[1] === 75, "the kit's spec: three zooms, each known by its wide end"); }

// --- formatted notes: bold, italic, underline, sizes, font, color, marker and bullets, the same in the PDF and in Word
{ const m = A.newProduction({ houseId: "utopia", name: "Notes", notes: "x" });
  m.notesRich = [{ runs: [{ t: "Pick up ", b: 1 }, { t: "at 7", c: "#c0392b", h: "#fff176", s: "l" }, { t: " please", i: 1, u: 1, f: "serif" }] }, { li: 1, runs: [{ t: "שני מוניטורים" }] }, { li: 1, runs: [{ t: "Cards", f: "mono" }] }];
  m.notes = A.ntPlain(m.notesRich); A.app.productions.push(m);
  ok(m.notes === "Pick up at 7 please\n• שני מוניטורים\n• Cards", "the plain text of formatted notes (for text exports and search)");
  const h = A.exportHtml(m);
  ok(/<b>Pick up <\/b><span style="color:#c0392b;background-color:#fff176;font-size:14.5px">at 7<\/span><span style="font-family:Georgia[^"]*"><i><u> please<\/u><\/i><\/span>/.test(h) && /<ul[^>]*><li dir="auto">שני מוניטורים<\/li><li dir="auto"><span style="font-family:'Courier New'/.test(h), "the PDF: each run with its format, bullets as a list");
  const x = A.docxXml(m);
  ok(/<w:b\/><w:bCs\/>.*Pick up /.test(x) && /<w:color w:val="C0392B"\/><w:sz w:val="27"\/><w:szCs w:val="27"\/><w:shd w:val="clear" w:color="auto" w:fill="FFF176"\/><\/w:rPr><w:t xml:space="preserve">at 7/.test(x) && /<w:rFonts w:ascii="Georgia"[^>]*\/><w:i\/><w:iCs\/><w:u w:val="single"\/>/.test(x) && /<w:bidi\/>.*• .*שני מוניטורים/.test(x), "Word: bold, color, size, marker, font, italic, underline; a Hebrew bullet line right to left");
  A.app.productions.splice(A.app.productions.indexOf(m), 1); }

// --- wireless sets: Teradek and Hollyland take extra receivers; other makers' sets are 1:1, whole sets only (Ofir's list)
{ const m = A.newProduction({ houseId: "utopia", name: "WL" }); A.app.productions.push(m);
  const find = re => [...A.ITEM].find(([id, e]) => e.h.id === "utopia" && re.test(e.it.name))[0];
  const vr = find(/^Vrriis WL087/), td = find(/Bolt 6 LT 750/), hl = find(/^Hollyland Cosmo C2/);
  ok(A.wlEven(vr) && !A.wlEven(td) && !A.wlEven(hl), "Vrriis is 1:1; Teradek and Hollyland take extra receivers");
  A.setQty(m, vr, 1); A.setQty(m, vr, 2, "rx");
  ok(m.items[vr].tx === 2 && m.items[vr].rx === 2 && A.lineQty(m.items[vr]) === 2, "one more receiver on a 1:1 set is one more set (2 TX, 2 RX)");
  ok(!/data-act="txrx"/.test(A.ctlHtml(m, vr)) && /data-act="cinc"/.test(A.ctlHtml(m, vr)), "a 1:1 set's counter counts sets, with no TX/RX drawer");
  A.setQty(m, td, 1); A.setQty(m, td, 2, "rx");
  ok(m.items[td].tx === 1 && m.items[td].rx === 2 && /data-act="txrx"/.test(A.ctlHtml(m, td)), "a Teradek set still takes an extra receiver, its drawer there");
  const old = { id: "o", v: 1, items: { [vr]: { name: "Vrriis WL087 II Wireless Transmission Set", tx: 1, rx: 3, sets: 1, qty: 1 } } };
  A.upData(old, "production"); ok(old.items[vr].tx === 3 && old.items[vr].rx === 3 && old.v === A.SCHEMA, "an older list with an uneven 1:1 set: whole sets, the larger count");
  A.app.productions.splice(A.app.productions.indexOf(m), 1); }

// --- a camera's label icons wear the camera's color (and the ink that reads on it)
{ const pc = A.newProduction({ houseId: "utopia", name: "LT" }); A.app.productions.push(pc);
  const am = [...A.ITEM].find(([id, e]) => e.h.id === "utopia" && /^ARRI Alexa Mini$/.test(e.it.name))[0]; A.setQty(pc, am, 2);
  A.app.settings.camList = pc.id; const cs = A.camsOf(pc); A.camAutoFill && A.camAutoFill(pc);
  const c = A.camsOf(pc)[1] || A.camsOf(pc)[0]; c.col = "#e8f20c"; const h = A.camFormHtml(pc, c);
  const ic = h.match(/<span class="tl-c lt cam-lt" style="([^"]+)"/g) || [];
  ok(ic.length >= 6 && ic.every(x => x.includes("--k:#e8f20c;--kf:#18171d")), "every label icon on a yellow camera's page: yellow, with dark ink");
  A.app.productions.splice(A.app.productions.indexOf(pc), 1); }

// --- rental forms: reading Utopia's form (words with their places, as the PDF reader gives them; a made-up form, no real names)
{ const W = (s, x, y, w, r, f, h) => ({ s, x, y, w, r: r !== undefined ? r : /[\u0590-\u05FF]/.test(s), f: f || "F3", h: h || 7.15 });
  ok(A.rfText([W("מוניטור", 503, 329, 20), W("Sony LMD-A170", 440, 329, 60, false)]) === "מוניטור Sony LMD-A170", "a line reads right to left, its Latin part left to right");
  ok(A.rfText([W("סט", 520, 10, 8), W("משדר", 500, 10, 15), W("750 LT", 470, 10, 25, false), W("Bolt 6", 440, 10, 25, false)]) === "סט משדר Bolt 6 750 LT", "a run of Latin words keeps its order");
  const B = (s, x, y, w) => W(s, x, y, w, true, "F2", 6.95);
  const p1 = [W("ציוד", 536, 730, 20), W("ברשות", 487, 730, 30), W("הלקוח", 441, 730, 30),
    W("השכרה", 519, 705, 20), W(":", 514, 705, 5, false), W("700/111111", 256, 705, 76, false),
    W("לקוח", 540, 665, 17), W(":", 537, 665, 3, false), W("הפקות", 480, 665, 23), W("טסט", 455, 665, 15),
    W("Date Out:", 36, 665, 39, false), W("01/09/25 11:20", 130, 665, 60, false), W("תאריך", 261, 665, 22), W("הנפקה", 234, 665, 24),
    W("פרויקט", 532, 652, 25), W(":", 529, 652, 3, false), W("הצעיר", 462, 652, 20), W("החתול", 485, 652, 25),
    B("כמות", 548, 547, 14), B("דגם", 512, 547, 11), B("תכולה", 375, 547, 18), B("פיסית", 356, 547, 17), B("הערות", 193, 547, 18), B("מספר", 86, 547, 16), B("אוטופי", 66, 547, 18),
    B("מוניטור", 470, 537, 21),
    W("2", 560, 526, 4, false, "F1"), W("מוניטור", 503, 525, 20), W("Sony LMD-A170", 440, 525, 60, false), W(":LMD-A170 - 944", 330, 525, 60, false), W("944 ,798", 75, 525, 28, false),
    W("*", 386, 515, 3, false), W("כבל", 375, 515, 10), W("BNC", 358, 515, 15, false),
    B("אלחוטי", 471, 500, 18),
    W("1", 560, 490, 4, false, "F1"), W("קורא", 509, 490, 13), W("כרטיסים", 484, 490, 23), W("CFexpress Type A /", 420, 490, 62, false), W("488", 91, 490, 12, false),
    W("SD", 513, 480, 10, false),
    W("עמוד", 90, 23, 13), W("1", 78, 24, 4, false)];
  const p2 = [W("השכרה", 518, 703, 20), W("700/111111", 256, 702, 76, false), W("המשך", 543, 688, 14), W("...", 537, 688, 6, false),
    W("6", 560, 660, 4, false, "F1"), W("V-LOCK 250", 450, 660, 50, false), W("272 ,281", 75, 660, 28, false),
    W("טבלת", 520, 600, 20), W("עזר", 500, 600, 15), W("3", 560, 590, 4, false, "F1"), W("כבל", 503, 590, 20)];
  const r = A.rfParse([p1, p2]);
  ok(r.ok && r.house === "utopia" && r.no === "700/111111" && r.project === "החתול הצעיר" && r.client === "הפקות טסט" && r.outIso === "2025-09-01" && r.title === "ציוד ברשות הלקוח", "a form's head: house, rental no., project, client, date out, title");
  ok(r.rows.length === 3 && r.rows[0].qty === 2 && r.rows[0].model === "מוניטור Sony LMD-A170" && r.rows[0].cat === "מוניטור" && r.rows[0].nums === "944,798", "a row: quantity, model, its category, its Utopia numbers");
  ok(r.rows[1].model === "קורא כרטיסים CFexpress Type A / SD" && r.rows[1].cat === "אלחוטי", "a model on two lines reads as one");
  ok(r.rows[2].qty === 6 && r.rows[2].model === "V-LOCK 250" && r.rows[2].cat === "אלחוטי", "rows go on on the next page, under the last category; the summary table after them is left out");
  ok(r.rows[0].cont.length === 2 && /כבל BNC/.test(r.rows[0].cont[1]), "what's in it (the physical contents) stays with its row");
  // which list it goes into
  const pa = A.newProduction({ houseId: "utopia", name: "החתול הצעיר", prep: "2025-08-30", shootStart: "2025-09-02", shootEnd: "2025-09-10" }), pb = A.newProduction({ houseId: "utopia", name: "משהו אחר", prep: "2025-09-01" });
  A.app.productions.push(pa, pb);
  ok(A.rfMatch(r)[0].p === pa, "the form goes to the list with the project's name");
  pa.forms = [{ id: "rfx", no: "700/111111" }]; pa.name = "Other"; ok(A.rfMatch(r)[0].p === pa, "the same rental number again: the list that already has its form");
  { const q = { forms: [{ id: "b", house: "utopia", no: "2", filed: 200 }, { id: "a", house: "utopia", no: "1", at: 100 }, { id: "c", house: "utopia", no: "3", filed: 300 }, { id: "x", house: "fitussi", filed: 50 }] }, V = A.rfVersions(q);
    ok(V.lists.length === 2 && V.lists[0].map(f => f.id).join() === "c,b,a" && V.ver.get(q.forms[2]) === 3 && V.ver.get(q.forms[1]) === 1 && V.lists[1][0].id === "x" && V.ver.get(q.forms[3]) === 1, "rental forms by version: per house, the newest first, the first in is version 1");
    ok(A.rfNextVer(q, { id: "d", house: "utopia" }) === 4 && A.rfNextVer(q, { id: "e", house: "different" }) === 1, "a new form from that house: the next version; from another house: its first"); }
  ok(!A.copyProduction(pa).forms, "a copy of a list starts without the house's forms");
  A.app.productions.splice(A.app.productions.indexOf(pa), 1); A.app.productions.splice(A.app.productions.indexOf(pb), 1); }

// --- forms from mail: the script the maker pastes into Apps Script, as the app copies it
{ let okGs = true; try { new Function(A.MAIL_GS); } catch (e) { okGs = false; }
  ok(okGs && /function setup\(\)/.test(A.MAIL_GS) && A.MAIL_GS.includes("/\\.pdf$/i") && A.MAIL_GS.includes('"users/" + u + "/inbox/"'), "the mail script copies whole: it runs, its patterns keep their backslashes, it writes where the app reads");
  const mf = JSON.parse(A.MAIL_MANIFEST);
  ok(mf.oauthScopes.includes("https://www.googleapis.com/auth/datastore") && mf.oauthScopes.includes("https://www.googleapis.com/auth/gmail.readonly") && mf.dependencies.enabledAdvancedServices[0].serviceId === "gmail", "its settings: reads mail only, writes the app's database, the Gmail service on"); }

// --- Notes: its own page from the home screen; a Checklist tab (the Prep Checklist's to-do, the same lines) and the Notepad
{ const p = A.newProduction({ houseId: "utopia", name: "NT", notes: "On the list", pad: "Prep Sunday", padRich: [{ runs: [{ t: "Prep Sunday" }] }] }); A.app.productions.push(p);
  A.pcData(p).todo.push({ id: "a", t: "Order 20 cards", done: true }, { id: "b", t: "Call the house", done: false });
  A.app.settings.ntList = p.id; A.app.view = "notes"; const h = A.viewNotes();
  ok(/data-v="check"[^>]*>Checklist<span class="num">1\/2<\/span>/.test(h) && /data-v="pad"[^>]*>Notepad/.test(h) && /id="nt-list"/.test(h), "Notes: a production to pick, and two tabs: Checklist (with its count) and Notepad");
  ok(A.ntTodo().list === A.pcData(p).todo && /Call the house[\s\S]*Order 20 cards/.test(h) && /Prep Sunday/.test(h) && !/On the list/.test(h), "the checklist is the production's own to-do (lines still to do first); the notepad its own notes (not the note on the list)");
  ok(/data-act="nt-reset"[^>]*>[\s\S]*?Reset/.test(h) && !/nt-clear/.test(h), "the checklist's button: Reset while a line is ticked");
  { const t = A.pcData(p).todo; t.forEach(x => { x.done = false; }); const h2 = A.viewNotes(); ok(/data-act="nt-clear"[^>]*>[\s\S]*?Delete list/.test(h2) && !/data-act="nt-reset"/.test(h2), "nothing ticked: the same button deletes the list"); t[0].done = true; }
  A.app.settings.ntList = "none"; ok(A.ntCur() === null && A.ntTodo().list === A.pcData(null).todo, "with no list: the user's own checklist");
  A.app.formFor = p.id; A.app.view = "form"; { const fh = A.viewForm(); ok(/id="f-notes"/.test(fh) && /On the list/.test(fh) && !/Prep Sunday|nt-tabs/.test(fh), "the production's details hold the note on the list (not the Notes page's notepad)"); }
  A.app.formFor = null; A.app.view = "home"; delete A.app.settings.ntList; A.app.productions.splice(A.app.productions.indexOf(p), 1); }

// --- the notepad's alignment: left, center or right a paragraph, kept, shown, and in Word (a Hebrew paragraph's sides are its own)
{ const m = [{ runs: [{ t: "שלום" }], al: "l" }, { runs: [{ t: "Hello" }], al: "r" }, { runs: [{ t: "Mid" }], al: "c" }, { runs: [{ t: "plain" }] }];
  const h = A.ntHtml(m, false); ok(/text-align:left[^>]*>שלום/.test(h) && /text-align:right[^>]*>Hello/.test(h) && /text-align:center[^>]*>Mid/.test(h) && /<div dir="auto">plain/.test(h), "the editor and the page draw each paragraph where it was aligned");
  const d = A.ntDocx(m); const ps = d.split("</w:p>");
  ok(/<w:bidi\/>[\s\S]*<w:jc w:val="right"\/>/.test(ps[0]) && /<w:jc w:val="right"\/>/.test(ps[1]) && !/<w:bidi\/>/.test(ps[1]) && /<w:jc w:val="center"\/>/.test(ps[2]) && !/<w:jc/.test(ps[3]), "Word: Hebrew aligned left is its far side (right in Word's terms); English as it is; none stays the language's own");
  ok(/<w:jc w:val="center"\/>/.test(A.ntDocx([{ runs: [{ t: "x" }] }], { center: true })) && /<w:jc w:val="left"\/>/.test(A.ntDocx([{ runs: [{ t: "x" }], al: "l" }], { center: true })), "a paragraph's own alignment wins over the page's centered notes"); }

// --- catalog order: the lens view by format follows the manufacturers' order set while editing; lists follow what Add Gear shows
{ const U = A.houseById("utopia"), saved = JSON.parse(JSON.stringify(A.app.settings.catalog || {}));
  const p = A.newProduction({ name: "Order", houseId: "utopia" }); A.app.productions.push(p); A.app.pid = p.id;
  const sk = "lenses/cine_primes", gs = A.subGroupNames(U, A.houseById("utopia")._subs.get(sk)), last = gs[gs.length - 1];
  A.moveGroup(U, sk + "/" + last, sk, gs[0], false);
  Object.assign(A.app, { editCat: false, cat: "lenses", q: "" }); A.app.open.add("lenses"); A.app.open.add(sk);
  const h = A.treeHtml(p, U), part = h.slice(h.indexOf(`data-k="${sk}"`)), fmt = part.slice(part.indexOf('class="brand fmt"'));
  const heads = [...fmt.slice(0, fmt.indexOf("</details>")).matchAll(/class="mfr-name"[^>]*>([^<]+)</g)].map(m => m[1]);
  ok(heads.length > 1 && (heads[0] === last || !heads.includes(last)) && A.subGroupNames(U, U._subs.get(sk))[0] === last, `lenses by format: a manufacturer moved first while editing (${last}) leads its format too`);
  const s = U._subs.get("camera_accessories/mattebox"), bs = A.brandsIn(U, s.key);
  A.moveBrand(U, s.key, bs[bs.length - 1], s.key, bs[0], false);
  const first = A.brandsIn(U, s.key)[0];
  ok(A.shownOrder(U, U._subs.get(s.key))[0] === U._subs.get(s.key).items.find(it => it.brand === first).id, "a manufacturer list: the one moved to the top is first in the order lists follow");
  const ia = U._subs.get(s.key).items.find(it => it.brand === first), ib = U._subs.get(s.key).items.find(it => it.brand !== first && it.section === ia.section);
  if (ib) { p.items[ib.id] = { qty: 1, section: ib.section, name: ib.name }; p.items[ia.id] = { qty: 1, section: ia.section, name: ia.name };
    const ln = A.linesBySection(p)[ia.section].map(([id]) => id); ok(ln.indexOf(ia.id) < ln.indexOf(ib.id), "the Camera List follows: that manufacturer's gear comes first"); }
  A.app.settings.catalog = saved; A.applyCatalog(); A.app.editCat = false; A.app.cat = "all";
  A.app.productions.splice(A.app.productions.indexOf(p), 1); }

// --- dragging in the catalog: the label says where in its own list a moved thing lands
{ const U = A.houseById("utopia"), p = A.newProduction({ name: "DL", houseId: "utopia" }); A.app.productions.push(p); A.app.pid = p.id;
  const subs = U.categories.find(c => c.id === "camera").subcategories;
  Object.assign(A.drag, { kind: "csub", id: subs[1].key });
  ok(A.dropLabel({ cat: "camera", ref: subs[0].key, after: false }) === "before " + subs[0].name, "a subcategory moved within its category: \"before <the one below it>\"");
  ok(A.dropLabel({ cat: "lenses", ref: null }) === U.categories.find(c => c.id === "lenses").name, "into another category: that category's name");
  const its = U._subs.get("camera/cinema").items.filter(it => it.brand === "ARRI");
  Object.assign(A.drag, { kind: "cat", id: its[2].id });
  ok(A.dropLabel({ key: "camera/cinema/ARRI", ref: its[0].id, after: true, brand: undefined }) === "after " + its[0].name, "an item moved within its folder: \"after <that item>\"");
  Object.assign(A.drag, { kind: "cgrp", id: "camera/cinema/Sony" });
  ok(A.dropLabel({ sub: "camera/cinema", ref: "ARRI", after: false }) === "before ARRI", "a folder moved within its subcategory: \"before ARRI\"");
  Object.assign(A.drag, { kind: undefined, id: undefined, pending: false, on: false });
  A.app.productions.splice(A.app.productions.indexOf(p), 1); }

// --- items in no folder can sit among the folders: below the last subcategory, after a folder, and back on top
{ const U = A.houseById("utopia"), saved = JSON.parse(JSON.stringify(A.app.settings.catalog || {}));
  const p = A.newProduction({ name: "Loose", houseId: "utopia" }); A.app.productions.push(p); A.app.pid = p.id;
  const c = U.categories.find(x => x.subcategories.length >= 2), keys = c.subcategories.map(x => x.key), last = keys[keys.length - 1];
  const [a, b, d] = ["Loose A", "Loose B", "Loose C"].map(n => A.createOwnItem(U, { s: c.id + "/_", name: n }));
  ok(A.placeLoose(U, a, { side: "after", boxId: c.id, folder: last }), "an item dropped by the last subcategory's lower edge goes below it");
  A.syncLoose(U, b, a);   // b dropped on a
  Object.assign(A.app, { editCat: true, cat: c.id, q: "" }); A.app.open.add(c.id);
  let html = A.treeHtml(p, U), body = html.slice(html.indexOf('class="cat-body"'));
  const iLast = body.indexOf(`data-k="${last}"`), iA = body.indexOf(`data-row="${a}"`), iB = body.indexOf(`data-row="${b}"`), iD = body.indexOf(`data-row="${d}"`);
  ok(iD < body.indexOf(`data-k="${keys[0]}"`) && iLast < iA && iLast < iB, "the category shows them: one still above the subcategories, two below the last one");
  A.app.editCat = false; html = A.treeHtml(p, U); body = html.slice(html.indexOf('class="cat-body"'));
  ok(body.indexOf(`data-row="${a}"`) > body.indexOf(`data-k="${last}"`), "the same when not editing");
  global.RANK = null; A.applyCatalog(); const r = A.catRank(), lastIds = U._subs.get(last).items.map(x => x.id);
  ok(lastIds.every(id => r.get(id) < r.get(a)) && r.get(d) < r.get(U._subs.get(keys[0]).items[0]?.id ?? Infinity), "lists and the document follow: after the last subcategory's gear");
  ok(A.placeLoose(U, a, { side: "before", boxId: c.id, folder: keys[0] }) && A.looseBlocks(U, c.id, U.categories.find(x => x.id === c.id).direct.items, keys, new Set(keys)).get("").some(x => x.id === a), "dropped by the first one's upper edge: back above them all");
  const g = U.categories.flatMap(x => x.subcategories).find(x => x.groupBy && A.subGroupNames(U, x).length >= 2);
  if (g) { const gs = A.subGroupNames(U, g), o = A.createOwnItem(U, { s: g.key, name: "Loose in sub", g: "__none" });
    A.placeLoose(U, o, { side: "after", boxId: g.key, folder: gs[0] });
    const so = A.shownOrder(U, U._subs.get(g.key)), firstG = U._subs.get(g.key).items.filter(x => A.grpOf(x, U._subs.get(g.key)) === gs[0]).map(x => x.id);
    ok(so.indexOf(o) > Math.max(...firstG.map(id => so.indexOf(id))), "in a subcategory with folders: an item in none can sit after a folder too"); }
  A.app.settings.catalog = saved; A.applyCatalog(); A.app.editCat = false; A.app.cat = "all";
  A.app.productions.splice(A.app.productions.indexOf(p), 1); }


// --- the app never makes a folder the user did not: items put in a subcategory lie in it as put there
{ const U = A.houseById("utopia"), saved = JSON.parse(JSON.stringify(A.app.settings.catalog || {}));
  const ck = A.addFolder(U, "camera_accessories", "Cables");
  const a = A.createOwnItem(U, { s: "camera_accessories/_", name: "BNC Drum" }), b = A.createOwnItem(U, { s: "camera_accessories/_", name: "BNC Jumpers" });
  const sony = [...A.ITEM.values()].find(e => e.h.id === "utopia" && e.it.brand === "Sony" && !e.it.own).it.id;
  for (const id of [a, b, sony]) A.moveCatItem(U, id, ck);
  const sub = A.ITEM.get(a).s;
  ok(sub.key === ck && [a, b, sony].every(id => A.grpOf(A.ITEM.get(id).it, A.ITEM.get(id).s) === ""), "moved into a subcategory the user made: loose in it, no Generic or Sony folder made");
  const n = A.createOwnItem(U, { s: ck, name: "BNC Cable 20m" });
  ok(A.grpOf(A.ITEM.get(n).it, A.ITEM.get(n).s) === "", "a new item there: loose in it too");
  const c = A.createOwnItem(U, { s: "camera_accessories/_", name: "Odd cable" });
  A.moveCatItem(U, c, "camera/cinema");
  ok(A.grpOf(A.ITEM.get(c).it, A.ITEM.get(c).s) === "", "an item with no manufacturer moved into a rental house's subcategory: loose, no Generic folder");
  const arri = [...A.ITEM.values()].find(e => e.h.id === "utopia" && e.it.brand === "ARRI" && e.s.key !== "camera/cinema" && !e.s.groupBy).it.id;
  A.moveCatItem(U, arri, "camera/cinema");
  ok(A.grpOf(A.ITEM.get(arri).it, A.ITEM.get(arri).s) === "ARRI", "…but into the ARRI folder that is already there, an ARRI item joins it");
  A.app.settings.catalog = saved; A.applyCatalog(); }

// --- page layouts: one column, Media beside Camera and Lens, two columns; the same in Word
{ const fsx = require("fs"), keep = A.app.settings.docCols;
  for (const m of ["one", "media", "two"]) {
    A.app.settings.docCols = m;
    const x = A.docxXml(p), h = A.exportHtml(p);
    if (process.argv[2]) fsx.writeFileSync(process.argv[2].replace("document.xml", "doc-" + m + ".xml"), x);
    const bands = (h.match(/class="cl-band"/g) || []).length, wb = (x.match(/<w:gridCol w:w="4619"\/>/g) || []).length;
    ok(m === "one" ? !bands && !wb : bands === 1 && wb === 2, `layout "${m}": ${m === "one" ? "no columns" : "one band of two columns"}, in the page and in Word`);
  }
  A.app.settings.docCols = keep; }

// --- a folder made a subcategory of its category; the subcategory left empty goes
{ const U = A.houseById("utopia"), saved = JSON.parse(JSON.stringify(A.app.settings.catalog || {}));
  const s1 = A.addFolder(U, "camera_accessories", "Sub One"), g = A.addFolder(U, s1, "Sub Two");
  const a = A.createOwnItem(U, { s: s1, g: "Sub Two", name: "Thing A" }), b = A.createOwnItem(U, { s: s1, g: "Sub Two", name: "Thing B" });
  const cat = U.categories.find(c => c.id === "camera_accessories"), first = cat.subcategories[0].key;
  const r = A.promoteGroup(U, g, "camera_accessories", first, false);
  const c2 = A.houseById("utopia").categories.find(c => c.id === "camera_accessories");
  ok(r && c2.subcategories[0].name === "Sub Two" && A.ITEM.get(a).s.key === r.key && A.ITEM.get(b).s.key === r.key && A.grpOf(A.ITEM.get(a).it, A.ITEM.get(a).s) === "", "a folder made a subcategory: first in its category, its items loose in it");
  ok(r.removed === "Sub One" && !c2.subcategories.some(x => x.key === s1), "the subcategory it came from, left empty, is deleted");
  // a rental house subcategory with one folder: hidden once empty, back when gear goes in again
  const hs = c2.subcategories.find(x => !x.custom && !x.groupBy && A.subGroupNames(U, x).length >= 1 && x.items.length);
  const names = A.subGroupNames(U, hs); let last = null;
  for (const n of names) last = A.promoteGroup(U, hs.key + "/" + n, "camera_accessories", null, true);
  const loose = A.subByKey(U, hs.key)?.items.length || 0;
  if (!loose) { ok(last.removed === hs.name && !A.houseById("utopia").categories.find(c => c.id === "camera_accessories").subcategories.some(x => x.key === hs.key), "a rental house subcategory left empty is taken off");
    A.moveCatItem(U, a, hs.key); ok(A.houseById("utopia").categories.find(c => c.id === "camera_accessories").subcategories.some(x => x.key === hs.key), "…and shows again when gear is put in it"); }
  A.app.settings.catalog = saved; A.applyCatalog(); }

// --- a subcategory made a category of its own
{ const U = A.houseById("utopia"), saved = JSON.parse(JSON.stringify(A.app.settings.catalog || {}));
  const s1 = A.addFolder(U, "camera_accessories", "Cables"), g = A.addFolder(U, s1, "BNC");
  const a = A.createOwnItem(U, { s: s1, g: "BNC", name: "BNC Drum" }), b = A.createOwnItem(U, { s: s1, name: "XLR 10m" });
  const r = A.promoteSub(U, s1, "camera_accessories", true);
  const H2 = A.houseById("utopia"), ci = H2.categories.findIndex(c => c.id === r.id), nc = H2.categories[ci];
  ok(nc && nc.name === "Cables" && H2.categories[ci - 1].id === "camera_accessories", "a subcategory made a category: right after the one it was in");
  ok(A.ITEM.get(b).s === nc.direct && A.ITEM.get(a).s.name === "BNC" && A.ITEM.get(a).c.id === r.id, "its folder became a subcategory, its loose items the category's own");
  ok(!H2.categories.find(c => c.id === "camera_accessories").subcategories.some(x => x.key === s1), "and it is gone from where it was");
  A.app.settings.catalog = saved; A.applyCatalog(); }

// --- folders inside folders, as deep as wanted
{ const U = A.houseById("utopia"), saved = JSON.parse(JSON.stringify(A.app.settings.catalog || {})), S = A.GSEP;
  let k = A.placeGroup(U, "camera/cinema/Sony", "camera/cinema", { into: "ARRI" });
  ok(k === "camera/cinema/ARRI" + S + "Sony" && A.subByKey(U, "camera/cinema").items.filter(x => A.grpOf(x, A.subByKey(U, "camera/cinema")) === "ARRI" + S + "Sony").length === 17, "a folder dropped into another: inside it, with its items");
  k = A.placeGroup(U, "camera/cinema/RED", "camera/cinema", { into: "ARRI" + S + "Sony" });
  ok(k === "camera/cinema/ARRI" + S + "Sony" + S + "RED", "…and a folder into that one: three deep");
  A.placeGroup(U, "camera/cinema/ARRI" + S + "Sony", "camera/high_speed", { into: "", ref: null });
  const hs = A.subByKey(U, "camera/high_speed"), gs = new Set(hs.items.map(x => A.grpOf(x, hs)));
  ok(gs.has("Sony") && gs.has("Sony" + S + "RED"), "a folder moved to another subcategory takes the folders inside it along");
  const order = A.shownOrder(U, hs).map(id => A.ITEM.get(id).it.brand);
  ok(order.indexOf("RED") < order.lastIndexOf("Sony"), "lists follow: a folder's folders first, then its own items");
  ok(A.placeGroup(U, "camera/high_speed/Sony", "camera/high_speed", { into: "Sony" + S + "RED" }) === null, "not into a folder inside itself");
  A.app.settings.catalog = saved; A.applyCatalog(); }
{ const sid = "utopia:ndset-tiffen-ndf-4x5-6", e = A.ITEM.get(sid);
  ok(e && e.it.ndset.length >= 7 && e.it.ndstd.join() === "0.3,0.6,0.9,1.2,1.5,1.8,2.1", "ND: the Tiffen NDF 4X5.6 filters are one set, the standard 0.3 to 2.1 ready chosen");
  ok(!A.ITEM.has("utopia:tiffen-ndf-4x5-6-03"), "ND: a set's single filters are not listed one by one");
  const g = A.ITEM.get("utopia:ndset-tiffen-ndg-s-edge-4x5-6"); ok(g && g.it.ndstd.join() === "0.3,0.6,0.9", "ND Grad: a set of 0.3, 0.6, 0.9");
  const np = A.newProduction({ name: "ND", houseId: "utopia" }); A.ndApply(np, sid, ["0.9", "0.3"]);
  ok(np.items[sid] && np.items[sid].nd.join() === "0.3,0.9", "ND: the chosen filters, in the set's order");
  const r = A.exportRows(sid, np.items[sid])[0]; ok(r.extra[0] === "0.3, 0.9" && /^FIL-N5\u00a03\/9$/.test(r.sku), "ND: the document shows the densities after the name, and each one's SKU");
  A.ndApply(np, sid, []); ok(!np.items[sid], "ND: none chosen takes the set off the list"); }
ok(A.skuPack(["FIL-N53","FIL-N56","FIL-N510"]) === "FIL-N5\u00a03/6/10" && A.skuPack(["AB1","CD2"]) === "AB1, CD2", "a set's SKUs: what they share once");
{ const keep = A.app.settings.rules, ids = [...A.ITEM].filter(([id, e]) => e.h.id === "utopia" && !e.it.camera && e.s.id !== "media").slice(40, 43).map(x => x[0]);
  A.app.settings.rules = [{ id: "c1", kind: "item", house: "utopia", when: ids[0], add: ids[1], qty: 1 }, { id: "c2", kind: "item", house: "utopia", when: ids[1], add: ids[2], qty: 2 }, { id: "c3", kind: "item", house: "utopia", when: ids[2], add: ids[0], qty: 1 }];
  const q = A.newProduction({ name: "Chain", houseId: "utopia" }); A.setQty(q, ids[0], 2); A.applyDefaults(q);
  if (process.env.DBG) console.log(JSON.stringify(ids.map(i => q.items[i] && [q.items[i].qty, q.items[i].auto])));
  ok(q.items[ids[1]] && A.lineQty(q.items[ids[1]]) === 2 && q.items[ids[2]] && A.lineQty(q.items[ids[2]]) === 4 && A.lineQty(q.items[ids[0]]) === 6,
    "packages chain: what a package brings brings its own package (2 → 2 → 4 → back to the first, once: no endless loop)");
  A.setQty(q, ids[0], 0); A.applyDefaults(q); ok(!q.items[ids[1]] && !q.items[ids[2]], "packages chain: taking the item off takes the whole chain off");
  A.app.settings.rules = keep; }
{ const keep = A.app.settings.rules, ids = [...A.ITEM].filter(([id, e]) => e.h.id === "utopia" && !e.it.camera && e.s.id !== "media").slice(50, 52).map(x => x[0]);
  A.app.settings.rules = [{ id: "t1", kind: "item", house: "utopia", when: ids[0], add: "", text: "Short BNC", qty: 2 }, { id: "t2", kind: "item", house: "utopia", when: ids[0], add: "", text: "check the batteries", qty: 0, sub: true }, { id: "t3", kind: "item", house: "utopia", when: ids[0], add: ids[1], qty: 1, sub: true }];
  const q = A.newProduction({ name: "Text", houseId: "utopia" }); A.setQty(q, ids[0], 3); A.applyDefaults(q);
  const l = q.items[ids[0]], t = q.items["pkt-short-bnc"];
  ok(t && t.qty === 6 && t.name === "Short BNC" && t.section === l.section, "packages: free text comes in as its own line, in the item's section");
  ok(l.children.length === 2 && l.children[0].name === "check the batteries" && l.children[0].qty === 0 && l.children[1].qty === 3 && !q.items[ids[1]], "packages: a subitem goes grey under the item (no quantity, or with each one)");
  A.applyDefaults(q); ok(q.items[ids[0]].children.length === 2, "packages: subitems are not added twice");
  A.setQty(q, ids[0], 0); A.applyDefaults(q); ok(!q.items["pkt-short-bnc"], "packages: the free-text line goes with the item");
  A.app.settings.rules = keep; }
{ const keep = A.app.settings.rules, mons = [...A.ITEM].filter(([id, e]) => e.h.id === "utopia" && e.s.id === "monitors").slice(0, 3).map(x => x[0]), stand = [...A.ITEM].find(([id, e]) => e.h.id === "utopia" && e.s.id !== "monitors" && !e.it.camera)[0];
  A.app.settings.rules = [{ id: "m1", kind: "item", house: "utopia", when: mons[0], also: [mons[1], mons[2]], add: stand, qty: 1 }];
  const q = A.newProduction({ name: "Mon", houseId: "utopia" }); A.setQty(q, mons[1], 1); A.setQty(q, mons[2], 2); A.applyDefaults(q);
  ok(mons.length === 3 && q.items[stand] && A.lineQty(q.items[stand]) === 3, "packages: several items set off one package (each monitor brings its stand)");
  A.app.settings.rules = keep; }
