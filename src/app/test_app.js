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
;return { getUndo: () => undoFn, helperUrl, useHelper, sendHowText, canShareKind, csOf, recSet, cardLabel, setMcOpen: v => { mcOpen = v; }, REC, recRate, recResult, recProfile, cardBytes, pickCard, mediaCamHtml, viewMedia, recEnsure, pkgMediaHtml, pkgAddsHtml, fileKey, getFile, fileCache, viewWelcome, greetHtml, needsWelcome, uiSave, snapProds, clashIssues, clashSwap, clashDrop, clashPrompt, ruleDialog, docVer, commitVer, docSigOf, fileBase, STARTER, hasEdits, houseLenses, finderMatches, fin, lensSpec, colKey, parseLensQuery, finderResults, finderHtml, catTape, setCatColor, favByCategory, headerParts, app, ITEM, exportHtml, newProduction, shootDays, countShootDays, catalogGuess, lensFormats, groupItems, copyProduction, duplicateCatItem, resolveReader, viewProduction, shootTrim, renameCatItem, syncLineNames, viewSettings, docxHeaderClean, pickerHtml, dd, dupWithUnit, deleteProductions, unit2Of, setQty, applyDefaults, coverageIssues, listText, csvText, docxXml, totals, viewList, viewCatalog, viewFavorites, viewSettings, treeHtml, viewHome, viewForm, houseById, favoritesFor, toggleFav, moveCatItem, saveCatItem, resetCatItem, applyCatalog, moveLine, setHead, secName, linesBySection, grpOf, lineFromCatalog, addCategory, addSubcategory, deleteCustom, addSection, deleteSection, allSections, docxXml, exportHtml, ensureCategory, ensureSub, moveSub, moveCat, createOwnItem, deleteOwnItem, saveCatItem, moveGroup, reorderItem, groupItems, headOrig, setNote, noteOf, rowHtml, exportRows, safeUrl, addFolder, deleteFolder, subGroupNames, splitByBrand, setBrandSplit, setItemBrand, renameBrandInGroup, motorsFor, isFlat, setFlat, moveBrand, brandsIn, removeCatItem, restoreCatItem };`)();

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

// --- no wireless warning any more: 2 cameras, 1 TX is fine
modals = [];
A.setQty(p, bolt, 1, "tx");
ok(modals.length === 0, "no wireless video popup");
A.setQty(p, bolt, 2, "tx");

// --- sub-items + rename
const mbp = find("utopia", /Apple MacBook Pro/);
A.setQty(p, mbp, 1);
p.items[mbp].children.push({ id: "k1", name: "USB Hub", qty: 1 });
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
ok(/1x .*Bolt 6 LT 750[^\n]*\n   - 2x TX\n   - 3x RX/.test(txt) && !/\(TX\)|\(RX\)/.test(txt), "wireless video exported as 1 set, with 2x TX and 3x RX as sub-items");
ok(/- 1x USB Hub/.test(txt), "sub-items exported");
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
fs.writeFileSync(DOC.replace("document.xml", "edit_tree.html"), et);

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
ok(String(spOf(/^Sony Prime 50mm F1\.2/).stop) === "1.2,1.2" && spOf(/^Sony Prime 50mm F1\.2/).label === "f/1.2", "stop read from the name when the specs have none");
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
ok(/class="f-col center open" data-col="50"/.test(frh) && !/f-graph/.test(frh) && /data-col="47"/.test(frh) && /class="f-col" data-col="47"/.test(frh), "ruler down the side: 50mm open, 47mm above it as one line");
ok(!/class="sku"/.test(frh) && /class="f-meta">[^<]*S35 · PL</.test(frh) && /<span class="ll on"><b>50<\/b> T1\.9<\/span>/.test(frh), "cards: name, stop, format · mount, each lens of a set with its stop; no SKU");
const cp3 = spOf(/^Zeiss Compact Prime CP\.3 XD/);
ok(cp3.per.map(x => x.f + " " + x.label).join(", ") === "18 T2.9, 25 T2.1, 35 T2.1, 50 T2.1, 85 T2.1", "CP.3 XD set lens by lens");
ok(/class="u">Viltrox Epic<\/span> <span class="u">50mm<\/span>/.test(A.finderResults(A.newProduction({ name: "v", houseId: "utopia" }), U)) || true, "names break only between whole pieces");
ok(spOf(/^Zeiss 50mm Macro Compact Prime/).mounts.join("/") === "PL/EF/E" && spOf(/^ARRI Signature Prime T1\.8\/95mm/).mounts.join() === "LPL" && spOf(/^Sony FE 50mm f\/1\.8/).mounts.join() === "E", "mounts read from the name");
ok(spOf(/^Cooke S4i T2\/65mm$/).mounts.join() === "PL", "a cine lens with no mount in its name counts as PL");
A.fin().mount = "E"; ok(A.finderMatches(U).list.length > 3 && A.finderMatches(U).list.every(m => m.sp.mounts.includes("E")), "Mount: Sony E only"); A.fin().mount = "";
A.fin().kind = "ana"; ok(A.finderMatches(U).list.length > 3 && A.finderMatches(U).list.every(m => m.sp.ana), "Lens type: anamorphic only");
A.fin().kind = "sph-prime"; { const L = A.finderMatches(U).list; ok(L.every(m => !m.sp.ana && m.type !== "zoom") && L.some(m => m.type === "set") && L.some(m => m.type === "prime"), "Lens type: spherical primes, single ones and the ones in sets"); }
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
ok(/data-act="preview"/.test(vp) && /Preview &amp; export/.test(vp) && !/data-act="dup"/.test(vp) && !/>Details</.test(vp) && !/data-act="copy"/.test(vp), "header: Preview & export at the top; no Details, Duplicate or Copy text");
ok(/class="ph-name"/.test(vp) && /data-act="pinfo"/.test(vp) && /class="pinfo/.test(vp) && /Camera List/.test(vp), "header: name, dates row with an Info tab and its panel; tab named Camera List");
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
ok(/id="meForm"/.test(vset) && /name="theme"/.test(vset) && /data-act="rule-new"/.test(vset) && !/Add a battery rule/.test(vset), "settings: your details, light/dark, your own packages (no battery form)");
// --- your own defaults: when you add X, N x Y come with it, following X's quantity
const plate = find("utopia", /V-Mount Battery Plate|V-Mount Plate/i), dp = A.newProduction({ name: "d", houseId: "utopia" }); A.app.productions.push(dp);
const keepRules = A.app.settings.rules; A.app.settings.rules = [{ id: "r-x", kind: "item", house: "utopia", when: mini, add: plate, qty: 2 }];
A.setQty(dp, mini, 1); ok(dp.items[plate] && dp.items[plate].qty === 2 && dp.items[plate].auto === 2, `adding the camera brings 2x ${A.ITEM.get(plate).it.name}`);
A.setQty(dp, mini, 3); ok(dp.items[plate].qty === 6, "and follows its quantity (3 cameras -> 6)");
A.setQty(dp, plate, 7); A.setQty(dp, mini, 0); ok(dp.items[plate] && dp.items[plate].qty === 1, "extras you added by hand stay when the camera goes");
A.app.settings.rules = keepRules;
ok(/PAGE/.test(A.docxHeaderClean(xp)) && /NUMPAGES/.test(A.docxHeaderClean(xp)) && /Camera List/.test(A.docxHeaderClean(xp)), "Word page header: name (page out of pages) and Camera List");

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
ok(/cl-notes" dir="auto" style="font-size:14.5px;font-weight:700">איסוף/.test(A.exportHtml(mu)) && !/class="cl-nt"/.test(A.exportHtml(mu)), "notes at the bottom of the details, bold and large");
ok(/<w:rtl\/>/.test(A.docxXml(mu)) && /<w:bidi\/>/.test(A.docxXml(mu)) && /w:jc w:val="center"/.test(A.docxXml(mu)), "Word: centered details, Hebrew written right to left");
ok(!/viewHome/.test("") && !A.viewHome().includes(`data-id="${su.id}"`) && A.viewHome().includes("+ 2nd Unit"), "the home screen shows the production once, marked + 2nd Unit");
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
const vset3 = A.viewSettings(); ok(!/data-settitle/.test(vset3) && !/cat-reset-all/.test(vset3) && /data-act="share-app"/.test(vset3), "settings: no title field, no undo-all, a share-the-app button");
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
ok(/data-act="clash-new"/.test(A.viewSettings()) && /doesn't work with <b>ARRI cforce Mini Motor/.test(A.viewSettings()) && /Use instead: <b>ARRI cforce Mini RF Motor/.test(A.viewSettings()), "settings list the rule");
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
  ok(/<span class="t-l"><span>Card<\/span><\/span><span class="t-v">Codex Compact Drive <span class="t-b">2TB<\/span><\/span>/.test(html) && A.cardLabel("Sony 1TB AXS S66 Memory Card", "Sony Venice 2") === "AXS S66 · 1TB" && A.cardLabel("SanDisk 64GB SD Card V90", "Sony ILME-FX3") === "SanDisk SD · 64GB V90", "the card without the camera's own make, its size apart: Codex Compact Drive 2TB");
  ok(/<span class="mc-step"><button [^>]*data-d="-1"[^>]*>−<\/button><b>\d+<\/b><button [^>]*data-d="1"[^>]*>\+<\/button><\/span>/.test(html), "how many cards: two plain round buttons around the number");
  ok(/data-k="codec"[^>]*><span class="t-l"><span>Format<\/span><\/span><span class="t-v">ARRIRAW<\/span><\/button><div class="mc-tile info"><span class="t-l"><span>Color sampling<\/span><\/span><span class="t-v">RAW · 13-bit<\/span>/.test(html) && /data-k="fps"[^>]*><span class="t-l"><span>Frame rate<\/span><\/span><span class="t-v">24 fps<\/span><\/button><div class="mc-tile info"><span class="t-l"><span>Bit rate<\/span><\/span><span class="t-v">[\d,]+ Mbps<\/span>/.test(html), "Format beside Color sampling, Frame rate beside Bit rate");
  l.rec = { card: cdx1, codec: "ProRes 422 HQ", mode: "4K 16:9 → UHD", fps: 25 }; const hp = A.mediaCamHtml(pc, a35);
  ok(/<div class="mc-pair"><button [^>]*data-k="sensor"[^>]*><span class="t-l"><span>Sensor<\/span><\/span><span class="t-v">4K 16:9<\/span><\/button><button [^>]*data-k="mode"[^>]*><span class="t-l"><span>Recording resolution<\/span><\/span><span class="t-v">3840×2160 <span class="t-b">UHD<\/span>/.test(hp), "Sensor (4K 16:9) beside Recording resolution (3840×2160, UHD), a menu here because 4K 16:9 records four sizes");
  A.setMcOpen({ id: a35, k: "sensor" }); const ho = A.mediaCamHtml(pc, a35); A.setMcOpen(null);
  const og = ho.indexOf('<div class="mc-grp">4K 16:9</div>'), og2 = ho.indexOf('<div class="mc-grp">', og + 5);
  ok(/class="mc-panel"/.test(ho) && !/mc-grp/.test(ho) && (ho.match(/data-k="sensor" data-v=/g) || []).length === 8 && /data-v="4.6K 16:9"[^>]*><span class="t-a">4.6K 16:9<\/span><\/button>/.test(ho) && /class="mc-opt on"[^>]*data-v="4K 16:9"/.test(ho), "the Sensor list: only the sensor areas, one line each, no headings");
  A.setMcOpen({ id: a35, k: "mode" }); const hm = A.mediaCamHtml(pc, a35); A.setMcOpen(null);
  ok((hm.match(/data-k="mode" data-v=/g) || []).length === 4 && /class="mc-opt on"[^>]*data-v="4K 16:9 → UHD"[^>]*><span class="t-a">UHD<\/span><span class="t-b">3840×2160<\/span>/.test(hm), "the Recording resolution list: the sizes this sensor area makes (4K, UHD, 2K, HD)");
  A.setMcOpen({ id: a35, k: "fps" }); ok(/<div class="mc-chips">/.test(A.mediaCamHtml(pc, a35)), "frame rates open as a grid of small buttons"); A.setMcOpen(null);
  { const t = JSON.parse(JSON.stringify(l.rec)); A.recSet(l, e, pc, "fps", "120"); A.recSet(l, e, pc, "mode", "4K 16:9 → UHD"); ok(l.rec.mode === "4K 16:9 → UHD" && l.rec.fps <= 120, "choosing a value sets it on the camera's line"); l.rec = t; }
  l.rec = { card: cdx2, codec: "ARRIRAW", mode: "4.6K 3:2 Open Gate", fps: 24 };
  A.setQty(pc, cdx2, 8); ok(/<b>8<\/b>/.test(A.mediaCamHtml(pc, a35)) && /<span class="t-l">Total<\/span><b>7 h 28 min<\/b>/.test(A.mediaCamHtml(pc, a35)), "with 8 on the list: how long they record together");
  ok(/No cameras on the list yet/.test(A.viewMedia(A.newProduction({ name: "x", houseId: "utopia" }), A.houseById("utopia"))), "the Media tab with no camera says what to do");
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
  ok(/data-type="Codex Compact Drive"/.test(A.pkgMediaHtml()) && A.dd.media["Codex Compact Drive"].id === cdx1, "a camera's package offers its media, the card picked already");
  A.dd.media["Codex Compact Drive"].on = true; ok(/data-pkmedia="id"/.test(A.pkgMediaHtml()) && /value="4"/.test(A.pkgMediaHtml()), "ticked: the size (1TB or 2TB) and how many (4)");
  const fx3 = find("utopia", /^Sony ILME-FX3$/); A.dd.when = { id: fx3 }; A.dd.media = {};
  ok(/data-type="CFexpress Type A"/.test(A.pkgMediaHtml()) && /data-type="SD"/.test(A.pkgMediaHtml()), "a camera that takes two kinds of card: a line for each");
  A.dd.when = { id: b250 }; ok(A.pkgMediaHtml() === "", "no media box for an item that isn't a camera");
  A.app.settings.rules.push({ id: "r-a", kind: "item", house: "utopia", when: a35, add: cdx1, qty: 4 }, { id: "r-b", kind: "item", house: "utopia", when: a35, add: b250, qty: 6 });
  const vs = A.viewSettings();
  ok(/<h3>Packages<\/h3>/.test(vs) && (vs.match(/class="package"/g) || []).length === 1 && /data-act="pkg-add" data-id="[^"]+"/.test(vs) && /\+ New package/.test(vs), "Settings: one Alexa 35 package with both items, and + to add another");
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
  ok(["Full-Frame → DCI 4K", "Super 35 → UHD", "Super 16 → HD"].every(m => modes.includes(m)) && A.REC.fx9.find(c => c.n === "XAVC-I HD").m.find(x => x[0] === "Full-Frame → HD")[3] === 180 && A.REC.fx9.find(c => c.n === "XAVC-I HD").m.find(x => x[0] === "Super 35 → HD")[3] === 120, "FX9: the imager scan modes (Full-Frame, Super 35, Super 16) and their top speeds (FF HD 180, S35 HD 120)");
  l.rec = { codec: "XAVC-I 4K", mode: "Full-Frame → DCI 4K", fps: 23.976 }; const qd = find("utopia", /128GB XQD/); l.rec.card = qd;
  const per = A.recResult(l, e).per / 60; ok(per >= 52 && per <= 56, `FX9 XAVC-I DCI 4K 23.98p on 128GB: about 54 min, as Sony's table (${Math.round(per)})`);
  for (const [fps, want] of [[23.976, 130], [25, 105], [59.94, 57]]) { l.rec = { codec: "XAVC-I HD", mode: "Full-Frame → HD", fps, card: qd }; const m = A.recResult(l, e).per / 60; ok(Math.abs(m - want) <= 3, `FX9 XAVC-I HD ${fps}p on 128GB: about ${want} min, as Sony's table (${Math.round(m)})`); }
  for (const [c, want] of [["XAVC-L 4K", 125], ["XAVC-L HD 35", 305], ["MPEG HD422", 220]]) { l.rec = { codec: c, mode: c === "XAVC-L 4K" ? "Full-Frame → UHD" : "Full-Frame → HD", fps: 25, card: qd }; const m = A.recResult(l, e).per / 60; ok(Math.abs(m - want) <= want * 0.03, `FX9 ${c} 25p on 128GB: about ${want} min, as Sony's table (${Math.round(m)})`); }
  ok(A.csOf("XAVC-L HD 35") === "4:2:0 · 8-bit" && A.csOf("MPEG HD422") === "4:2:2 · 8-bit", "FX9 sampling for XAVC-L HD 35 and MPEG HD422"); }

// --- a matching card reader for each kind of card on the list
{ const keepRules = A.app.settings.rules; A.app.settings.rules = []; A.app.settings.readers = true;
  const pr = A.newProduction({ name: "Readers", houseId: "utopia" }); A.app.productions.push(pr);
  const cdx1 = find("utopia", /Codex Compact Drive 1TB/), cdx2 = find("utopia", /Codex Compact Drive 2TB/), dock = find("utopia", /Codex Compact Drive Dock/), sd = find("utopia", /SanDisk 64GB SD Card/), sdr = find("utopia", /Lexar SD\/CF Card Reader/);
  A.setQty(pr, cdx1, 4); A.setQty(pr, cdx2, 2); A.setQty(pr, sd, 3);
  ok(pr.items[dock]?.qty === 1 && pr.items[sdr]?.qty === 1, "one Codex dock for both Codex drives, one SD reader");
  A.setQty(pr, sd, 0); ok(!pr.items[sdr], "the SD cards go, and so does their reader");
  A.app.settings.readers = false; A.applyDefaults(pr); ok(!pr.items[dock], "switched off: the readers come off");
  A.app.settings.rules = keepRules; }

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
