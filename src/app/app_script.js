const DATA = __DATA__;
const HOUSES = DATA.rental_houses;
const SECTIONS = DATA.sections;

/* ---------- catalog index ---------- */
const ITEM = new Map();
// the catalogs as scraped, kept untouched; the user's edits are layered on top by applyCatalog()
const BASE = new Map(), BITEM = new Map(), BLOC = new Map();
let ord = 0;
for (const h of HOUSES) {
  BASE.set(h.id, h.categories.map(c => ({ ...c, subcategories: c.subcategories.map(s => ({ ...s, items: s.items.slice() })) })));
  for (const c of h.categories) for (const s of c.subcategories) for (const it of s.items) {
    BITEM.set(it.id, it); BLOC.set(it.id, { c: c.id, s: s.id, ord });
    ITEM.set(it.id, { it, h, c, s, ord: ord++ });
  }
}
const houseById = id => HOUSES.find(h => h.id === id);
const catCount = c => (c.direct ? c.direct.items.length : 0) + c.subcategories.reduce((b, s) => b + s.items.length, 0);
const houseCount = h => h.categories.reduce((a, c) => a + catCount(c), 0);

/* ---------- helpers ---------- */
const esc = s => String(s ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const norm = s => String(s || "").toLowerCase();
const flat = s => norm(s).replace(/[^a-z0-9]/g, "");
function hl(text, q) {
  if (!q) return esc(text);
  const i = norm(text).indexOf(q);
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
}
const CHEV = `<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function parseDate(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
function fmtDate(s) { const p = parseDate(s); return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : ""; }
function fmtShort(s) { const p = parseDate(s); return p ? `${p.d}.${p.m}.${String(p.y).slice(2)}` : ""; }
function fmtRange(a, b) {
  const pa = parseDate(a), pb = parseDate(b);
  if (!pa) return "";
  if (!pb || a === b) return fmtDate(a);
  if (pa.y === pb.y && pa.m === pb.m) return `${pa.d}–${pb.d} ${MONTHS[pa.m - 1]} ${pa.y}`;
  if (pa.y === pb.y) return `${pa.d} ${MONTHS[pa.m - 1]} – ${pb.d} ${MONTHS[pb.m - 1]} ${pa.y}`;
  return `${fmtDate(a)} – ${fmtDate(b)}`;
}
function daysBetween(a, b) {
  const pa = parseDate(a), pb = parseDate(b || a);
  if (!pa || !pb) return 0;
  const n = Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000) + 1;
  return n > 0 ? n : 0;
}
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clampQ = v => Math.max(0, Math.min(999, Math.floor(Number(v) || 0)));
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.hidden = false;
  if (undoFn) hideUndo();  // one message at a time at the bottom
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600);
}
/* undo: something just deleted can be taken back for a few seconds, from a quiet card at the bottom
   ("Removed ARRI Alexa Mini · Undo") with a thin line running down the time left; what comes back glows for a moment */
const UNDO_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>`;
const UNDO_MS = 8000;
let undoFn = null, undoT = 0;
function undoable(verb, what, fn) {
  const u = document.getElementById("undoBar"); if (!u) return;
  const t = document.getElementById("toast"); if (t) t.hidden = true;
  undoFn = fn; buzz("warn");
  // just a small faded undo arrow in the bottom corner, with a thin ring running down the seconds left
  const label = `Undo: ${verb.toLowerCase()} ${what || ""}`.trim();
  u.innerHTML = `<span class="sr">${esc(verb)} ${esc(what || "")}</span><button class="ub-btn" type="button" data-act="undo" aria-label="${esc(label)}" title="${esc(label)}">${UNDO_ICON}<svg class="ub-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16.5"/></svg></button>`;
  u.classList.toggle("over-dock", !!document.querySelector(".dock:not([hidden]), .navbar:not([hidden])"));
  u.hidden = false; u.classList.remove("in"); void u.offsetWidth; u.classList.add("in");
  clearTimeout(undoT); undoT = setTimeout(hideUndo, UNDO_MS);
}
function hideUndo() {
  undoFn = null; clearTimeout(undoT);
  const u = document.getElementById("undoBar"); if (!u || !u.classList) return;
  u.classList.remove("in"); setTimeout(() => { if (!u.classList.contains("in")) u.hidden = true; }, 220);
}
/* what came back glows softly, so you see where it is */
function flashBack(sel) {
  if (typeof document === "undefined" || !document.querySelectorAll) return;
  (typeof requestAnimationFrame === "function" ? requestAnimationFrame : f => f())(() => document.querySelectorAll(sel).forEach(el => { el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }));
}
/* a list's lines as they are now, to put back */
function snapItems(p) {
  const id = p.id, items = clone(p.items), ok = clone(p.clashOk);
  return () => {
    const q = findProd(id); if (!q) return;
    const back = Object.keys(items).filter(k => !q.items[k] || JSON.stringify(q.items[k]) !== JSON.stringify(items[k]));
    q.items = items; q.clashOk = ok; touch(q); rerenderKeepScroll();
    if (back.length) flashBack(back.map(k => `li.line[data-line="${CSS.escape(k)}"]`).join(","));
  };
}
/* productions about to be deleted (with their 2nd Units), to put back where they were */
function snapProds(ids) {
  const before = app.productions.slice(), beforeIds = new Set(before.map(x => x.id)), home = app.view === "home";
  return () => {
    const now = new Set(app.productions.map(x => x.id));
    const back = before.filter(x => !now.has(x.id));
    app.productions = [...before.filter(x => now.has(x.id) || back.includes(x)), ...app.productions.filter(x => !beforeIds.has(x.id))];
    back.forEach(x => touch(x));
    if (home || app.view === "home") rerenderKeepScroll(); else render();
    if (back.length) flashBack(back.map(x => `.prod-card[data-id="${CSS.escape(x.id)}"]`).join(","));
  };
}

/* a lens's name without what its spec line already says (mount, stop, format, squeeze, the set's focal list),
   so it fits on one line: "Viltrox Epic 50mm T2 1.33x Full-Frame Anamorphic Lens PL Mount" -> "Viltrox Epic 50mm" */
const MOUNT_TOK = "(?:ARRI\\s+)?(?:L?PL|EF|E|RF|L|M|MFT|LPL)";
function lensShortName(it, sp) {
  const full = it.name || "";
  if (!sp) return full;
  let n = " " + full.replace(/(\d)\s+Mm\b/g, "$1mm").replace(/(?<![\w.\/])(\d+)\s+Lens(?:es)?\s+(Set|Kit)\b/gi, "$1-Lens $2") + " ";
  // brackets: drop mount and focus-scale notes inside, keep anything else ("Silver Flare")
  n = n.replace(/\(([^()]*)\)/g, (m, inner) => {
    const rest = inner.split(/\s*,\s*/).filter(x => x && !new RegExp("^" + MOUNT_TOK + "(?:\\s*[/\\\\]\\s*" + MOUNT_TOK + ")*(?:[- ]Mount)?$", "i").test(x.trim()) && !/^feet$/i.test(x.trim()));
    return rest.length ? "(" + rest.join(", ") + ")" : "";
  });
  n = n.replace(new RegExp("[\\s-]*\\b" + MOUNT_TOK + "(?:\\s*[/\\\\]\\s*" + MOUNT_TOK + ")*[- ]Mount\\b", "gi"), " ")   // PL/EF/E Mount, LPL-Mount
       .replace(/\bfor Sony E\b/gi, " ").replace(/\bLens-LPL\b/gi, "Lens").replace(/\sPL(?=\s+(?:Set|Kit)\b)/g, " ")
       .replace(/\s-\s*\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?)+\s*mm\s*\/?\s*(?:All\b)?/gi, " ");                  // "- 18, 25, 35mm/ All"
  if (sp.label) n = n.replace(/\bT\d+(?:\.\d+)?\/(?=\d+(?:\.\d+)?mm)/g, "").replace(/\/T\d+(?:\.\d+)?(?=\s|$)/g, " ")   // Cooke "T2/65mm", Alura "15.5-45/T2.8"
       .replace(/\s\bT\s?\/?\s?\d+(?:\.\d+)?(?:\s*[-–/]\s*T?\d+(?:\.\d+)?)*(?=[\s,)]|$)/g, " ")
       .replace(/\s\bf\s?\/\s?\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?(?=[\s,)]|$)/gi, " ")
       .replace(/\s\bF\d+(?:\.\d+)?(?=\s|$)/g, " ").replace(/\s1:\d+(?:\.\d+)?(?=\s|$)/g, " ");
  if (sp.cov) n = n.replace(/\s(?:Full[- ]Frame|FF|Super ?35|S35)(?=[\s,)]|$)/gi, " ");
  if (sp.squeeze) n = n.replace(new RegExp("\\s" + sp.squeeze.replace(/[.]/g, "\\.").replace(/x$/i, "") + "[xX](?=\\s|$)", "g"), " ");
  if (sp.ana) n = n.replace(/\sAnamorphic(?=\s|$)/gi, " ");
  n = n.replace(/\s(?:ARRI\s)?L?PL(?=\s*$)/, " ").replace(/\sLens(?=\s|$)/g, " ").replace(/\s{2,}/g, " ").replace(/\s*\/\s*(?=\/|$)/g, " ").replace(/\s[-–,/]+\s*$/, " ").replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").trim();
  return n.length >= 6 ? n : full;
}
/* the name in pieces that stay whole; a line may break only before a size ("50mm", '7"'), a bracket,
   a joiner ("&", "/", "with") or a generic word (Lens, Set, Kit), never inside a two-word name */
const BREAK_BEFORE = /^(?:\d+(?:\.\d+)?(?:[-–]\d+(?:\.\d+)?)?(?:mm|"|''|”|in|inch|wh|gb|tb)|\(|&|\+|\/|[-–]|with|w\/|for|lens|lenses|set|kit)$/i;
function nameHtml(text, q) {
  const t = String(text || "").split(/\s+/).filter(Boolean), units = [];
  for (let i = 0; i < t.length; i++) {
    const brk = i > 0 && BREAK_BEFORE.test(t[i].replace(/[,.;:]$/, "")) && !/^(?:&|\+|\/|[-–]|with|w\/|for)$/i.test(t[i - 1])
      && !(i === t.length - 1 && /^(?:set|kit|lens|lenses)$/i.test(t[i]));  // never leave "Set" alone on a line
    if (!units.length || brk) units.push([t[i]]); else units[units.length - 1].push(t[i]);
  }
  return units.map(u => { const w = u.slice(); if (w.length > 1 && w[w.length - 1].length <= 4) w.splice(-2, 2, w[w.length - 2] + "\u00a0" + w[w.length - 1]); return `<span class="u">${hl(w.join(" "), q)}</span>`; }).join(" ");
}
/* a lens set on one flowing line, each lens with its stop: "18 T2.9 • 25 T2.1 • 35 T2.1 …" (the set name already says how many); hi marks the focal length being searched */
function perHtml(per, hi, around) {
  if (!per || !per.length) return "";
  // around: only the lenses next to the one you looked for (a set of 12 stays on one line)
  let list = per, pre = "", post = "";
  if (around != null) { const i = Math.max(0, per.findIndex(x => x.f === hi)), a = Math.max(0, i - around), b = Math.min(per.length, i + around + 1); list = per.slice(a, b); pre = a > 0 ? "… " : ""; post = b < per.length ? " …" : ""; }
  return `<span class="lens-line">${pre}${list.map(x => `<span class="ll${x.f === hi ? " on" : ""}"><b>${esc(String(x.f))}</b>${x.label ? " " + esc(x.label) : ""}</span>`).join(`<span class="sep" aria-hidden="true"> • </span>`)}${post}</span>`;
}
/* ---------- specs: lens coverage, camera sensor ---------- */
const COV_LABEL = { FF: "Full frame", LF: "Large format", S35: "Super 35", "APS-C": "APS-C / S35", S16: "Super 16", MFT: "MFT", MF: "Medium format", "2/3": '2/3" B4' };
const COV_RANK = { "2/3": 0, S16: 1, MFT: 2, "APS-C": 3, S35: 3, FF: 4, LF: 4, MF: 5 };
/* the line under an item's name. The SKU shows only in the gear list (o.sku), or when it's what you searched for */
function specsHtml(it, extra, o = {}) {
  if (!it) return "";
  const out = [];
  if (it.sku && (o.sku || (o.q && norm(it.sku).includes(o.q)))) out.push(`<span class="sku">${hl(it.sku, o.q || "")}</span>`);
  if (extra) out.push(`<span>${esc(extra)}</span>`);
  let per = "";
  if (it.lens) {
    const L = it.lens, e = ITEM.get(it.id), sp = lensSpec(it, e && e.s.id);
    if (L.coverage) out.push(`<span class="cov">${esc(L.coverage)}</span>`);
    const perStops = sp && sp.per && sp.per.some(x => x.label);
    if (L.stop && !perStops) out.push(`<span>${esc(L.stop)}</span>`);
    else if (!L.stop && sp && sp.label && !sp.per) out.push(`<span>${esc(sp.label)}</span>`);
    if (sp) { const m = sp.mounts.filter(x => x !== "Other"); if (m.length) out.push(`<span>${esc(m.join("/"))}</span>`); }
    if (L.focals && !(sp && sp.per) && !/\d\s*mm/i.test(lensShortName(it, sp))) out.push(`<span>${esc(L.focals)}</span>`);
    if (L.squeeze) out.push(`<span>${esc(L.squeeze)} anamorphic</span>`);
    if (L.note && !perStops) out.push(`<span>${esc(L.note)}</span>`);
    else if (L.note && !/standard speed/i.test(L.note)) out.push(`<span>${esc(L.note)}</span>`);
    if (sp && sp.per) per = perHtml(sp.per);
  }
  if (it.camera) out.push(`<span class="cov">${esc(it.camera.sensor === "fixed" ? "Fixed lens" : it.camera.sensor)}</span>`);
  if (o.link && out.length) out.push(o.link);  // the product page globe ends the line
  return (out.length ? `<span class="specs">${out.join("")}</span>` : "") + per;
}

/* ---------- state ---------- */
/* the earlier ready-made camera rules (batteries, memory cards). New users start with none and make their own defaults;
   lists that already have these keep them until they're deleted in Settings */
const DEFAULT_RULES = [];
const app = {
  productions: [],
  settings: { favorites: {}, rules: DEFAULT_RULES.map(r => ({ ...r })), mediaSeeded: true, updatedAt: 0 },
  view: "home",           // home | form | production | settings
  pid: null, formFor: null,
  tab: "add",             // add | fav | list
  q: "", cat: "all",
  open: new Set(["camera_accessories/general"]),
  editing: null,
  editCat: false,         // Add gear in edit mode: rename and move catalog items
  storage: "local",
};
const cur = () => app.productions.find(p => p.id === app.pid);

/* ---------- the user's catalog edits ----------
   Per rental house: renamed items and headings, items moved elsewhere, the user's own categories, subcategories
   and items, and the order of categories and subcategories. A subcategory is known by its key "home/id" (the
   category it was made in, then its id) and keeps that key when it is dragged into another category. */
const NO_EDITS = { items: {}, heads: {} };
/* the catalog everyone starts from: the app's sorting plus the owner's own edits (headings, moves, items, order, closed manufacturers).
   Notes, favorites and battery rules are not part of it. */
const STARTER = /*STARTER*/null || { catalog: {}, closedBrands: {}, catColors: {} };
const clone = o => JSON.parse(JSON.stringify(o || {}));
const editKey = e => JSON.stringify(Object.entries(e || {}).filter(([, v]) => v && (Array.isArray(v) ? v.length : typeof v === "object" ? Object.keys(v).length : true)).sort((a, b) => a[0] < b[0] ? -1 : 1));
const peekEdits = hid => (app.settings.catalog || {})[hid] || NO_EDITS;
function catEdits(hid) {
  const all = app.settings.catalog || (app.settings.catalog = {});
  const e = all[hid] || (all[hid] = {});
  e.items = e.items || {}; e.heads = e.heads || {}; e.cats = e.cats || []; e.subs = e.subs || [];
  e.newItems = e.newItems || []; e.subMoves = e.subMoves || {}; e.subOrder = e.subOrder || {}; e.catOrder = e.catOrder || [];
  e.groupOrder = e.groupOrder || {}; e.itemOrder = e.itemOrder || {}; e.groups = e.groups || {}; e.brandSplit = e.brandSplit || {}; e.flat = e.flat || {}; e.brandOrder = e.brandOrder || {}; e.hidden = e.hidden || {};
  return e;
}
const hasEdits = h => { const e = peekEdits(h.id); if (editKey(e) === editKey(STARTER.catalog[h.id])) return false; return ["items", "heads", "subMoves", "subOrder", "groupOrder", "itemOrder", "groups", "brandSplit", "flat", "brandOrder", "hidden"].some(k => Object.keys(e[k] || {}).length) || ["cats", "subs", "newItems", "catOrder"].some(k => (e[k] || []).length); };
const splitKey = k => { const a = String(k).split("/"); return [a[0], a[1], a.length > 2 ? a.slice(2).join("/") : ""]; };
const subByKey = (h, key) => (h._subs && h._subs.get(key)) || null;
const subOf = (h, cid, sid) => subByKey(h, cid + "/" + sid);
const catOfSub = (h, sub) => h.categories.find(c => c.direct === sub || c.subcategories.includes(sub)) || null;
const naturalGroup = (it, s) => s.groupBy ? (it.group || "Other") : (it.brand || "Generic");
/* a category or subcategory the user made, by its heading key */
function customDef(h, k) {
  if (!h) return null;
  const [c, s] = splitKey(k), ed = peekEdits(h.id);
  return s ? (ed.subs || []).find(x => x.c === c && x.id === s) || null : (ed.cats || []).find(x => x.id === c) || null;
}
/* category colors: a palette that has a light and a dark shade of each color, or any color the user picks.
   Kept in settings.catColors by category id, so Cameras has the same color at every rental house. */
const PALETTE = [["red", "Red"], ["orange", "Orange"], ["amber", "Amber"], ["olive", "Olive"], ["green", "Green"], ["teal", "Teal"], ["sky", "Sky"], ["blue", "Blue"], ["indigo", "Indigo"], ["violet", "Violet"], ["pink", "Pink"], ["slate", "Slate"]];
const DEFAULT_PAL = { camera: "red", lenses: "amber", camera_accessories: "blue", filters: "violet" };
const defaultPal = c => DEFAULT_PAL[c.id] || "slate";
/* each category and gear list section has a small icon on its color tile */
const TAPE_ICONS = {
  cam: '<rect x="2.5" y="8" width="12.5" height="10" rx="2"/><path d="m15 11.5 6-3v9l-6-3z"/><circle cx="6.5" cy="5" r="2"/><circle cx="11.5" cy="5" r="2"/>',
  lens: '<circle cx="12" cy="12" r="9.5"/><path d="m14.3 8 4.9 8.5M9.7 8h9.8M7.4 12l4.9-8.5M9.7 16 4.8 7.5M14.3 16H4.5M16.6 12l-4.9 8.5"/>',
  knob: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3.5V6M12 18v2.5M3.5 12H6M18 12h2.5"/>',
  filter: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
  tripod: '<rect x="7.5" y="2.5" width="9" height="4.5" rx="1"/><path d="M12 7v4M12 11l-6.5 10M12 11l6.5 10M12 11v10"/>',
  monitor: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>',
  card: '<path d="M6.5 2.5h8l3 3v16h-11z"/><path d="M10 6v3M13 6v3"/>',
  bolt: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
  grip: '<path d="M7 4h7a4 4 0 0 1 4 4v1h-3.5V7.5h-6v9h6V15H18v1a4 4 0 0 1-4 4H7z"/>',
  box: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9"/>',
  tag: '<path d="M3.5 12.5V3.5h9l8 8-9 9z"/><circle cx="8" cy="8" r="1.5"/>'
};
const TAPE_OF = { camera: "cam", lens: "lens", lenses: "lens", accessories: "knob", camera_accessories: "knob", filters: "filter", support: "tripod", display: "monitor", media: "card", power: "bolt", grip: "grip", aks: "box" };
const TAPE_BY_NAME = [[/grip/i, "grip"], [/power|batter/i, "bolt"], [/monitor|display|video village/i, "monitor"], [/media|card|storage/i, "card"], [/support|tripod|head/i, "tripod"], [/filter/i, "filter"], [/lens/i, "lens"], [/accessor/i, "knob"], [/camera/i, "cam"]];
const tapeIcon = (key, name = "") => { const k = TAPE_OF[key] || (TAPE_BY_NAME.find(([re]) => re.test(name)) || [])[1] || "tag";
  return `<span class="tape" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TAPE_ICONS[k]}</svg></span>`; };
const isHex = v => /^#[0-9a-f]{6}$/i.test(v || "");
function catTape(c) {
  const v = (app.settings.catColors || {})[c.id];
  if (isHex(v)) return v;
  if (PALETTE.some(([k]) => k === v)) return `var(--pal-${v})`;
  return `var(--pal-${defaultPal(c)})`;
}
function setCatColor(c, v) {
  const m = app.settings.catColors || (app.settings.catColors = {});
  if (!v || v === defaultPal(c)) delete m[c.id]; else m[c.id] = v;
  touchSettings();
}
/* the color choices in a dialog: palette swatches, then one swatch that opens the system color picker */
function swatchField(c, idp) {
  const cur = (app.settings.catColors || {})[c.id] || defaultPal(c), hex = isHex(cur);
  return `<div class="field"><span class="lbl" id="${idp}-lbl">Color</span><div class="swatches" role="radiogroup" aria-labelledby="${idp}-lbl">
    ${PALETTE.map(([k, name]) => `<label class="sw" style="--sw: var(--pal-${k})" title="${name}${k === defaultPal(c) ? " (original)" : ""}"><input type="radio" name="color" value="${k}" aria-label="${name}${k === defaultPal(c) ? ", original" : ""}" ${cur === k ? "checked" : ""}>${k === defaultPal(c) ? '<span class="sw-orig" aria-hidden="true"></span>' : ""}</label>`).join("")}
    <label class="sw sw-any" style="--sw: ${hex ? cur : "transparent"}" title="Any color"><input type="radio" name="color" value="custom" aria-label="Any color" ${hex ? "checked" : ""}><input type="color" name="colorHex" value="${hex ? cur : "#888888"}" aria-label="Pick any color"></label>
  </div>${c.id !== "__new" ? `<span class="hint">The dot marks the original color. The last swatch opens a picker for any color.</span>` : ""}</div>`;
}
const pickedColor = f => { const v = f.elements.color && f.elements.color.value; return v === "custom" ? (isHex(f.elements.colorHex.value) ? f.elements.colorHex.value : "") : v || ""; };
const ownItem = (h, id) => (peekEdits(h.id).newItems || []).find(d => d.id === id) || null;
function addCategory(h, name, subName, section) {
  const ed = catEdits(h.id), id = uid("uc-");
  ed.cats.push({ id, name: String(name).trim().slice(0, 60) });
  const skey = subName ? addSubcategory(h, id, subName, section, true) : id + "/_";
  applyCatalog(); touchSettings();
  return [id, skey];
}
function addSubcategory(h, cid, name, section, quiet) {
  const ed = catEdits(h.id), id = uid("ux-");
  ed.subs.push({ id, c: cid, name: String(name).trim().slice(0, 60) || "General", section: section || "accessories" });
  if (!quiet) { applyCatalog(); touchSettings(); }
  return cid + "/" + id;
}
/* delete one of the user's categories or subcategories. Rental house items in it go back to where the
   rental house lists them, rental house subcategories dragged into it go back home, the user's own items in it are deleted. */
function ownItemsIn(h, k) {
  const [c, s] = splitKey(k), ed = peekEdits(h.id);
  const gone = s ? [k] : [c + "/_", ...(ed.subs || []).filter(x => x.c === c).map(x => x.c + "/" + x.id)];
  return (ed.newItems || []).filter(d => gone.includes(d.c + "/" + d.s));
}
function deleteCustom(h, k) {
  const ed = catEdits(h.id), [c, s] = splitKey(k);
  const gone = s ? [k] : [c + "/_", ...ed.subs.filter(x => x.c === c).map(x => x.c + "/" + x.id)];
  const lost = new Set(ownItemsIn(h, k).map(d => d.id));
  if (s) ed.subs = ed.subs.filter(x => x.c + "/" + x.id !== k);
  else {
    ed.cats = ed.cats.filter(x => x.id !== c); ed.subs = ed.subs.filter(x => x.c !== c);
    ed.catOrder = ed.catOrder.filter(x => x !== c); delete ed.subOrder[c];
    for (const [sk, to] of Object.entries(ed.subMoves)) if (to === c) delete ed.subMoves[sk];
  }
  for (const sk of gone) { delete ed.subMoves[sk]; delete ed.groupOrder[sk]; delete ed.itemOrder[sk]; for (const arr of Object.values(ed.subOrder)) { const i = arr.indexOf(sk); if (i >= 0) arr.splice(i, 1); } }
  ed.newItems = ed.newItems.filter(d => !lost.has(d.id));
  for (const [id, o] of Object.entries(ed.items)) if (gone.includes(o.c + "/" + o.s)) {
    delete o.c; delete o.s; delete o.g; delete o.section;
    if (!Object.keys(o).length) delete ed.items[id];
  }
  for (const hk of Object.keys(ed.heads)) if (hk === k || hk.startsWith(k + "/") || gone.some(g => hk === g || hk.startsWith(g + "/"))) delete ed.heads[hk];
  applyCatalog(); touchSettings();
}
function applyCatalog() {
  ITEM.clear();
  for (const h of HOUSES) {
    const ed = peekEdits(h.id), io = ed.items || {}, heads = ed.heads || {};
    const subs = new Map();
    const mkSub = (s, key, extra) => { const x = { ...s, ...extra, key, name: heads[key] || s.name, items: [] }; subs.set(key, x); return x; };
    h.categories = BASE.get(h.id).map(c => ({ ...c, name: heads[c.id] || c.name, subcategories: c.subcategories.map(s => mkSub(s, c.id + "/" + s.id)) }));
    for (const uc of ed.cats || []) h.categories.push({ id: uc.id, name: uc.name, custom: true, subcategories: [] });
    for (const us of ed.subs || []) {
      const c = h.categories.find(x => x.id === us.c);
      if (c) c.subcategories.push(mkSub({ id: us.id, name: us.name }, us.c + "/" + us.id, { custom: true, section: us.section }));
    }
    // items placed straight in a category, with no subcategory
    for (const c of h.categories) { c.direct = { id: "_", key: c.id + "/_", name: "", direct: true, items: [] }; subs.set(c.direct.key, c.direct); }
    // subcategories dragged into another category
    for (const [key, to] of Object.entries(ed.subMoves || {})) {
      const x = subs.get(key), dest = h.categories.find(c => c.id === to);
      if (!x || !dest) continue;
      for (const c of h.categories) { const i = c.subcategories.indexOf(x); if (i >= 0) c.subcategories.splice(i, 1); }
      dest.subcategories.push(x);
    }
    // the user's order of subcategories and categories; anything not ordered keeps its place at the end
    const byOrder = (arr, order, k) => { if (!order || !order.length) return arr; const at = v => { const i = order.indexOf(k(v)); return i < 0 ? 1e6 : i; }; return arr.map((v, n) => [v, n]).sort((a, b) => at(a[0]) - at(b[0]) || a[1] - b[1]).map(a => a[0]); };
    for (const c of h.categories) c.subcategories = byOrder(c.subcategories, (ed.subOrder || {})[c.id], x => x.key);
    h.categories = byOrder(h.categories, ed.catOrder, c => c.id);
    h._subs = subs;
    const hidden = ed.hidden || {};
    // manufacturers each subcategory already has: an item put in one of their groups takes that manufacturer
    const makers = new Map();
    for (const c of BASE.get(h.id)) for (const s of c.subcategories) makers.set(c.id + "/" + s.id, new Set(s.items.map(x => x.brand)));
    for (const c of BASE.get(h.id)) for (const s of c.subcategories) for (const it0 of s.items) {
      if (hidden[it0.id]) continue;
      const o = io[it0.id];
      let it = it0, dest = subs.get(c.id + "/" + s.id);
      if (o) {
        it = { ...it0, edited: true };
        if (o.name) it.name = o.name;
        if (o.brand) it.brand = o.brand;
        if (o.section) it.section = o.section;
        if (o.sku) it.sku = o.sku === "-" ? "" : o.sku;
        if (o.c && o.s && subs.get(o.c + "/" + o.s)) dest = subs.get(o.c + "/" + o.s);
        if (o.g) it.grp = o.g;
        if (o.g && !o.brand && !dest.groupBy && (makers.get(dest.key) || new Set()).has(o.g)) it.brand = o.g;
      }
      // a subcategory now grouped by what things are for: an item still filed under a manufacturer, or brought in from
      // another subcategory with that one's group, goes to this subcategory's catch-all group instead of a stray folder
      if (dest.groupDefault) {
        const g = it.grp || it.group, mine = ((ed.groups || {})[dest.key] || []);
        if (g && !(dest.groups || []).includes(g) && !mine.includes(g)) it.grp = dest.groupDefault;
      }
      dest.items.push(it);
    }
    // the user's own items
    (ed.newItems || []).forEach((d, n) => {
      const dest = subs.get(d.c + "/" + d.s);
      const it = { id: d.id, name: d.name, brand: d.brand || "Generic", section: d.section || "accessories", own: true };
      if (d.url) it.url = d.url;
      if (d.sku) it.sku = d.sku;
      BITEM.set(d.id, it); BLOC.set(d.id, { c: d.c, s: d.s, ord: 1e6 + n });
      if (!dest) return;
      if (d.g) { if (dest.groupBy) it.group = d.g; else if (d.g !== it.brand) it.grp = d.g; }
      dest.items.push(it);
    });
    for (const c of h.categories) for (const s of [c.direct, ...c.subcategories]) {
      s.items.sort((a, b) => BLOC.get(a.id).ord - BLOC.get(b.id).ord);
      s.items = byOrder(s.items, (ed.itemOrder || {})[s.key], x => x.id);
      s.gorder = (ed.groupOrder || {})[s.key] || null;
      s.extra = (ed.groups || {})[s.key] || [];
    }
  }
  for (const h of HOUSES) for (const c of h.categories) for (const s of [c.direct, ...c.subcategories]) for (const it of s.items)
    ITEM.set(it.id, { it, h, c, s, ord: BLOC.get(it.id).ord });
}
/* the groups a subcategory shows, in order, with the user's labels */
function groupsOf(h, s) {
  const gs = [...new Set([...(s.groupBy ? s.groups || [] : []), ...s.items.map(x => grpOf(x, s)), ...(s.extra || [])])].filter(Boolean);
  return userOrder(s.groupBy ? gs : gs.sort((a, b) => a === "Generic" ? 1 : b === "Generic" ? -1 : a.localeCompare(b, "en", { sensitivity: "base" })), s.gorder, g => g);
}
const headLabel = (h, k, fallback) => peekEdits(h.id).heads[k] || fallback;
function defaultGroup(it, s, h) {
  const nat = naturalGroup(it, s);
  if (!s.groupBy) return nat;
  const gs = groupsOf(h, s);
  return gs.includes(nat) ? nat : gs.includes("Other") ? "Other" : gs[0] || "Other";
}
/* the gear list section most items of a subcategory go to */
function typicalSection(h, cid, sid, fallback) {
  if (sid === "_") {
    const bc = BASE.get(h.id).find(c => c.id === cid);
    if (!bc) return (peekEdits(h.id).subs || []).find(x => x.c === cid)?.section || fallback;
    const n = {};
    for (const s of bc.subcategories) for (const it of s.items) n[it.section] = (n[it.section] || 0) + 1;
    const best = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : fallback;
  }
  const own = customDef(h, cid + "/" + sid);
  if (own) return own.section || fallback;
  const s = BASE.get(h.id).find(c => c.id === cid)?.subcategories.find(x => x.id === sid);
  const n = {};
  for (const it of (s && s.items) || []) n[it.section] = (n[it.section] || 0) + 1;
  const best = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : fallback;
}
function storeItemEdit(h, id, o) {
  const ed = catEdits(h.id);
  for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === "") delete o[k];
  if (Object.keys(o).length) ed.items[id] = o; else delete ed.items[id];
  applyCatalog(); touchSettings();
}
const clean = o => { for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === "") delete o[k]; return o; };
/* drag onto a heading: move the item into that subcategory (and group) */
function moveCatItem(h, id, key) {
  const e = ITEM.get(id); if (!e || e.h.id !== h.id) return false;
  const [c, s, g] = splitKey(key);
  const tgt = subOf(h, c, s); if (!tgt) return false;
  const sameSub = e.s === tgt;
  if (sameSub && (!g || g === grpOf(e.it, e.s))) return false;
  const own = e.it.own && catEdits(h.id).newItems.find(d => d.id === id);
  if (own) {
    own.c = c; own.s = s;
    own.g = g || (sameSub ? own.g : undefined);
    if (!sameSub) own.section = typicalSection(h, c, s, own.section);
    clean(own); applyCatalog(); touchSettings();
    return true;
  }
  const base = BITEM.get(id), bl = BLOC.get(id), old = peekEdits(h.id).items[id] || {};
  const o = { name: old.name, brand: old.brand, section: old.section };
  if (c !== bl.c || s !== bl.s) { o.c = c; o.s = s; }
  const grp = g || (sameSub ? grpOf(e.it, e.s) : defaultGroup(base, tgt, h));
  if (grp !== naturalGroup(base, tgt)) o.g = grp;
  if (!sameSub) { const sec = typicalSection(h, c, s, base.section); o.section = sec !== base.section ? sec : undefined; }
  storeItemEdit(h, id, o);
  return true;
}
/* the item dialog's group choice: "__brand" means group by brand, "__new" a typed name */
const pickedGroup = v => v.g === "__new" ? String(v.gnew || "").trim().slice(0, 60) || undefined : v.g === "__brand" ? undefined : v.g || undefined;
/* the Edit dialog's Save; v.s is a subcategory key */
function saveCatItem(h, id, v) {
  const [kc, ks] = splitKey(v.s), tgt = subOf(h, kc, ks); if (!tgt) return;
  const name = String(v.name || "").trim().slice(0, 160);
  const own = ITEM.get(id)?.it.own && catEdits(h.id).newItems.find(d => d.id === id);
  if (own) {
    Object.assign(own, { name: name || own.name, brand: String(v.brand || "").trim().slice(0, 60), sku: String(v.sku || "").trim().slice(0, 40), url: safeUrl(String(v.url || "").trim()),
      c: kc, s: ks, g: pickedGroup(v), section: v.section || own.section });
    clean(own); applyCatalog(); touchSettings();
    return;
  }
  const base = BITEM.get(id), bl = BLOC.get(id); if (!base) return;
  const moved = kc !== bl.c || ks !== bl.s;
  const brand = String(v.brand || "").trim().slice(0, 60) || (ITEM.get(id)?.it.brand) || base.brand;
  const now = { ...base, brand };
  const g = pickedGroup(v) || defaultGroup(now, tgt, h);
  storeItemEdit(h, id, {
    name: name && name !== base.name ? name : undefined,
    brand: brand !== base.brand ? brand : undefined,
    c: moved ? kc : undefined, s: moved ? ks : undefined,
    g: g !== naturalGroup(now, tgt) ? g : undefined,
    section: v.section && v.section !== base.section ? v.section : undefined,
    sku: v.sku !== undefined && String(v.sku).trim() !== (base.sku || "") ? String(v.sku).trim().slice(0, 40) || "-" : undefined,
  });
}
/* a catalog item renamed (here or from a list): the catalog keeps the name, and lists that still use the old name follow */
function renameCatItem(h, id, name) {
  const e = ITEM.get(id); name = String(name || "").trim().slice(0, 160);
  if (!e || !name || name === e.it.name) return false;
  const own = e.it.own && catEdits(h.id).newItems.find(d => d.id === id);
  if (own) { own.name = name; applyCatalog(); touchSettings(); }
  else { const base = BITEM.get(id), old = { ...(peekEdits(h.id).items[id] || {}) }; old.name = name !== base.name ? name : undefined; storeItemEdit(h, id, old); }
  return true;
}
function syncLineNames(id, from, to) {
  if (!from || !to || from === to) return;
  for (const q of app.productions) { const l = q.items && q.items[id]; if (l && (l.name === from || !l.name)) { l.name = to; l.orig = to; touch(q); } else if (l && l.orig === from) l.orig = to; }
}
/* a new item of the user's own, placed where they chose */
function createOwnItem(h, v) {
  const [kc, ks] = splitKey(v.s);
  if (!subOf(h, kc, ks)) return null;
  const d = clean({ id: uid("ui-"), name: String(v.name || "").trim().slice(0, 160), brand: String(v.brand || "").trim().slice(0, 60), sku: String(v.sku || "").trim().slice(0, 40), url: safeUrl(String(v.url || "").trim()),
    c: kc, s: ks, g: pickedGroup(v), section: v.section || typicalSection(h, kc, ks, "accessories") });
  if (!d.name) return null;
  catEdits(h.id).newItems.push(d);
  applyCatalog(); touchSettings();
  return d.id;
}
function deleteOwnItem(h, id) { const ed = catEdits(h.id); ed.newItems = ed.newItems.filter(d => d.id !== id); if (app.settings.notes) delete app.settings.notes[id]; applyCatalog(); touchSettings(); }
/* a private note on a catalog item: shown under the item in the catalog only, never on the gear list or in exports */
const noteOf = id => (app.settings.notes || {})[id] || "";
function setNote(id, text) {
  const n = app.settings.notes || (app.settings.notes = {});
  text = String(text || "").trim().slice(0, 300);
  if (text === (n[id] || "")) return;
  if (text) n[id] = text; else delete n[id];
  touchSettings();
}
const LINK_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z"/></svg>`;
const safeUrl = u => { if (!/^https?:\/\//i.test(u || "")) return ""; try { return encodeURI(decodeURI(u)); } catch (e) { return ""; } };
const linkHtml = (it, h) => it && safeUrl(it.url) ? `<a class="ext" href="${esc(safeUrl(it.url))}" target="_blank" rel="noopener noreferrer" title="Product page${h ? " on " + esc(h.name) : ""}" aria-label="Open ${esc(it.name)} on ${esc(h ? h.name : "the rental house")}'s site">${LINK_ICON}</a>` : "";
const noteHtml = id => noteOf(id) ? `<span class="inote">${esc(noteOf(id))}</span>` : "";
/* drag a subcategory: into a category, before or after another subcategory */
function moveSub(h, key, toCat, refKey, after) {
  const ed = catEdits(h.id), [home] = splitKey(key);
  const c = h.categories.find(x => x.id === toCat), x = subByKey(h, key);
  if (!c || !x) return false;
  if (toCat === home) delete ed.subMoves[key]; else ed.subMoves[key] = toCat;
  const keys = c.subcategories.map(y => y.key).filter(k => k !== key);
  let at = refKey ? keys.indexOf(refKey) : -1;
  at = at < 0 ? keys.length : at + (after ? 1 : 0);
  keys.splice(at, 0, key);
  ed.subOrder[toCat] = keys;
  applyCatalog(); touchSettings();
  return true;
}
/* drag a group: reorder it inside its subcategory, or take all its items into another subcategory */
function moveGroup(h, gkey, toSubKey, refG, after) {
  const [c, s, g] = splitKey(gkey), from = subOf(h, c, s);
  if (!from || !g || !subByKey(h, toSubKey)) return false;
  const ed = catEdits(h.id);
  if (from.key !== toSubKey) {
    const ids = from.items.filter(x => grpOf(x, from) === g).map(x => x.id);
    for (const id of ids) moveCatItem(h, id, toSubKey + "/" + g);
    if (ed.heads[gkey]) { ed.heads[toSubKey + "/" + g] = ed.heads[gkey]; delete ed.heads[gkey]; }
    if (ed.brandSplit[gkey] !== undefined || (from.brandSplit || []).includes(g)) { ed.brandSplit[toSubKey + "/" + g] = splitByBrand(h, from, g); delete ed.brandSplit[gkey]; }
    if ((ed.groups[from.key] || []).includes(g)) {
      ed.groups[from.key] = ed.groups[from.key].filter(x => x !== g);
      if (!ed.groups[from.key].length) delete ed.groups[from.key];
      (ed.groups[toSubKey] || (ed.groups[toSubKey] = [])).push(g);
      applyCatalog();
    }
  }
  const to = subByKey(h, toSubKey);
  const gs = subGroupNames(h, to).filter(x => x !== g);
  let at = refG ? gs.indexOf(refG) : -1;
  at = at < 0 ? gs.length : at + (after ? 1 : 0);
  gs.splice(at, 0, g);
  ed.groupOrder[toSubKey] = gs;
  applyCatalog(); touchSettings();
  return true;
}
/* every folder (group) in a subcategory, in display order, including the user's empty ones */
function subGroupNames(h, sub) {
  const names = groupItems(sub.items, sub).map(([g]) => g).filter(Boolean);
  for (const g of sub.extra || []) if (!names.includes(g)) names.push(g);
  return userOrder(names, sub.gorder, g => g);
}
/* a folder: a subcategory in a category, or a group in a subcategory */
function addFolder(h, parent, name, section) {
  name = String(name || "").trim().slice(0, 60);
  if (!name) return null;
  if (!parent.includes("/")) return ensureSub(h, parent, name, section);
  const sub = subByKey(h, parent); if (!sub) return null;
  const ed = catEdits(h.id), list = ed.groups[parent] || (ed.groups[parent] = []);
  const ex = subGroupNames(h, sub).find(g => norm(g) === norm(name) || norm(headLabel(h, parent + "/" + g, g)) === norm(name));
  if (ex) return parent + "/" + ex;
  list.push(name);
  applyCatalog(); touchSettings();
  return parent + "/" + name;
}
/* a group can list its items under their manufacturers */
function splitByBrand(h, s, g) {
  const v = (peekEdits(h.id).brandSplit || {})[s.key + "/" + g];
  return v !== undefined ? v : (s.brandSplit || []).includes(g);
}
function setBrandSplit(h, gkey, on) {
  const [c, sId, g] = splitKey(gkey), s = subOf(h, c, sId), ed = catEdits(h.id);
  if (!s) return;
  if (on === (s.brandSplit || []).includes(g)) delete ed.brandSplit[gkey]; else ed.brandSplit[gkey] = on;
  touchSettings();
}
const brandSort = (a, b) => a === "Generic" ? 1 : b === "Generic" ? -1 : a.localeCompare(b, "en", { sensitivity: "base" });
/* a list split by manufacturer: kB is where dropped items go, listKey names the list (its sub or group key), order is the user's dragged order */
function brandRows(its, render, ed, kB, renameKey, listKey, order, searching) {
  const m = new Map();
  for (const it of its) { const b = it.brand || "Generic"; if (!m.has(b)) m.set(b, []); m.get(b).push(it); }
  const lk = listKey || kB, closedSet = app.settings.closedBrands || {};
  return userOrder([...m.entries()].sort((a, b) => brandSort(a[0], b[0])), order, e => e[0]).map(([b, list]) => {
    const ck = lk + "|" + b, closed = !searching && !!closedSet[ck];
    const handle = ed ? `<button class="handle" type="button" data-drag="cmfr" data-id="${esc(lk)}" data-b="${esc(b)}" data-label="${esc(b)}" aria-label="Move ${esc(b)}: drag, or use the arrow keys">${GRIP}</button>` : "";
    const pen = ed ? `<button class="iconbtn pen" type="button" data-act="rename-mfr" data-k="${esc(renameKey ? renameKey(b) : kB)}" data-b="${esc(b)}" aria-label="Rename manufacturer ${esc(b)}">✎</button>` : "";
    return `<li class="mfr-head${closed ? " closed" : ""}" data-act="mfr-toggle" data-k="${esc(ck)}"${ed ? ` data-drop="${esc(kB)}" data-brand="${esc(b)}" data-list="${esc(lk)}"` : ""}><span>${handle}<button class="mfr-name" type="button" aria-expanded="${!closed}">${esc(b)}</button>${pen}</span><span class="sumr"><span class="cnt">${list.length}</span>${CHEV}</span></li>`
      + (closed ? "" : list.map(it => render(it, b)).join(""));
  }).join("");
}
/* the items a manufacturer list shows: a group's items, or a flat subcategory's items that sit with their manufacturer */
function listItems(h, listKey) {
  const [c, sId, g] = splitKey(listKey), s = subOf(h, c, sId);
  if (!s) return [];
  if (g) return s.items.filter(x => grpOf(x, s) === g);
  return s.items.filter(x => grpOf(x, s) === (x.brand || "Generic"));
}
function brandsIn(h, listKey) {
  const names = [...new Set(listItems(h, listKey).map(x => x.brand || "Generic"))].sort(brandSort);
  return userOrder(names, (peekEdits(h.id).brandOrder || {})[listKey], b => b);
}
/* drag a manufacturer heading: reorder it, or take all its items to another subcategory or folder */
function moveBrand(h, fromList, brand, toList, ref, after) {
  const ed = catEdits(h.id);
  if (fromList !== toList) {
    const ids = listItems(h, fromList).filter(x => (x.brand || "Generic") === brand).map(x => x.id);
    if (!ids.length) return false;
    const [c, sId, g] = splitKey(toList);
    for (const id of ids) moveCatItem(h, id, g ? toList : c + "/" + sId);
  }
  const names = brandsIn(h, toList).filter(b => b !== brand);
  let at = ref ? names.indexOf(ref) : -1;
  at = at < 0 ? names.length : at + (after ? 1 : 0);
  names.splice(at, 0, brand);
  ed.brandOrder[toList] = names;
  applyCatalog(); touchSettings();
  return true;
}
/* a subcategory grouped by manufacturer can show one open list with a heading per manufacturer, instead of a folder per manufacturer */
const flatDefault = (h, s) => !s.groupBy && catOfSub(h, s)?.id === "camera_accessories";
function isFlat(h, s) {
  if (s.groupBy || s.direct) return false;
  const v = (peekEdits(h.id).flat || {})[s.key];
  return v !== undefined ? v : flatDefault(h, s);
}
function setFlat(h, skey, on) {
  const s = subByKey(h, skey), ed = catEdits(h.id);
  if (!s) return;
  if (on === flatDefault(h, s)) delete ed.flat[skey]; else ed.flat[skey] = on;
  touchSettings();
}
const isOwnGroup = (h, gkey) => { const [c, s, g] = splitKey(gkey); return !!g && ((peekEdits(h.id).groups || {})[c + "/" + s] || []).includes(g); };
/* delete a folder the user made: anything put in it goes back to its usual group */
function deleteFolder(h, gkey) {
  const [c, s, g] = splitKey(gkey), skey = c + "/" + s, ed = catEdits(h.id);
  ed.groups[skey] = (ed.groups[skey] || []).filter(x => x !== g);
  if (!ed.groups[skey].length) delete ed.groups[skey];
  const sub = subByKey(h, skey);
  for (const it of sub ? sub.items.filter(x => grpOf(x, sub) === g) : []) {
    if (it.own) { const d = ed.newItems.find(x => x.id === it.id); if (d) delete d.g; }
    else if (ed.items[it.id]) { delete ed.items[it.id].g; if (!Object.keys(ed.items[it.id]).length) delete ed.items[it.id]; }
  }
  delete ed.heads[gkey];
  if (ed.groupOrder[skey]) ed.groupOrder[skey] = ed.groupOrder[skey].filter(x => x !== g);
  applyCatalog(); touchSettings();
}
/* drop an item before or after another one in the same subcategory */
function reorderItem(h, id, refId, after) {
  const e = ITEM.get(id), r = ITEM.get(refId);
  if (!e || !r || e.s !== r.s || id === refId) return false;
  const ids = e.s.items.map(x => x.id).filter(x => x !== id);
  let at = ids.indexOf(refId);
  at = at < 0 ? ids.length : at + (after ? 1 : 0);
  ids.splice(at, 0, id);
  catEdits(h.id).itemOrder[e.s.key] = ids;
  applyCatalog(); touchSettings();
  return true;
}
/* drag a category before or after another */
function moveCat(h, cid, refId, after) {
  const ed = catEdits(h.id);
  const ids = h.categories.map(c => c.id).filter(i => i !== cid);
  if (ids.length === h.categories.length) return false;
  let at = refId ? ids.indexOf(refId) : -1;
  at = at < 0 ? ids.length : at + (after ? 1 : 0);
  ids.splice(at, 0, cid);
  ed.catOrder = ids;
  applyCatalog(); touchSettings();
  return true;
}
/* catalog an item under another manufacturer */
function setItemBrand(h, id, brand, quiet) {
  brand = String(brand || "").trim().slice(0, 60);
  const e = ITEM.get(id);
  if (!e || !brand || brand === e.it.brand) return false;
  const ed = catEdits(h.id);
  if (e.it.own) { const d = ed.newItems.find(x => x.id === id); if (d) d.brand = brand; }
  else {
    const base = BITEM.get(id), o = { ...(ed.items[id] || {}) };
    if (brand === base.brand) delete o.brand; else o.brand = brand;
    if (Object.keys(o).length) ed.items[id] = o; else delete ed.items[id];
  }
  if (!quiet) { applyCatalog(); touchSettings(); }
  return true;
}
/* rename a manufacturer heading inside a group: every item under it gets the new name */
function renameBrandInGroup(h, gkey, from, to) {
  const [c, sId, g] = splitKey(gkey), s = subOf(h, c, sId);
  if (!s || !String(to || "").trim()) return 0;
  let n = 0;
  for (const it of s.items.filter(x => grpOf(x, s) === g && (x.brand || "Generic") === from)) if (setItemBrand(h, it.id, to, true)) n++;
  if (n) { applyCatalog(); touchSettings(); }
  return n;
}
/* remove a rental house item from the catalog (it can be brought back); delete one of the user's own */
function removeCatItem(h, id) {
  const e = ITEM.get(id); if (!e) return false;
  if (e.it.own) { deleteOwnItem(h, id); return true; }
  catEdits(h.id).hidden[id] = true;
  applyCatalog(); touchSettings();
  return true;
}
function restoreCatItem(h, id) { const ed = catEdits(h.id); delete ed.hidden[id]; applyCatalog(); touchSettings(); }
const hiddenItems = h => Object.keys(peekEdits(h.id).hidden || {}).map(id => BITEM.get(id)).filter(Boolean);
function resetCatItem(h, id) { const ed = catEdits(h.id); delete ed.items[id]; applyCatalog(); touchSettings(); }
/* rename a heading: a catalog category, subcategory or group, or a gear list section */
function headOrig(scope, h, k) {
  if (scope === "section") return allSections().find(s => s.id === k)?.name || k;
  const [c, s, g] = splitKey(k);
  const bc = BASE.get(h.id).find(x => x.id === c);
  if (g) return g;
  const own = customDef(h, k);  // one the user made: its own name, never its internal id
  if (own) return own.name;
  if (s) return bc?.subcategories.find(x => x.id === s)?.name || s;
  return bc?.name || c;
}
function setHead(scope, h, k, name) {
  name = String(name || "").trim().slice(0, 60);
  const orig = headOrig(scope, h, k);
  const own = scope === "section" ? (app.settings.customSections || []).find(c => c.id === k) : customDef(h, k);
  if (own) { if (name) own.name = name; if (scope !== "section") applyCatalog(); touchSettings(); return; }
  if (scope === "section") {
    const m = app.settings.sections || (app.settings.sections = {});
    if (!name || name === orig) delete m[k]; else m[k] = name;
  } else {
    const heads = catEdits(h.id).heads;
    if (!name || name === orig) delete heads[k]; else heads[k] = name;
    applyCatalog();
  }
  touchSettings();
}
const secName = id => (app.settings.sections || {})[id] || allSections().find(s => s.id === id)?.name || id;
/* the gear list sections: the built-in ones from the Word layout plus the user's own, each in the left or right column */
function allSections() {
  const out = SECTIONS.map(s => ({ ...s }));
  for (const c of app.settings.customSections || []) {
    const sec = { id: c.id, name: c.name, column: c.column === "R" ? "R" : "L", custom: true };
    const j = c.after ? out.findIndex(s => s.id === c.after) : out.findIndex(s => s.column === sec.column);
    out.splice(j < 0 ? out.length : c.after ? j + 1 : j, 0, sec);
  }
  return out;
}
function addSection(name, pos) {
  const [column, after] = String(pos || "R|").split("|");
  const id = uid("us-");
  (app.settings.customSections || (app.settings.customSections = [])).push({ id, name: String(name).trim().slice(0, 60), column: column === "L" ? "L" : "R", after: after || "" });
  touchSettings();
  return id;
}
function deleteSection(id) {
  app.settings.customSections = (app.settings.customSections || []).filter(c => c.id !== id)
    .map(c => c.after === id ? { ...c, after: "" } : c);
  if (app.settings.sections) delete app.settings.sections[id];
  touchSettings();
}
/* where a new section can go: top of a column, or after any section */
function sectionSlots(sel) {
  const AS = allSections(), opt = (v, t) => `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${esc(t)}</option>`;
  return ["L", "R"].map(col => `<optgroup label="${col === "L" ? "Left column" : "Right column"}">${opt(col + "|", `Top of the ${col === "L" ? "left" : "right"} column`)}${AS.filter(s => s.column === col).map(s => opt(col + "|" + s.id, `${col === "L" ? "Left" : "Right"} column, after ${secName(s.id)}`)).join("")}</optgroup>`).join("");
}

/* ---------- storage: browser copy always, account copy when available ---------- */
const LS_KEY = "accam-productions-v1", LS_UI = "accam-ui-v1", LS_SET = "accam-settings-v1";
const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch (e) { return d; } };
const lsPut = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const lsSave = () => lsPut(LS_KEY, app.productions);
const uiSave = () => lsPut(LS_UI, { view: app.view === "production" ? "production" : "home", pid: app.pid, tab: app.tab, at: Date.now() });
const RESUME_MS = 15 * 60 * 1000;  // back within 15 minutes (say, after sending the list on WhatsApp): the same list; later: the home page
const needsWelcome = () => !app.settings.welcomed && !app.productions.length && !((app.settings.me || {}).name);

let COL = null;
const timers = new Map(), chains = new Map(), dirty = new Set();
let prevRemote = new Set();
const SETTINGS_ID = "settings";

/* where the lists are kept: said in Settings, next to the account. The top bar only speaks up when the account can't be reached */
const storageText = () => (app.storage === "cloud" ? "Saved to your account" : "Saved in this browser");
function setSaveState(kind) {
  const el = document.getElementById("saveState");
  app.saveKind = kind;
  el.className = "save-state " + (kind || "");
  el.textContent = kind === "offline" ? "Can't reach your account yet" : "";
  const st = document.getElementById("storeLine"); if (st) st.textContent = kind === "saving" ? "Saving…" : kind === "offline" ? "Can't reach your account yet" : storageText();
}
function schedule(id) {
  dirty.add(id);
  setSaveState("saving");
  clearTimeout(timers.get(id));
  timers.set(id, setTimeout(() => flush(id), 700));
}
function touch(p) { p.updatedAt = Date.now(); lsSave(); schedule(p.id); }
function touchSettings() { app.settings.updatedAt = Date.now(); lsPut(LS_SET, app.settings); schedule(SETTINGS_ID); }
function flush(id) {
  timers.delete(id);
  const prev = chains.get(id) || Promise.resolve();
  const run = prev.then(async () => {
    const body = id === SETTINGS_ID ? app.settings : app.productions.find(x => x.id === id);
    if (body && COL) {
      try { await COL.doc(id).set(JSON.parse(JSON.stringify(body, (k, v) => k === "_w" ? undefined : v))); }
      catch (e) {
        if (e && e.code === "quota_exceeded") toast("Your account storage is full. Changes are kept in this browser.");
        else if (e && (e.code === "invalid_argument" || e.code === "revoked")) { COL = null; app.storage = "local"; }
      }
    }
    dirty.delete(id);
    if (!dirty.size && !timers.size) setSaveState("saved");
  });
  chains.set(id, run);
  return run;
}
async function removeRemote(id) {
  if (!COL) return;
  const run = (chains.get(id) || Promise.resolve()).then(() => COL.doc(id).delete()).catch(() => {});
  chains.set(id, run);
  await run;
}
function typing() { const a = document.activeElement; return !!(a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT")); }
async function initAccount() {
  if (!window.claude || typeof window.claude.use !== "function") return;
  let db, user;
  try { [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]); } catch (e) { return; }
  if (!db || !user) return;
  if (app.view === "welcome" && !typing()) render();  // sign-in is ready now: the welcome can offer it
  const me = await user.id();
  if (!me) return;
  try { COL = db.collection("data/users/" + me); } catch (e) { COL = null; return; }
  let settled = false;
  const slow = setTimeout(() => { if (!settled) setSaveState("offline"); }, 10000);
  COL.onSnapshot(snap => {
    const docs = snap.docs.filter(d => d.exists);
    const remote = docs.filter(d => d.id !== SETTINGS_ID).map(d => ({ ...d.data(), id: d.id }));
    const rset = docs.find(d => d.id === SETTINGS_ID);
    let changed = false;
    if (!snap.metadata.fromCache && !settled) {
      settled = true; clearTimeout(slow);
      app.storage = "cloud";
      const ids = new Set(remote.map(r => r.id));
      for (const p of app.productions) if (!ids.has(p.id)) schedule(p.id);
      if (!rset && app.settings.updatedAt) schedule(SETTINGS_ID);
      setSaveState("saved");
    }
    if (rset && !dirty.has(SETTINGS_ID) && !timers.has(SETTINGS_ID)) {
      const r = rset.data();
      if ((r.updatedAt || 0) > (app.settings.updatedAt || 0)) { app.settings = { favorites: {}, rules: [], ...r }; applyCatalog(); app.settings.mediaSeeded = true; lsPut(LS_SET, app.settings); changed = true; }
    }
    const remoteIds = new Set(remote.map(r => r.id));
    for (const r of remote) {
      if (dirty.has(r.id) || timers.has(r.id)) continue;
      const i = app.productions.findIndex(p => p.id === r.id);
      if (i < 0) { app.productions.push(r); changed = true; }
      else if ((r.updatedAt || 0) > (app.productions[i].updatedAt || 0)) { app.productions[i] = r; changed = true; }
    }
    if (!snap.metadata.fromCache) {
      for (const id of prevRemote) if (!remoteIds.has(id) && !dirty.has(id)) {
        const i = app.productions.findIndex(p => p.id === id);
        if (i >= 0) { app.productions.splice(i, 1); changed = true; }
      }
      prevRemote = remoteIds;
    }
    if (changed) {
      lsSave();
      if (app.view === "production" && !cur()) app.view = "home";
      if (!typing()) render();
    }
  }, () => { settled = true; clearTimeout(slow); COL = null; app.storage = "local"; setSaveState("saved"); });
}

/* ---------- production model ---------- */
function newProduction(fields) {
  const now = Date.now();
  return { id: uid("p"), name: "", company: "", houseId: "", dp: "", ac: "", acPhone: "",
    prep: "", shootStart: "", shootEnd: "", shootDays: "", days: {}, notes: "", items: {}, createdAt: now, updatedAt: now, ...fields };
}
/* a copy of a production with all its items, under a new id (the caller names it) */
function copyProduction(p, fields) {
  const c = JSON.parse(JSON.stringify(p));
  delete c._w;
  return Object.assign(c, { id: uid("p"), createdAt: Date.now(), updatedAt: Date.now() }, fields || {});
}
function lineFromCatalog(id) {
  const e = ITEM.get(id);
  const l = { qty: 1, note: "", name: e.it.name, orig: e.it.name, brand: e.it.brand, section: e.it.section, cat: e.c.name, sub: e.s.name, ord: e.ord, children: [] };
  if (e.it.txrx) { l.sets = 1; l.tx = 1; l.rx = 1; l.qty = 1; }  // wireless video: counted in sets; each set starts with one TX and one RX
  return l;
}
const lineQty = l => l.tx !== undefined ? (l.sets ?? 1) : (l.qty || 0);
function totals(p) {
  const v = Object.values(p.items || {});
  return { lines: v.length, pcs: v.reduce((a, x) => a + lineQty(x), 0) };
}
/* shoot days: every day from the first to the last, except Fridays and Saturdays, unless a day was switched on or off by hand (p.days) */
const isoDate = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const weekday = s => { const p = parseDate(s); return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() : -1; };
const isWeekend = s => { const w = weekday(s); return w === 5 || w === 6; };
function rangeDates(a, b) {
  const pa = parseDate(a), pb = parseDate(b || a), out = [];
  if (!pa || !pb) return out;
  for (let t = Date.UTC(pa.y, pa.m - 1, pa.d), end = Date.UTC(pb.y, pb.m - 1, pb.d); t <= end && out.length < 400; t += 86400000) {
    const d = new Date(t); out.push(isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
  }
  return out;
}
function dayOn(days, s) { const o = (days || {})[s]; return o !== undefined ? !!o : !isWeekend(s); }
const countShootDays = (a, b, days) => rangeDates(a, b).filter(d => dayOn(days, d)).length;
function shootDays(p) { return p.shootDays ? Number(p.shootDays) : countShootDays(p.shootStart, p.shootEnd, p.days); }

/* camera default batteries */
function ruleMatches(r, e) {
  if (r.kind === "item") return !!e && e.it.id === r.when && ITEM.has(r.add);
  if (!e || !e.it.camera) return false;
  if (r.kind === "media") return (e.it.camera.media || []).length > 0;
  if (e.it.camera.film || e.it.camera.sensor === "fixed") return false;
  if (r.match.brand) return e.it.brand === r.match.brand;
  if (r.match.key) return flat(e.it.name).includes(r.match.key);
  return false;
}
const capGB = n => { const m = /(\d+(?:\.\d+)?)\s*(TB|GB)/i.exec(n); return m ? parseFloat(m[1]) * (m[2].toUpperCase() === "TB" ? 1000 : 1) : 0; };
function resolveMedia(e, houseId) {
  for (const type of e.it.camera.media) {
    let best = null;
    for (const [id, x] of ITEM) if (x.h.id === houseId && x.s.id === "media" && grpOf(x.it, x.s) === type && (!best || capGB(x.it.name) > capGB(best.label))) best = { id, label: x.it.name, type };
    if (best) return best;
  }
  const t = e.it.camera.media[0];
  return { id: "auto-card-" + flat(t), label: t + " card", type: t };
}
/* a card reader for a camera's cards: one in the house's Card Readers of that card type, else a multi-card reader that names it */
const READER_WORD = { "SD": /\bSD\b/i, "microSD": /micro\s*SD/i, "CF": /\bCF\b/, "CFast 2.0": /CFast/i, "CFexpress Type B": /CFexpress/i, "CFexpress Type A": /CFexpress[^/]*Type A|Type A/i };
function resolveReader(type, houseId) {
  if (!type) return null;
  let multi = null;
  for (const [id, x] of ITEM) {
    if (x.h.id !== houseId || x.s.id !== "card_readers") continue;
    const g = grpOf(x.it, x.s);
    if (g === type) return { id, label: x.it.name };
    if (!multi && READER_WORD[type] && READER_WORD[type].test(x.it.name)) multi = { id, label: x.it.name };
  }
  return multi;
}
function resolveTarget(r, e, houseId) { return r.kind === "item" ? { id: r.add, label: ITEM.get(r.add).it.name } : r.kind === "media" ? resolveMedia(e, houseId) : resolveBattery(r, houseId); }
function resolveBattery(r, houseId) {
  const b = r.battery;
  for (const [id, e] of ITEM) {
    if (e.h.id !== houseId || e.it.section !== "power") continue;
    const f = flat(e.it.name);
    if (b.flat ? f === b.flat : (b.tokens || []).every(t => f.includes(t))) return { id, label: e.it.name };
  }
  if (b.flat) {  // a battery picked from the other house: try its words
    const words = norm(b.label).split(/[^a-z0-9]+/).filter(w => w.length >= 3 && /\d/.test(w) || ["fxlion", "swit", "sony", "idx", "anton"].includes(w));
    if (words.length) for (const [id, e] of ITEM) {
      if (e.h.id !== houseId || e.it.section !== "power") continue;
      const f = flat(e.it.name);
      if (words.every(w => f.includes(w))) return { id, label: e.it.name };
    }
  }
  return { id: "auto-" + flat(b.label), label: b.label };
}
/* ---------- cards and recording time ----------
   Each camera on a list keeps, for the Media tab, the card its figures use and the format it records
   (l.rec = { card, gb?, codec, mode, fps } or { card, mbps }): from these, how long one card lasts.
   Where the numbers come from:
   ARRI: ARRI's Formats & Data Rate Calculator (bytes per frame; Codex Compact Drive sizes as the camera sees them).
   RED: RED's recording-time tool (14-bit raw ÷ REDCODE ratio, held to the camera's write speed, + 5%).
   Sony X-OCN: bits per pixel from Sony's VENICE 2 record-time table. Sony XAVC-I/L: Sony's FX9 record-time table.
   Sony XAVC S / HS: Sony's spec sheets (Mbps). Canon: Canon's spec sheets (Mbps at 25p).
   Blackmagic RAW: Blackmagic's own calculator (12-bit ÷ ratio, + 4 KB a frame). ProRes: Apple's ProRes white paper.
   DJI ProRes RAW: the middle of DJI's published range.
   Codec kinds (t): B bytes a frame · bpp bits a pixel · pr Apple ProRes [HD, UHD] bits a pixel · braw ratio [low, high]
   · red least REDCODE ratio · M25 / M24 Mbps at 25p / 23.98p, growing with the frame rate · Mfix [[up to fps, Mbps]] */
const REC_ARRI = {"alexa35":[{"n":"ARRIRAW","t":"B","m":[["4.6K 3:2 Open Gate",4608,3164,75,23219804],["4.6K 16:9",4608,2592,75,19032748],["4K 16:9",4096,2304,120,15057612],["3.8K 16:9 → UHD",3840,2160,120,13243186],["4K 2:1",4096,2048,120,13394542],["3.3K 6:5",3328,2790,100,14814618],["3K 1:1",3072,3072,100,15057612]]},{"n":"ProRes 4444 XQ","t":"B","m":[["4.6K 3:2 OG",4608,3164,60,16417365],["4.6K 16:9 → 4K",4096,2304,75,9257057],["4K 16:9",4096,2304,100,10678869],["4K 16:9 → UHD",3840,2160,120,9400917],["4K 16:9 → 2K",2048,1152,120,2777685],["4K 16:9 → HD",1920,1080,120,2458197],["4K 2:1",4096,2048,120,8237328],["3.3K 6:5",3328,2790,75,10506837],["3.3K 6:5 → 3.8K 2.39:1 Ana. 2x",3840,1608,90,7037525],["3K 1:1",3072,3072,90,9257057],["3K 1:1 → 3.8K 2:1 Ana 2x",3840,1920,100,7248795],["2.7K 8:9 → UHD 16:9 Ana 2x",3840,2160,100,8144956],["2K 16:9 S16",2048,1152,120,2376710]]},{"n":"ProRes 4444","t":"B","m":[["4.6K 3:2 OG",4608,3164,60,10986069],["4.6K 16:9 → 4K",4096,2304,75,6201079],["4K 16:9",4096,2304,100,7164501],["4K 16:9 → UHD",3840,2160,120,6312533],["4K 16:9 → 2K",2048,1152,120,1897045],["4K 16:9 → HD",1920,1080,120,1688149],["4K 2:1",4096,2048,120,5520903],["3.3K 6:5",3328,2790,75,7049813],["3.3K 6:5 → 3.8K 2.39:1 Ana. 2x",3840,1608,90,4735573],["3K 1:1",3072,3072,90,6201079],["3K 1:1 → 3.8K 2:1 Ana 2x",3840,1920,100,4860852],["2.7K 8:9 → UHD 16:9 Ana 2x",3840,2160,100,5456809],["2K 16:9 S16",2048,1152,120,1612650]]},{"n":"ProRes 422 HQ","t":"B","m":[["4.6K 3:2 OG",4608,3164,60,7377493],["4.6K 16:9 → 4K",4096,2304,75,4160652],["4K 16:9",4096,2304,100,4825685],["4K 16:9 → UHD",3840,2160,120,4260437],["4K 16:9 → 2K",2048,1152,120,1315413],["4K 16:9 → HD",1920,1080,120,1172053],["4K 2:1",4096,2048,120,3708635],["3.3K 6:5",3328,2790,75,4751957],["3.3K 6:5 → 3.8K 2.39:1 Ana. 2x",3840,1608,90,3207765],["3K 1:1",3072,3072,90,4160652],["3K 1:1 → 3.8K 2:1 Ana 2x",3840,1920,100,3268685],["2.7K 8:9 → UHD 16:9 Ana 2x",3840,2160,100,3664739],["2K 16:9 S16",2048,1152,120,1100610]]}],"alexa35xtreme":[{"n":"ARRIRAW","t":"B","m":[["4.6K 3:2 Open Gate",4608,3164,80,23835221],["4.6K 16:9",4608,2592,80,19554901],["4K 16:9",4096,2304,125,15479381],["3.8K 16:9 → UHD",3840,2160,140,13623893],["3.8K 2.39:1",3840,1608,190,10179157],["3.3K 6:5",3328,2790,120,15233621],["2K 16:9 S16",2048,1152,330,3977813],["HD 16:9 S16",1920,1080,330,3514965]]},{"n":"ARRICORE","t":"B","m":[["4.6K 3:2 Open Gate",4608,3164,120,10728021],["4.6K 16:9",4608,2592,150,8802901],["4K 16:9",4096,2304,150,7201365],["3.8K 16:9 → UHD",3840,2160,150,6156885],["3.8K 2.39:1",3840,1608,240,4620885],["3.3K 6:5",3328,2790,120,7139925],["2K 16:9 S16",2048,1152,330,1909333],["HD 16:9 S16",1920,1080,330,1647189]]},{"n":"ProRes 4444 XQ","t":"B","m":[["4.6K 3:2 Open Gate",4608,3164,120,16417365],["4.6K 16:9",4608,2592,150,13476437],["4K 16:9",4096,2304,150,10678869],["4K 16:9 → UHD",3840,2160,150,9400917],["4K 16:9 → 2K",2048,1152,150,2777685],["4K 16:9 → HD",1920,1080,150,2458197],["3.8K 16:9 → UHD",3840,2160,150,9400917],["3.8K 2.39:1",3840,1608,240,7037525],["3.3K 6:5",3328,2790,120,10506837],["3.3K 6:5 → 3.8K 2.39:1 Ana. 2x",3840,1608,120,7037525],["2K 16:9 S16",2048,1152,330,2777685],["HD 16:9 S16",1920,1080,330,2458197]]},{"n":"ProRes 4444","t":"B","m":[["4.6K 3:2 Open Gate",4608,3164,120,10986069],["4.6K 16:9",4608,2592,150,9028181],["4K 16:9",4096,2304,150,7164501],["4K 16:9 → UHD",3840,2160,150,6312533],["4K 16:9 → 2K",2048,1152,150,1897045],["4K 16:9 → HD",1920,1080,150,1688149],["3.8K 16:9 → UHD",3840,2160,150,6312533],["3.8K 2.39:1",3840,1608,240,4735573],["3.3K 6:5",3328,2790,120,7049813],["3.3K 6:5 → 3.8K 2.39:1 Ana. 2x",3840,1608,120,4735573],["2K 16:9 S16",2048,1152,330,1897045],["HD 16:9 S16",1920,1080,330,1688149]]},{"n":"ProRes 422 HQ","t":"B","m":[["4.6K 3:2 Open Gate",4608,3164,120,7377493],["4.6K 16:9",4608,2592,150,6070869],["4K 16:9",4096,2304,150,4825685],["4K 16:9 → UHD",3840,2160,150,4260437],["4K 16:9 → 2K",2048,1152,150,1315413],["4K 16:9 → HD",1920,1080,150,1172053],["3.8K 16:9 → UHD",3840,2160,150,4260437],["3.8K 2.39:1",3840,1608,240,3207765],["3.3K 6:5",3328,2790,120,4751957],["3.3K 6:5 → 3.8K 2.39:1 Ana. 2x",3840,1608,120,3207765],["2K 16:9 S16",2048,1152,330,1315413],["HD 16:9 S16",1920,1080,330,1172053]]}],"miniLF":[{"n":"ARRIRAW","t":"B","m":[["4.5K 3:2 OG",4448,3096,40,20180724],["4.5K 2.39:1",4448,1856,60,12097704],["3.8K 16:9 → UHD",3840,2160,60,12153648],["2.8K 1:1",2880,2880,60,12153648],["3.4K 3:2",3424,2202,60,11049408]]},{"n":"ProRes 4444 XQ","t":"B","m":[["4.5K 3:2 OG",4448,3096,40,13624663],["4.5K 2.39:1",4448,1856,60,8144087],["4.3K 16:9 → UHD",3840,2160,48,8068513],["4.3K 16:9 → HD",1920,1080,75,2020097],["3.8K 16:9 → UHD",3840,2160,60,8068513],["3.8K 16:9 → 2K",2048,1152,90,2300098],["3.8K 16:9 → HD",1920,1080,90,2020097],["2.8K 1:1",2880,2880,60,7173513],["3.2K 16:9",3200,1800,75,5604200],["2.8K 4:3",2880,2160,75,6456296],["2.8K 16:9 → HD",1920,1080,100,2020097]]},{"n":"ProRes 4444","t":"B","m":[["4.5K 3:2 OG",4448,3096,40,9193857],["4.5K 2.39:1",4448,1856,60,5447426],["4.3K 16:9 → UHD",3840,2160,48,5380390],["4.3K 16:9 → HD",1920,1080,75,1348084],["3.8K 16:9 → UHD",3840,2160,60,5380390],["3.8K 16:9 → 2K",2048,1152,90,1536130],["3.8K 16:9 → HD",1920,1080,90,1348084],["2.8K 1:1",2880,2880,60,4783890],["3.2K 16:9",3200,1800,75,3740000],["2.8K 4:3",2880,2160,75,4308064],["2.8K 16:9 → HD",1920,1080,100,1348084]]},{"n":"ProRes 422 HQ","t":"B","m":[["4.5K 3:2 OG",4448,3096,40,6129238],["4.5K 2.39:1",4448,1856,60,3631617],["4.3K 16:9 → UHD",3840,2160,48,3588094],["4.3K 16:9 → HD",1920,1080,75,900079],["3.8K 16:9 → UHD",3840,2160,60,3588094],["3.8K 16:9 → 2K",2048,1152,90,1024057],["3.8K 16:9 → HD",1920,1080,90,900079],["2.8K 1:1",2880,2880,60,3828494],["3.2K 16:9",3200,1800,75,2496200],["2.8K 4:3",2880,2160,75,2872276],["2.8K 16:9 → HD",1920,1080,100,900079]]}],"mini":[{"n":"ARRIRAW","t":"B","m":[["16:9 2.8K",2880,1620,48,6999351],["Open Gate 3.4K",3424,2202,30,11311008],["Open Gate 3.4K → 2.8K",2880,2160,30,11311008],["Open Gate 3.4K → 1.9K",1920,2160,30,11311008],["Open Gate 3.4K → 2.5K",2560,2145,30,11311008]]},{"n":"ProRes 4444 XQ","t":"B","m":[["16:9 2.8K → HD",1920,1080,120,2322432],["16:9 1.6K → HD",1920,1080,120,2322432],["0.88:1 1.9K → HD",1920,1080,120,2322432],["16:9 2.8K → 2K",2048,1152,120,2642412],["1.19:1 2.5K → 2K",2048,858,120,1968046],["16:9 3.2K",3200,1800,30,6451200],["16:9 3.2K → UHD",3840,2160,30,9289728],["4:3 2.8K",2880,2160,50,6967296]]},{"n":"ProRes 4444","t":"B","m":[["16:9 2.8K → HD",1920,1080,200,1548288],["16:9 1.6K → HD",1920,1080,200,1548288],["0.88:1 1.9K → HD",1920,1080,120,1548288],["16:9 2.8K → 2K",2048,1152,200,1761608],["1.19:1 2.5K → 2K",2048,858,120,1312031],["16:9 3.2K",3200,1800,60,4300800],["16:9 3.2K → UHD",3840,2160,60,6193152],["4:3 2.8K",2880,2160,50,4644864]]},{"n":"ProRes 422 HQ","t":"B","m":[["16:9 2.8K → HD",1920,1080,200,1032192],["16:9 1.6K → HD",1920,1080,200,1032192],["0.88:1 1.9K → HD",1920,1080,120,1032192],["16:9 2.8K → 2K",2048,1152,200,1174405],["1.19:1 2.5K → 2K",2048,858,120,874687],["16:9 3.2K",3200,1800,60,2867200],["16:9 3.2K → UHD",3840,2160,60,4128768],["4:3 2.8K",2880,2160,50,3096576]]},{"n":"ProRes 422","t":"B","m":[["16:9 2.8K → HD",1920,1080,200,688248],["16:9 1.6K → HD",1920,1080,200,688248],["0.88:1 1.9K → HD",1920,1080,120,688248],["16:9 2.8K → 2K",2048,1152,200,783073],["1.19:1 2.5K → 2K",2048,858,120,583226],["16:9 3.2K",3200,1800,60,1911800],["16:9 3.2K → UHD",3840,2160,60,2752992],["4:3 2.8K",2880,2160,50,2064744]]},{"n":"ProRes 422 LT","t":"B","m":[["16:9 2.8K → HD",1920,1080,200,479232],["16:9 1.6K → HD",1920,1080,200,479232],["0.88:1 1.9K → HD",1920,1080,120,479232],["16:9 2.8K → 2K",2048,1152,200,545260],["1.19:1 2.5K → 2K",2048,858,120,406105],["16:9 3.2K",3200,1800,60,1331200],["16:9 3.2K → UHD",3840,2160,60,1916928],["4:3 2.8K",2880,2160,50,1437696]]}],"amira":[{"n":"ARRIRAW","t":"B","m":[["16:9 2.8K",2880,1620,48,6999351]]},{"n":"ProRes 4444 XQ","t":"B","m":[["16:9 2.8K → HD",1920,1080,120,2322432],["16:9 1.6K → HD",1920,1080,120,2322432],["16:9 2.8K → 2K",2048,1152,120,2642412],["16:9 3.2K",3200,1800,30,6451200],["16:9 3.2K → UHD",3840,2160,30,9289728]]},{"n":"ProRes 4444","t":"B","m":[["16:9 2.8K → HD",1920,1080,200,1548288],["16:9 1.6K → HD",1920,1080,200,1548288],["16:9 2.8K → 2K",2048,1152,200,1761608],["16:9 3.2K",3200,1800,60,4300800],["16:9 3.2K → UHD",3840,2160,60,6193152]]},{"n":"ProRes 422 HQ","t":"B","m":[["16:9 2.8K → HD",1920,1080,200,1032192],["16:9 1.6K → HD",1920,1080,200,1032192],["16:9 2.8K → 2K",2048,1152,200,1174405],["16:9 3.2K",3200,1800,60,2867200],["16:9 3.2K → UHD",3840,2160,60,4128768]]},{"n":"ProRes 422","t":"B","m":[["16:9 2.8K → HD",1920,1080,200,688248],["16:9 1.6K → HD",1920,1080,200,688248],["16:9 2.8K → 2K",2048,1152,200,783073],["16:9 3.2K",3200,1800,60,1911800],["16:9 3.2K → UHD",3840,2160,60,2752992]]},{"n":"ProRes 422 LT","t":"B","m":[["16:9 2.8K → HD",1920,1080,200,479232],["16:9 1.6K → HD",1920,1080,200,479232],["16:9 2.8K → 2K",2048,1152,200,545260],["16:9 3.2K",3200,1800,60,1331200],["16:9 3.2K → UHD",3840,2160,60,1916928]]}],"alexaClassic":[{"n":"ProRes 4444 XQ","t":"B","m":[["16:9 → HD",1920,1080,60,2327557],["16:9 → 2K",2048,1152,60,2659333],["4:3 → 2K",2048,1536,48,3544069]]},{"n":"ProRes 4444","t":"B","m":[["16:9 → HD",1920,1080,60,1553413],["16:9 → 2K",2048,1152,60,1774597],["4:3 → 2K",2048,1536,48,2364421]]},{"n":"ProRes 422 HQ","t":"B","m":[["16:9 → HD",1920,1080,120,1037317],["16:9 → 2K",2048,1152,60,1184773],["4:3 → 2K",2048,1536,48,1577989]]},{"n":"ProRes 422","t":"B","m":[["16:9 → HD",1920,1080,120,693253],["16:9 → 2K",2048,1152,60,791557],["4:3 → 2K",2048,1536,48,1053701]]}]};
const PR = { "ProRes 4444 XQ": [8.045, 6.4], "ProRes 4444": [5.31, 4.268], "ProRes 422 HQ": [3.54, 2.844], "ProRes 422": [2.365, 1.895], "ProRes 422 LT": [1.641, 1.319], "ProRes 422 Proxy": [0.724, 0.583] };
const pr = (names, modes) => names.map(n => ({ n, t: "pr", v: PR[n], m: modes }));
const XOCN = { "X-OCN XT": 4.6, "X-OCN ST": 3.16, "X-OCN LT": 1.83 };
const xocn = (names, modes) => names.map(n => ({ n, t: "bpp", v: XOCN[n], m: modes }));
const brawOf = (ratios, modes) => ratios.map(r => typeof r === "number" ? { n: `Blackmagic RAW ${r}:1`, t: "braw", v: [r, r], m: modes } : { n: `Blackmagic RAW ${r[0]}`, t: "braw", v: r[1], m: modes });
const BRAW_Q = [["Q0", [4, 2]], ["Q1", [6, 2.5]], ["Q3", [9, 3.5]], ["Q5", [15, 6]]];
const UHD = ["UHD", 3840, 2160], DCI = ["4K DCI", 4096, 2160], HD = ["HD", 1920, 1080];
const m = (mode, fps, v) => v === undefined ? [mode[0], mode[1], mode[2], fps] : [mode[0], mode[1], mode[2], fps, v];
/* Sony */
const VENICE6K = [["6K 3:2", 6048, 4032, 30], ["6K 2.39:1", 6048, 2534, 90], ["6K 17:9", 6054, 3192, 72], ["5.7K 16:9", 5674, 3192, 72], ["4K 6:5", 4096, 3432, 75], ["4K 4:3", 4096, 3024, 75], ["4K 17:9", 4096, 2160, 110], ["3.8K 16:9", 3840, 2160, 110]];
const VENICE8K = [["8.6K 3:2", 8640, 5760, 30], ["8.6K 17:9", 8640, 4556, 48], ["8.2K 17:9", 8192, 4320, 60], ["8.2K 2.39:1", 8192, 3432, 72], ["8.1K 16:9", 8100, 4556, 48], ["7.6K 16:9", 7680, 4320, 60], ["5.8K 6:5", 5792, 4854, 48], ["5.8K 4:3", 5792, 4276, 60], ["5.8K 17:9", 5792, 3056, 90], ["5.5K 2.39:1", 5480, 2296, 120], ["5.4K 16:9", 5434, 3056, 90]];
const BURANO = [["8.6K 16:9", 8632, 4856, 30], ["8.6K 17:9", 8632, 4552, 30], ["6K 16:9", 6052, 3404, 60], ["6K 17:9", 6052, 3192, 60], ["5.8K 6:5", 5828, 4856, 30], ["S35 5.8K 16:9", 5760, 3240, 60], ["S35 5.8K 17:9", 5760, 3036, 60], ["S35 4.3K 4:3", 4256, 3192, 60], ["S35 4K 17:9", 4096, 2160, 120], ["3.8K 16:9", 3840, 2160, 120]];
const XAVC_I = (fps4k, fpsHd) => [{ n: "XAVC-I 4K", t: "M24", m: [m(DCI, fps4k, 297), m(UHD, fps4k, 297)] }, { n: "XAVC-I HD", t: "M24", m: [m(HD, fpsHd, 123)] }];
const XAVC_L = [{ n: "XAVC-L 4K", t: "Mfix", m: [m(UHD, 60, [[30, 128], [60, 186]])] }, { n: "XAVC-L HD", t: "Mfix", m: [m(HD, 60, [[60, 71]])] }];
const XAVC_S = (si) => [...(si ? [{ n: "XAVC S-I 4K", t: "M24", m: [m(UHD, 60, 240), m(DCI, 60, 240)] }, { n: "XAVC S-I HD", t: "M24", m: [m(HD, 60, 89)] }] : []),
  ...(si ? [{ n: "XAVC HS 4K", t: "Mfix", m: [m(UHD, 120, [[30, 100], [60, 200], [120, 280]])] }] : []),
  { n: si ? "XAVC S 4K (4:2:2 10-bit)" : "XAVC S 4K", t: "Mfix", m: [m(UHD, si ? 120 : 30, si ? [[24, 100], [30, 140], [60, 200], [120, 280]] : [[30, 100]])] },
  { n: "XAVC S HD", t: "Mfix", m: [m(HD, si ? 120 : 60, [[60, 50], [120, 100]])] }];
/* RED */
const KOMODO = [["6K 17:9", 6144, 3240, 40], ["6K 2.4:1", 6144, 2592, 50], ["6K 16:9", 5760, 3240, 40], ["6K 3:2", 4860, 3240, 40], ["6K 6:5", 3888, 3240, 40], ["5K 17:9", 5120, 2700, 48], ["4K 17:9", 4096, 2160, 60], ["4K 16:9", 3840, 2160, 60], ["2K 17:9", 2048, 1080, 120]];
const HELIUM = [["8K FF", 8192, 4320, 60], ["8K 2.4:1", 8192, 3456, 75], ["8K 16:9", 7680, 4320, 60], ["8K 6:5", 5184, 4320, 60], ["7K FF", 7168, 3780, 60], ["6K FF", 6144, 3240, 75], ["6K 2.4:1", 6144, 2592, 100], ["6K 16:9", 5760, 3240, 75], ["5K FF", 5120, 2700, 96], ["4K FF", 4096, 2160, 120], ["4K 16:9", 3840, 2160, 120]];
const DRAGON = [["6K FF", 6144, 3240, 75], ["6K 2.4:1", 6144, 2592, 100], ["6K 16:9", 5568, 3132, 75], ["6K 6:5", 3792, 3160, 75], ["5K FF", 5120, 2700, 96], ["5K 2.4:1", 5120, 2160, 120], ["4.5K FF", 4608, 2412, 100], ["4K FF", 4096, 2160, 120], ["4K 16:9", 3840, 2160, 120]];
const redQ = (qs, modes) => qs.map(([n, q]) => ({ n: "REDCODE " + n, t: "red", v: q, m: modes }));
/* Canon (Mbps at 25p) */
const crm = (rows) => ["LT", "ST", "HQ"].map((q, i) => ({ n: "Cinema RAW Light " + q, t: "M25", m: rows.filter(r => r[4][i]).map(r => [r[0], r[1], r[2], i === 2 && r[5] ? r[5] : r[3], r[4][i]]) })).filter(c => c.m.length);
const xfavc = (intra4k, intraHd, lgop4k, hevc) => [{ n: "XF-AVC Intra 4K", t: "M25", m: [m(DCI, 60, intra4k), m(UHD, 60, intra4k)] }, ...(intraHd ? [{ n: "XF-AVC Intra HD", t: "M25", m: [m(HD, 120, intraHd)] }] : []),
  ...(lgop4k ? [{ n: "XF-AVC Long GOP 4K", t: "Mfix", m: [m(DCI, 60, lgop4k), m(UHD, 60, lgop4k)] }] : []), ...(hevc ? [{ n: "XF-HEVC S 4K", t: "Mfix", m: [m(DCI, 60, hevc), m(UHD, 60, hevc)] }] : [])];
/* Blackmagic */
const PYX6K = [["6K Open Gate", 6080, 4048, 36], ["6.5K anamorphic", 4864, 4048, 36], ["6K 16:9", 6144, 3388, 46], ["6K DCI", 6144, 3182, 48], ["6K 2.4:1", 6144, 2510, 60], ["Super 35 4K", 4512, 2826, 50], ["4K 16:9", 4128, 2320, 60], ["4K DCI", 4128, 2176, 60], ["Super 16", 2176, 1182, 100], ["HD", 1984, 1078, 120]];
const URSA12K = [["12K 17:9", 12288, 6480, 60], ["12K 2.4:1", 12288, 5112, 75], ["8K 17:9", 8192, 4320, 110], ["6K Super 16", 6144, 3240, 120], ["4K Super 16", 4096, 2160, 220]];
const PYX12K = [["12K Open Gate", 12288, 8040, 40], ["12K 17:9", 12288, 6480, 50], ["8K 17:9", 8192, 4320, 100], ["4K 17:9", 4096, 2160, 100]];
const URSA46 = [["4.6K", 4608, 2592, 120], ["4.6K 2.4:1", 4608, 1920, 150], ["4K DCI", 4096, 2160, 150], ["UHD", 3840, 2160, 150], ["HD", 1920, 1080, 300]];
const POCKET4K = [["4K DCI", 4096, 2160, 60], ["UHD", 3840, 2160, 60], ["2.8K 17:9", 2880, 1512, 80], ["HD", 1920, 1080, 120]];
const POCKET6K = [["6K", 6144, 3456, 50], ["6K 2.4:1", 6144, 2560, 60], ["5.7K 17:9", 5744, 3024, 60], ["4K DCI", 4096, 2160, 60], ["2.8K 17:9", 2880, 1512, 120], ["HD", 1920, 1080, 120]];
/* DJI Ronin 4D 6K: ProRes RAW at the middle of DJI's range */
const R4D = [["6K 17:9", 6008, 3168, 60], ["C4K", 4096, 2160, 120], ["UHD", 3840, 2160, 120]];
const REC = {
  ...REC_ARRI,
  venice: [...xocn(["X-OCN XT", "X-OCN ST", "X-OCN LT"], VENICE6K), ...pr(["ProRes 4444", "ProRes 422 HQ", "ProRes 422"], [HD]), { n: "XAVC-I Class 480 4K", t: "M24", m: [m(DCI, 60, 476), m(UHD, 60, 476)] }, ...XAVC_I(60, 120).slice(0, 1)],
  venice2: [...xocn(["X-OCN XT", "X-OCN ST", "X-OCN LT"], VENICE8K), ...pr(["ProRes 4444", "ProRes 422 HQ"], [DCI, UHD, HD]), { n: "XAVC-I Class 480 4K", t: "M24", m: [m(DCI, 60, 476), m(UHD, 60, 476)] }, ...XAVC_I(60, 120).slice(0, 1)],
  burano: [...xocn(["X-OCN ST", "X-OCN LT"], BURANO), ...XAVC_I(120, 240), ...XAVC_L],
  fx9: [...XAVC_I(60, 180), ...XAVC_L], fx6: [...XAVC_I(120, 240), ...XAVC_L], fs7: [...XAVC_I(60, 180), ...XAVC_L],
  fs5: [{ n: "XAVC-L 4K", t: "Mfix", m: [m(UHD, 30, [[30, 100]])] }, { n: "XAVC-L HD", t: "Mfix", m: [m(HD, 60, [[60, 50]])] }],
  sonySI: XAVC_S(true), sonyS: XAVC_S(false),
  komodo: redQ([["HQ", 2], ["MQ", 5], ["LQ", 8]], KOMODO),
  helium: redQ([["3:1", 3], ["5:1", 5], ["8:1", 8], ["12:1", 12]], HELIUM),
  dragon: redQ([["3:1", 3], ["5:1", 5], ["8:1", 8], ["12:1", 12]], DRAGON),
  c400: [...crm([["FF 6K", 6000, 3164, 60, [576, 886, 1800], 30], ["S35 4.3K", 4368, 2304, 60, [306, 470, 954]], ["S16 2K", 2184, 1152, 120, [77, 118, 240]]]), ...xfavc(500, 125, [[30, 150], [60, 250]], [[30, 135], [60, 225]])],
  c500: [...crm([["FF 5.9K", 5952, 3140, 60, [556, 871, 1770], 30], ["4:3 4.2K", 4192, 3140, 60, [400, 615, 1250], 30], ["6:5 3.8K", 3768, 3140, 60, [360, 553, 1350], 30], ["S35 4K", 4096, 2160, 60, [269, 414, 841]], ["S16 2K", 2048, 1080, 120, [69, 105, 213]]]), ...xfavc(410, 160, [[30, 160], [60, 260]])],
  c80: [...crm([["FF 6K", 6000, 3164, 30, [576, 0, 0]], ["S35 4.3K", 4368, 2304, 60, [306, 470, 0]]]), ...xfavc(500, 125, [[30, 150], [60, 250]], [[30, 135], [60, 225]])],
  c70: [...crm([["4K DCI", 4096, 2160, 60, [269, 414, 841]]]), ...xfavc(410, 160, [[30, 160], [60, 260]], [[30, 135], [60, 225]])],
  c300ii: [{ n: "XF-AVC Intra 4K", t: "M25", m: [m(DCI, 30, 410), m(UHD, 30, 410)] }, { n: "XF-AVC Intra HD", t: "M25", m: [m(HD, 60, 160)] }, { n: "XF-AVC Long GOP HD", t: "Mfix", m: [m(HD, 60, [[60, 50]])] }],
  c300: [{ n: "MPEG-2 HD 50 Mbps", t: "Mfix", m: [m(HD, 30, [[30, 50]])] }],
  pyxis6k: brawOf([3, 5, 8, 12, ...BRAW_Q], PYX6K),
  pyxis12k: brawOf([5, 8, 12, 18, ...BRAW_Q], PYX12K), ursa12k: brawOf([5, 8, 12, 18, ...BRAW_Q], URSA12K),
  ursa46: [...brawOf([3, 5, 8, 12, ...BRAW_Q], URSA46), ...pr(["ProRes 4444 XQ", "ProRes 4444", "ProRes 422 HQ", "ProRes 422"], [m(DCI, 60), m(UHD, 60), m(HD, 120)])],
  pocket4k: [...brawOf([3, 5, 8, 12, ...BRAW_Q], POCKET4K), ...pr(["ProRes 422 HQ", "ProRes 422", "ProRes 422 LT"], [m(DCI, 60), m(UHD, 60), m(HD, 120)])],
  pocket6k: [...brawOf([3, 5, 8, 12, ...BRAW_Q], POCKET6K), ...pr(["ProRes 422 HQ", "ProRes 422", "ProRes 422 LT"], [m(DCI, 60), m(UHD, 60), m(HD, 120)])],
  ronin4d: [{ n: "ProRes RAW HQ", t: "bpp", v: 4.0, m: R4D }, { n: "ProRes RAW", t: "bpp", v: 2.5, m: R4D }, ...pr(["ProRes 422 HQ", "ProRes 422", "ProRes 422 LT"], R4D)]
};
/* which recording profile a camera from the catalog uses, by its name */
const REC_OF = [[/alexa 35 (xtreme|extreme)/i, "alexa35xtreme"], [/alexa 35/i, "alexa35"], [/alexa mini lf/i, "miniLF"], [/alexa mini/i, "mini"], [/amira/i, "amira"], [/alexa (plus|ev|classic|xt\b)/i, "alexaClassic"],
  [/venice 2/i, "venice2"], [/venice/i, "venice"], [/burano/i, "burano"], [/fx9/i, "fx9"], [/fx6/i, "fx6"], [/fs7/i, "fs7"], [/fs5/i, "fs5"],
  [/fx3|fx30|fx2\b|a7s (mark )?iii|a7s3|a7 iv|a7iv/i, "sonySI"], [/a7s (mark )?ii\b|alpha a7s$|a7 (mark )?iii|alpha a7 mark iii/i, "sonyS"],
  [/komodo/i, "komodo"], [/helium/i, "helium"], [/dragon/i, "dragon"],
  [/c400/i, "c400"], [/c500 mark ii/i, "c500"], [/c80\b/i, "c80"], [/c70\b/i, "c70"], [/c300 mark ii/i, "c300ii"], [/c300\b/i, "c300"],
  [/pyxis 6k/i, "pyxis6k"], [/pyxis 12k/i, "pyxis12k"], [/ursa mini pro 12k/i, "ursa12k"], [/ursa mini pro 4\.6k/i, "ursa46"], [/pocket cinema camera 4k/i, "pocket4k"], [/pocket cinema camera 6k/i, "pocket6k"],
  [/ronin 4d/i, "ronin4d"]];
const recProfile = name => { const hit = REC_OF.find(([re]) => re.test(name || "")); return hit ? REC[hit[1]] || null : null; };
/* bytes a second for one codec and mode at a frame rate */
function recRate(c, md, fps) {
  const px = md[1] * md[2], v = md[4];
  switch (c.t) {
    case "B": return v * fps;
    case "bpp": return px * c.v / 8 * fps;
    case "pr": return px * (px <= 2.5e6 ? c.v[0] : c.v[1]) / 8 * fps;
    case "braw": return ((px * 1.5 / c.v[0] + px * 1.5 / c.v[1]) / 2 + 4000) * fps + 288000;
    case "red": { const raw = px * 14 / 8 * fps, out = /^REDCODE \d/.test(c.n) ? 300e6 : 280e6; return Math.min(raw / c.v, out) * 1.05; }
    case "M25": return v * 1e6 / 8 * fps / 25;
    case "M24": return v * 1e6 / 8 * fps / 23.976;
    case "Mfix": { const band = v.find(b => fps <= b[0]) || v[v.length - 1]; return band[1] * 1e6 / 8; }
  }
  return 0;
}
/* how many bytes a card holds for footage: Codex drives as ARRI gives them, other cards about 94% of the size on the label */
function cardBytes(name, gb) {
  if (/codex compact/i.test(name || "")) return /2\s*TB|1920/i.test(name) ? 1875369984000 : 937687040000;
  const g = gb || capGB(name) || (/AXS-?A?(\d{3,4})/i.exec(name || "") || [])[1] * 1 || (/(\d{2,4})\s*G\b/i.exec(name || "") || [])[1] * 1 || 0;
  return g ? g * 1e9 * 0.94 : 0;
}
const REC_FPS = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 72, 75, 90, 96, 100, 120, 150, 180, 200, 240];
const fpsLabel = f => f === 23.976 ? "23.98" : String(f);
function fmtDur(sec) { const mins = Math.floor(sec / 60); if (mins < 60) return `${mins} min`; const h = Math.floor(mins / 60), r = mins % 60; return r ? `${h} h ${r} min` : `${h} h`; }
/* the cards that fit a camera, in its rental house: one of each card the camera takes */
function cardChoices(e, houseId) {
  const types = (e && e.it.camera && e.it.camera.media) || [], out = [];
  for (const type of types) for (const [id, x] of ITEM) if (x.h.id === houseId && x.s.id === "media" && grpOf(x.it, x.s) === type) out.push({ id, name: x.it.name, type });
  return out;
}
/* what a camera's cards hold at its recording format: per card and all together */
function recResult(l, e) {
  const prof = recProfile(e ? e.it.name : l.name), r = l.rec;
  const card = r && r.card ? (ITEM.get(r.card)?.it.name || "") : "";
  const bytes = card ? cardBytes(card, r.gb) : 0;
  let rate = 0, c = null, md = null;
  if (r && r.mbps) rate = r.mbps * 1e6 / 8;
  else if (prof && r) {
    c = prof.find(x => x.n === r.codec) || null; md = c && (c.m.find(x => x[0] === r.mode) || null);
    if (md) rate = recRate(c, md, r.fps);
  }
  const per = rate && bytes ? bytes / rate : 0;
  return { prof, c, md, rate, bytes, per, card };
}
function shortName(n) { return n.replace(/\s+(Digital Motion Picture Camera|Cinema Camera|Camera).*$/i, "").slice(0, 40); }
/* what the defaults just added, for the notice: [{ label, qty, why }] */
let lastAutoAdds = [];
function applyDefaults(p) {
  // cards added with a camera (a short-lived way of doing it) stay on the list as ordinary lines
  for (const l of Object.values(p.items)) if (l.cards) { const c = l.cards.id && p.items[l.cards.id]; if (c && c.auto) { c.auto = 0; delete c.autoWhy; } delete l.cards; }
  const want = new Map();
  lastAutoAdds = [];
  for (const [id, l] of Object.entries(p.items)) {
    const e = ITEM.get(id);
    const manual = lineQty(l) - (l.auto || 0);  // only what you added yourself sets off defaults, never what they added
    if (!e || manual <= 0) continue;
    for (const r of app.settings.rules) if ((r.kind === "item" || l.section === "camera") && ruleMatches(r, e)) {
      const t = resolveTarget(r, e, p.houseId);
      const w = want.get(t.id) || { qty: 0, why: [], label: t.label };
      w.qty += manual * r.qty;
      w.why.push(`${r.qty} per ${shortName(e.it.name)}`);
      want.set(t.id, w);
      // one card reader for each kind of card on the list
      if (r.kind === "media") { const rd = resolveReader(t.type, p.houseId); if (rd && !want.has(rd.id)) want.set(rd.id, { qty: 1, why: [`for the ${t.type} cards`], label: rd.label }); }
    }
  }
  // a matching card reader for each kind of card on the list, once (unless taken off this list)
  if (app.settings.readers) {
    const kinds = new Set();
    for (const id of new Set([...Object.keys(p.items), ...want.keys()])) { const e = ITEM.get(id); if (e && e.s.id === "media" && ((p.items[id] && lineQty(p.items[id]) > 0) || (want.get(id) || {}).qty > 0)) kinds.add(grpOf(e.it, e.s)); }
    for (const type of kinds) {
      if (!type || (p.readerOff || {})[type]) continue;
      const rd = resolveReader(type, p.houseId) || { id: "auto-reader-" + flat(type), label: type + " card reader" };
      if (!want.has(rd.id)) want.set(rd.id, { qty: 1, why: [`for the ${type} cards`], label: rd.label });
    }
  }
  const changed = [];
  for (const [id, l] of Object.entries(p.items)) if (l.auto && !want.has(id)) {
    l.qty = Math.max(0, l.qty - l.auto); l.auto = 0; delete l.autoWhy; changed.push(id);
    if (l.qty <= 0) delete p.items[id];
  }
  for (const [id, w] of want) {
    let l = p.items[id];
    if (!l) {
      l = ITEM.has(id) ? { ...lineFromCatalog(id), qty: 0 } : { qty: 0, note: "", name: w.label, brand: "", section: id.startsWith("auto-card-") || id.startsWith("auto-reader-") ? "media" : "power", cat: "", sub: "", custom: true, added: Date.now(), children: [] };
      p.items[id] = l;
    }
    const old = l.auto || 0;
    l.qty = Math.max(0, l.qty - old + w.qty); l.auto = w.qty; l.autoWhy = [...new Set(w.why)].join(", ");
    if (l.tx !== undefined) { l.sets = l.qty; if (!old) { l.tx = l.qty; l.rx = l.qty; } }
    if (l.qty <= 0) delete p.items[id];
    if (old !== w.qty) changed.push(id);
    if (w.qty > old) lastAutoAdds.push({ label: w.label, qty: w.qty - old, why: w.why[0] || "" });
  }
  return changed;
}
/* a notice slides in when defaults add something: what, and why */
function notifyDefaults(adds) {
  if (!adds || !adds.length || typeof document === "undefined") return;
  let n = document.getElementById("notice");
  if (!n || !n.classList || !document.body || !document.body.appendChild) return;
  const list = adds.slice(0, 4).map(a => `<li><b class="num">${a.qty}×</b> ${esc(a.label)}</li>`).join("") + (adds.length > 4 ? `<li>+ ${adds.length - 4} more</li>` : "");
  n.innerHTML = `<span class="nt-ico" aria-hidden="true">✦</span><div><b>Added with the package</b><ul>${list}</ul></div><button class="x" type="button" data-act="notice-close" aria-label="Close">×</button>`;
  n.hidden = false; n.classList.remove("in"); void n.offsetWidth; n.classList.add("in");
  clearTimeout(notifyDefaults._t); notifyDefaults._t = setTimeout(() => { n.classList.remove("in"); setTimeout(() => { if (!n.classList.contains("in")) n.hidden = true; }, 320); }, 4200);
}

/* two items that don't work together (an ARRI Amira has no radio inside, so its cforce mini has to be the RF one):
   when a list has one of each you're told why, and can swap in what works or keep both */
const clashRules = () => app.settings.clashes || (app.settings.clashes = []);
const itName = id => { const e = ITEM.get(id); return e ? e.it.name : "(no longer in the catalog)"; };
function clashIssues(p) {
  const out = [], ok = p.clashOk || {};
  for (const r of app.settings.clashes || []) {
    const a = r.a.filter(id => p.items[id]), b = r.b.filter(id => p.items[id]);
    if (a.length && b.length && !ok[r.id]) out.push({ r, a, b });
  }
  return out;
}
/* "keep both" lasts while both stay on the list: take one off and add it again, and you're told again */
function clashSettle(p) {
  if (!p.clashOk) return;
  for (const rid of Object.keys(p.clashOk)) { const r = (app.settings.clashes || []).find(x => x.id === rid); if (!r || !(r.a.some(x => p.items[x]) && r.b.some(x => p.items[x]))) delete p.clashOk[rid]; }
}
const clashPair = i => `<strong>${esc(i.a.map(itName).join(", "))}</strong> + <strong>${esc(i.b.map(itName).join(", "))}</strong>`;
function clashActs(i, inModal) {
  const sw = i.r.swap && ITEM.has(i.r.swap)
    ? `<button class="btn ${inModal ? "primary" : "sm"}" type="button" data-act="clash-swap" data-rid="${esc(i.r.id)}">Swap for ${esc(shortName(itName(i.r.swap)))}</button>`
    : `<button class="btn ${inModal ? "primary" : "sm"}" type="button" data-act="clash-drop" data-rid="${esc(i.r.id)}">Remove ${esc(i.b.map(x => shortName(itName(x))).join(", "))}</button>`;
  const keep = `<button class="btn${inModal ? "" : " ghost sm"}" type="button" data-act="clash-keep" data-rid="${esc(i.r.id)}">Keep both</button>`;
  return inModal ? `<div class="modal-actions">${keep}<span class="grow"></span>${sw}</div>` : `<div class="wb-acts">${sw}${keep}</div>`;
}
/* just added something that clashes with what's on the list: say so */
function clashPrompt(p, ids) {
  const i = clashIssues(p).find(x => ids.some(id => x.a.includes(id) || x.b.includes(id)));
  if (!i) return false;
  buzz("warn");
  showModal(`<h3>Doesn't work together</h3><p>${clashPair(i)}</p>${i.r.why ? `<p>${esc(i.r.why)}</p>` : ""}${clashActs(i, true)}`);
  return true;
}
/* swap: the other item goes, what works comes in at the same quantity, with its note */
function clashSwap(p, rid) {
  const r = (app.settings.clashes || []).find(x => x.id === rid);
  if (!r || !ITEM.has(r.swap)) return [];
  let n = 0, note = "";
  for (const id of r.b) { const l = p.items[id]; if (!l) continue; n += lineQty(l); if (!note && l.note) note = l.note; delete p.items[id]; }
  const had = p.items[r.swap];
  const ids = [...r.b, ...setQty(p, r.swap, (had ? lineQty(had) : 0) + Math.max(1, n))];
  if (!had && note && p.items[r.swap] && !p.items[r.swap].note) p.items[r.swap].note = note;
  return ids;
}
function clashDrop(p, rid) {
  const r = (app.settings.clashes || []).find(x => x.id === rid);
  if (!r) return [];
  for (const id of r.b) delete p.items[id];
  const ids = [...r.b, ...applyDefaults(p)]; clashSettle(p); touch(p);
  return ids;
}

/* coverage check */
function coverageIssues(p) {
  const cams = [], lenses = [];
  for (const [id, l] of Object.entries(p.items)) {
    const e = ITEM.get(id);
    if (!e) continue;
    if (e.it.camera && e.it.camera.lensCheck && COV_RANK[e.it.camera.sensor] !== undefined) cams.push({ id, e });
    if (e.it.lens && e.it.lens.coverage && COV_RANK[e.it.lens.coverage] !== undefined) lenses.push({ id, e });
  }
  const out = [];
  for (const c of cams) {
    const small = lenses.filter(x => COV_RANK[x.e.it.lens.coverage] < COV_RANK[c.e.it.camera.sensor]);
    if (small.length) out.push({ cam: c, lenses: small });
  }
  return out;
}
function issueText(i) {
  const cs = i.cam.e.it.camera;
  return `${i.cam.e.it.name} is ${COV_LABEL[cs.sensor] || cs.sensor}, but ${i.lenses.map(x => `${x.e.it.name} (${COV_LABEL[x.e.it.lens.coverage] || x.e.it.lens.coverage})`).join(", ")} ${i.lenses.length === 1 ? "covers" : "cover"} a smaller image circle.`;
}
function coverageAlert(p, id) {
  const e = ITEM.get(id);
  if (!e || !(e.it.lens || e.it.camera)) return "";
  const issues = coverageIssues(p).filter(i => i.cam.id === id || i.lenses.some(x => x.id === id));
  if (!issues.length) return "";
  return `<h3>Coverage warning</h3>${issues.map(i => `<p>${esc(issueText(i))}</p>`).join("")}
    <p class="hint">Expect vignetting unless you shoot a cropped mode (for example S35 on a full-frame camera).</p>`;
}
function showModal(html) {
  document.getElementById("modal")?.remove();
  const m = document.createElement("div");
  m.className = "modal"; m.id = "modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
  m.innerHTML = `<div class="modal-card">${html}</div>`;
  document.body.appendChild(m);
  fitToKeyboard();
  m.querySelector(".btn.primary")?.focus();
  navSync();
}
/* a dialog stays above the on-screen keyboard: it takes only the part of the screen the keyboard leaves, and the field being typed in scrolls into view */
function fitToKeyboard() {
  const vv = window.visualViewport, m = document.getElementById("modal");
  if (!vv || !m) return;
  m.style.top = vv.offsetTop + "px"; m.style.height = vv.height + "px"; m.style.bottom = "auto";
  m.classList.toggle("kb", window.innerHeight - vv.height > 120);
}
if (window.visualViewport) window.visualViewport.addEventListener("resize", () => document.body.classList.toggle("kb-up", window.innerHeight - window.visualViewport.height > 120));
if (window.visualViewport) { window.visualViewport.addEventListener("resize", fitToKeyboard); window.visualViewport.addEventListener("scroll", fitToKeyboard); }
document.addEventListener("focusin", e => {
  const t = e.target;
  if (!t || !t.closest || !t.closest("#modal") || !/^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
  setTimeout(() => { if (document.activeElement === t) { fitToKeyboard(); t.scrollIntoView({ block: "nearest" }); } }, 320);
});
function closeModal() { const m = document.getElementById("modal"); if (m) { m.remove(); navSync(); } }

/* the phone's back button steps back through the app (the standalone app only): a dialog, the preview, the lens finder,
   an open line, selecting several, then up a screen. On the productions screen it leaves the app. */
const NAV = { on: false, guard: false, skip: false };
try { NAV.on = !!window.AC_CONFIG && !!window.history && typeof history.pushState === "function"; } catch (e) {}
const navDeep = () => !!(document.getElementById("modal") || document.getElementById("preview") || app.sel || !["home", "welcome"].includes(app.view));
function navSync() {
  if (!NAV.on || NAV.skip) return;
  const deep = navDeep();
  try {
    if (deep && !NAV.guard) { history.pushState({ ac: 1 }, ""); NAV.guard = true; }
    else if (!deep && NAV.guard) { NAV.guard = false; NAV.skip = true; history.back(); }  // back on the first screen: drop the extra step
  } catch (e) {}
}
function stepBack() {
  if (document.getElementById("modal")) { closeModal(); return; }
  if (document.getElementById("preview")) { closePreview(); return; }
  if (app.view === "production" && app.tab === "add" && fin().on) { fin().on = false; render(); return; }
  if (app.view === "production" && app.editing) { app.editing = null; rerenderKeepScroll(); return; }
  if (app.sel) { app.sel = null; render(); return; }
  if (app.view === "form") {
    const ed = app.formFor && app.productions.some(x => x.id === app.formFor);
    app.view = ed ? "production" : "home"; app.pid = ed ? app.formFor : null; app.dupFrom = null;
    render(); window.scrollTo(0, 0); return;
  }
  if (app.view === "settings" && app.setFrom && app.productions.some(x => x.id === app.setFrom)) { app.pid = app.setFrom; app.setFrom = null; app.view = "production"; render(); window.scrollTo(0, 0); return; }
  if (app.view !== "home") { app.view = "home"; app.pid = null; app.editing = null; app.lq = ""; app.setFrom = null; render(); window.scrollTo(0, 0); }
}
window.addEventListener("popstate", () => {
  if (!NAV.on) return;
  if (NAV.skip) { NAV.skip = false; navSync(); return; }
  NAV.guard = false; NAV.skip = true;
  try { stepBack(); } finally { NAV.skip = false; }
  navSync();
});

/* motors for a hand unit: the items in the house's Motors group */
const MOTOR_HOST = /\bhi-?5\b|\bwcu-?\d\b|wireless compact unit/i;
function motorsFor(h) {
  const out = [];
  for (const e of ITEM.values()) {
    if (e.h !== h) continue;
    const g = grpOf(e.it, e.s);
    if (g === "Motors" || (e.s.id === "follow_focus" && /\bmotor\b|cforce|\bclm-?\d/i.test(e.it.name) && !/controller|zoom/i.test(e.it.name))) out.push(e);
  }
  return out.sort((a, b) => a.ord - b.ord);
}
function motorPicker(p, hostId) {
  const e = ITEM.get(hostId); if (!e) return;
  const list = motorsFor(e.h);
  if (!list.length) return;
  showModal(`<form class="form dialog" id="motorForm" data-host="${esc(hostId)}" autocomplete="off">
    <h3 class="plain">Motors for ${esc(e.it.name)}</h3>
    <p class="hint">Which motors go with it? Pick how many of each, for focus, iris and zoom.</p>
    <ul class="pick-list">${list.map(m => `<li><span class="info"><span class="nm-row"><span class="nm">${esc(m.it.name)}</span>${linkHtml(m.it, m.h)}</span><span class="specs">${p.items[m.it.id] ? `<span>${lineQty(p.items[m.it.id])} already on the list</span>` : ""}</span></span>
      <span class="stepper sm"><button type="button" data-act="pk-dec" data-id="${esc(m.it.id)}" aria-label="Fewer">−</button><input type="number" min="0" max="9" inputmode="numeric" value="0" data-pick="${esc(m.it.id)}" aria-label="${esc(m.it.name)} to add"><button type="button" data-act="pk-inc" data-id="${esc(m.it.id)}" aria-label="More">+</button></span></li>`).join("")}</ul>
    <div class="modal-actions"><button class="btn" type="button" data-act="modal-close">Skip</button><span class="grow"></span><button class="btn primary" type="submit">Add motors</button></div>
  </form>`);
}

/* quantity changes */
function setQty(p, id, qty, field) {
  qty = clampQ(qty);
  const wasNew = !p.items[id];
  const und = !wasNew && qty === 0 && !field ? snapItems(p) : null, gone = und ? p.items[id].name : "";
  let l = p.items[id];
  if (!l) {
    if (qty === 0 || !ITEM.has(id)) return [];
    l = p.items[id] = lineFromCatalog(id);
    if (l.tx !== undefined) { l.sets = qty; l.tx = qty; l.rx = qty; }
    else l.qty = qty;
  } else if (field && l.tx !== undefined) {
    l[field] = qty;  // TX and RX are counted on their own; the sets stay as they are
  } else if (l.tx !== undefined) {  // another set (or one less) brings one TX and one RX with it
    const d = qty - lineQty(l);
    l.sets = qty; l.tx = Math.max(0, (l.tx || 0) + d); l.rx = Math.max(0, (l.rx || 0) + d);
    if (qty === 0) delete p.items[id];
  } else {
    l.qty = qty;
    if (qty === 0) delete p.items[id];
  }
  if (p.items[id]) p.items[id].qty = lineQty(p.items[id]);
  const changed = [id];
  changed.push(...applyDefaults(p));
  clashSettle(p);
  const adds = lastAutoAdds;
  touch(p);
  const cov = wasNew && p.items[id] ? coverageAlert(p, id) : "";
  if (cov) {
    const e = ITEM.get(id);
    showModal(cov + `<div class="modal-actions"><button class="btn" type="button" data-act="modal-undo" data-id="${esc(id)}">Remove ${esc(shortName(e.it.name))}</button><button class="btn primary" type="button" data-act="modal-close">Keep it</button></div>`);
  }
  const clash = !cov && wasNew && !!p.items[id] && typeof document !== "undefined" && !document.getElementById("modal") ? clashPrompt(p, [id]) : false;
  delete p._w;
  notifyDefaults(adds);
  // an ARRI hand unit (Hi-5, WCU-4) needs motors: ask which ones
  if (wasNew && p.items[id] && !cov && !clash && MOTOR_HOST.test(ITEM.get(id)?.it.name || "")) motorPicker(p, id);
  if (und && !p.items[id]) undoable("Removed", gone, und);
  else if (wasNew && p.items[id] && !cov && !clash) buzz("add");
  return changed;
}

/* favorites */
const favKeyCustom = (name, section) => "c:" + flat(name) + ":" + section;
function isFav(key) { return !!app.settings.favorites[key]; }
function toggleFav(key, info) {
  if (app.settings.favorites[key]) delete app.settings.favorites[key];
  else app.settings.favorites[key] = info;
  touchSettings();
}
function starBtn(key, info) {
  const on = isFav(key);
  return `<button class="star" type="button" data-act="star" data-key="${esc(key)}" data-name="${esc(info.name)}" data-section="${esc(info.section)}" aria-pressed="${on}" aria-label="${on ? "Remove from favorites" : "Add to favorites"}">${on ? "★" : "☆"}</button>`;
}

/* light / dark: Auto follows the device (or the page host); Light and Dark are kept on this device */
const THEME_ICONS = {
  auto: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>`,
  light: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  dark: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>` };
const THEME_NAMES = { auto: "Auto (follows your device)", light: "Light", dark: "Dark" };
const theme = { pref: "light", host: document.documentElement ? document.documentElement.getAttribute("data-theme") : null };
try { const v = localStorage.getItem("acTheme"); if (v === "light" || v === "dark" || v === "auto") theme.pref = v; } catch (err) {}
function applyTheme() {
  const root = document.documentElement; if (!root || !root.setAttribute) return;
  const want = theme.pref === "auto" ? theme.host : theme.pref;
  if (want) { if (root.getAttribute("data-theme") !== want) root.setAttribute("data-theme", want); } else root.removeAttribute("data-theme");
  const b = document.getElementById("themeBtn");
  if (b) { b.innerHTML = THEME_ICONS[theme.pref]; b.setAttribute("aria-label", "Theme: " + THEME_NAMES[theme.pref] + ". Tap to change."); b.title = "Theme: " + THEME_NAMES[theme.pref]; }
}
function setTheme(v) {
  if (!["light", "dark", "auto"].includes(v)) return;
  theme.pref = v; try { localStorage.setItem("acTheme", v); } catch (err) {}
  applyTheme();
}
function cycleTheme() {
  theme.pref = theme.pref === "light" ? "dark" : theme.pref === "dark" ? "auto" : "light";
  try { localStorage.setItem("acTheme", theme.pref); } catch (err) {}
  applyTheme(); toast(THEME_NAMES[theme.pref]);
}
// if the page host changes its theme later, remember it for Auto, and keep the user's own choice when they made one
if (typeof MutationObserver !== "undefined" && document.documentElement && document.documentElement.setAttribute) new MutationObserver(() => {
  const v = document.documentElement.getAttribute("data-theme");
  if (theme.pref === "auto") theme.host = v; else if (v !== theme.pref) { theme.host = v; applyTheme(); }
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
applyTheme();

/* every other row gets a faint shade; the count starts over under each manufacturer or subcategory heading */
function stripe(root) {
  (root || document).querySelectorAll("ul.items, ul.fav-list, ul.lines").forEach(ul => {
    let n = 0;
    for (const li of ul.children) {
      if (li.classList.contains("mfr-head") || li.classList.contains("fav-head")) { n = 0; continue; }
      if (li.hidden) continue;
      if (li.classList.contains("item") || li.classList.contains("line")) li.classList.toggle("alt", n++ % 2 === 1);
    }
  });
}
if (typeof MutationObserver !== "undefined" && document.body) new MutationObserver(() => { stripe(); const r = document.getElementById("fRuler"); if (r && !r.dataset.c) centerFinder(); }).observe(document.body, { childList: true, subtree: true });

/* ---------- views ---------- */
function houseTheme(id) {
  const r = typeof document !== "undefined" && document.documentElement; if (!r || !r.dataset) return;
  if (id && houseById(id)) r.dataset.house = id; else delete r.dataset.house;
}
function render() {
  const v = document.getElementById("view");
  if (app.view === "welcome" && !needsWelcome()) app.view = "home";
  if (app.view === "welcome") v.innerHTML = viewWelcome();
  else if (app.view === "form") v.innerHTML = viewForm();
  else if (app.view === "settings") v.innerHTML = viewSettings();
  else if (app.view === "production" && cur()) v.innerHTML = viewProduction();
  else { app.view = "home"; v.innerHTML = viewHome(); }
  if (app.view !== "home") { app.sel = null; app.justWelcomed = false; }
  document.body.classList?.toggle("welcome-on", app.view === "welcome");
  document.body.classList?.toggle("nav-on", app.view === "production");
  // a production wears its rental house's color (Utopia orange, Fitussi purple); home and settings stay indigo
  const hp = app.view === "form" ? document.getElementById("housePick") : null;
  houseTheme(app.view === "production" && cur() ? cur().houseId : hp ? hp.dataset.value : "");
  document.body.classList?.toggle("finder-on", app.view === "production" && app.tab === "add" && fin().on);
  if (app.view === "production" && app.tab === "list") applyListFilter();
  uiSave(); navSync();
}

/* a list's gear by section, as a thin bar of their colors (how much camera, lens, support...) */
function mixBar(p) {
  const by = linesBySection(p), parts = allSections().map(s => [s, by[s.id].reduce((a, [, l]) => a + lineQty(l), 0)]).filter(([, n]) => n > 0);
  if (!parts.length) return `<span class="mix none" aria-hidden="true"></span>`;
  return `<span class="mix" role="img" aria-label="${esc(parts.map(([s, n]) => `${n} ${secName(s.id)}`).join(", "))}">${parts.map(([s, n]) => `<i style="flex:${n};--tape:${secTape(s)}"></i>`).join("")}</span>`;
}
/* the home page opens with a greeting: the date, and hello by name */
function greetHtml() {
  const first = ((app.settings.me || {}).name || "").trim().split(/\s+/)[0] || "", d = new Date(), hr = d.getHours();
  const hi = hr < 5 ? "Working late" : hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  const who = first ? `, <bdi>${esc(first)}</bdi>` : "";
  const text = app.justWelcomed ? (first ? `Nice to meet you${who}` : "Welcome") : hi + who;
  const date = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return `<div class="greet${app.justWelcomed ? " hello" : ""}"><p class="gr-date">${esc(date)}</p><h2 class="page gr-hi">${text}</h2></div>`;
}
/* the first open: what the app does, and your name for the lists */
const WELCOME_STEPS = [["camera", "Pick the rental house", "Utopia or Fitussi, with its whole catalog"], ["lenses", "Add the gear", "Search, tap, set how many"], ["camera_accessories", "Send the list", "As a PDF or a Word file"]];
function viewWelcome() {
  const a = window.AC_AUTH, u = a && a.user ? a.user() : null, name = (app.settings.me || {}).name || (u && u.name) || "";
  return `<section class="welcome">
    <div class="wl-bars" aria-hidden="true"><div class="wl-top">${[1, 2, 3, 4, 5, 6].map(n => `<i style="--c:var(--b${n});--i:${n - 1}"></i>`).join("")}</div><div class="wl-low">${[6, 5, 4, 3, 2, 1].map((n, i) => `<i style="--c:var(--b${n});--i:${i}"></i>`).join("")}</div></div>
    <div class="wl-text"><h1 class="wl-title">AC Cam List</h1>
    <p class="wl-lead">Camera gear lists from the rental house catalog, ready to send.</p></div>
    <ol class="wl-steps">${WELCOME_STEPS.map(([k, t, s], i) => `<li style="--tape:var(--tape-${k});--i:${i}"><span class="wl-n">${i + 1}</span><span><b>${t}</b><small>${s}</small></span></li>`).join("")}</ol>
    <form class="wl-form" id="welcomeForm" autocomplete="off">
      <div class="field"><label for="wl-name">What's your name?</label><input id="wl-name" name="name" maxlength="80" autocomplete="name" enterkeyhint="go" value="${esc(name)}"></div>
      <span class="hint">It goes on your lists as 1st AC.</span>
      <button class="btn primary wl-go" type="submit">Get started</button>
      ${a && !u ? `<button class="btn ghost wl-in" type="button" data-act="acct-in">Have lists already? Sign in</button>` : ""}
    </form>
  </section>`;
}
function viewHome() {
  const list = app.productions.filter(p => !(p.mainOf && findProd(p.mainOf))).sort((a, b) => Math.max(b.updatedAt || 0, unit2Of(b)?.updatedAt || 0) - Math.max(a.updatedAt || 0, unit2Of(a)?.updatedAt || 0));
  const sel = app.sel;
  if (sel) for (const id of [...sel]) if (!app.productions.some(p => p.id === id)) sel.delete(id);
  const cards = list.map(p => {
    const t = totals(p), h = houseById(p.houseId);
    const when = fmtRange(p.shootStart, p.shootEnd), on = !!(sel && sel.has(p.id));
    const st = prodStatus(p) || (unit2Of(p) && prodStatus(unit2Of(p)));
    return `<li><button class="prod-card${sel ? " picking" : ""}${on ? " picked" : ""}" type="button" data-act="${sel ? "pick-prod" : "open"}" data-lp="prod" data-id="${esc(p.id)}"${sel ? ` aria-pressed="${on}"` : ""}>
      ${sel ? `<span class="pick" aria-hidden="true">${on ? "✓" : ""}</span>` : ""}<span class="pc-top"><b>${esc(p.name || "Untitled production")}</b>${p.docVer ? `<span class="pc-ver">Version ${p.docVer}</span>` : ""}</span>
      ${st ? `<span class="pc-status ${st.k}">${esc(st.t)}</span>` : ""}<span class="meta">${h ? `<span class="pc-house" data-house="${esc(h.id)}">${esc(h.name)}</span>` : ""}${unit2Of(p) ? `<span class="unit-tag">+ 2nd Unit</span>` : ""}${when ? `<span>Shoot ${esc(when)}</span>` : ""}<span><span class="num">${t.lines}</span> items · <span class="num">${t.pcs}</span> pcs</span></span>
      ${mixBar(p)}
    </button></li>`;
  }).join("");
  const n = sel ? sel.size : 0;
  const selDock = sel ? `<div class="dock pad sel-dock"><div class="dock-in"><span class="summary-line"><b class="num">${n}</b> selected</span>
    <span class="grp"><button class="btn" type="button" data-act="sel-dup" ${n ? "" : "disabled"}>Duplicate</button><button class="btn danger" type="button" data-act="sel-del" ${n ? "" : "disabled"}>Delete</button><button class="btn ghost" type="button" data-act="sel-cancel">Cancel</button></span></div></div>` : "";
  return `<section class="pad">
    ${greetHtml()}
    ${list.length ? `<div class="home-head"><h3 class="home-sec">Productions <span class="num">${list.length}</span></h3>${sel ? `<span class="hint">Tap productions to select them</span>` : `<button class="btn primary" type="button" data-act="new">+ New production</button>`}</div>` : ""}
    ${list.length ? `<ul class="prod-list">${cards}</ul>${sel ? "" : `<p class="hint lp-hint">Press and hold a production to duplicate it, delete it, or select several.</p>`}` :
    `<div class="empty-state"><h3>Start your first equipment list</h3>
      <p>Create a production, pick the rental house you're working with, then add gear from their catalog with a quantity for each item. Send the finished list as a PDF or a Word file.</p>
      <button class="btn primary" type="button" data-act="new">+ New production</button></div>`}
  </section>${selDock}`;
}
/* press and hold a production: duplicate, delete, or start selecting several */
function prodMenu(id) {
  const p = app.productions.find(x => x.id === id); if (!p) return;
  try { navigator.vibrate && navigator.vibrate(12); } catch (e) {}
  showModal(`<div class="sheet"><h3 class="plain">${esc(p.name || "Untitled production")}</h3>
    <div class="sheet-acts"><button class="btn" type="button" data-act="pm-edit" data-id="${esc(id)}">Edit details</button><button class="btn" type="button" data-act="pm-dup" data-id="${esc(id)}">Duplicate</button>
      <button class="btn" type="button" data-act="pm-select" data-id="${esc(id)}">Select several</button>
      <button class="btn danger" type="button" data-act="pm-del" data-id="${esc(id)}">Delete</button>
      <button class="btn ghost" type="button" data-act="modal-close">Cancel</button></div></div>`);
}
function deleteProductions(ids) {
  const set = new Set(ids);
  for (const id of ids) { const x = findProd(id); if (x && x.unit2) set.add(x.unit2); }  // a production goes with its 2nd Unit
  app.productions = app.productions.filter(x => !set.has(x.id));
  lsSave(); for (const id of set) removeRemote(id);
}
/* a copy of a production, and of its 2nd Unit when it has one */
function dupWithUnit(src, fields) {
  const c = copyProduction(src, fields); delete c.unit2; app.productions.push(c); touch(c);
  const q = unit2Of(src);
  if (q) { const cq = copyProduction(q, { name: c.name, company: c.company, mainOf: c.id }); app.productions.push(cq); c.unit2 = cq.id; touch(cq); }
  return c;
}
/* the 2nd Unit's list: a copy of the main one, or empty */
function unit2StartDialog(p) {
  const n = totals(p).lines;
  showModal(`<div class="sheet"><h3 class="plain">Start the 2nd Unit list</h3><p class="hint">The main list has ${n} item${n === 1 ? "" : "s"}. The 2nd Unit's list is often close to it.</p>
    <div class="sheet-acts"><button class="btn primary" type="button" data-act="u2-copy" data-id="${esc(p.id)}">Copy the Main Unit list</button>
      <button class="btn" type="button" data-act="u2-empty" data-id="${esc(p.id)}">Start empty</button></div></div>`);
}
function startDuplicate(id) {
  if (!app.productions.some(x => x.id === id)) return;
  app.sel = null; app.dupFrom = id; app.formFor = null; app.view = "form"; render(); window.scrollTo(0, 0);
  document.getElementById("f-name")?.select();
}
/* the standalone app's account line: who is signed in, or why to sign in (inside Claude there is nothing to show) */
/* the account, as one button in the corner of Settings: Sign out, or Sign in once signed out */
function accountHtml() {
  const a = window.AC_AUTH; if (!a) return "";
  const u = a.user();
  return u ? `<button class="btn sm" type="button" data-act="acct-out" title="${esc("Signed in as " + (u.name || u.email || "you"))}">Sign out</button>`
    : `<button class="btn sm" type="button" data-act="acct-in" title="Sign in with Google to keep your lists on every device">Sign in</button>`;
}

const findProd = id => id ? app.productions.find(p => p.id === id) || null : null;
/* a production with a 2nd Unit is two lists: the main one (p.unit2 points to the other) and the 2nd Unit's (q.mainOf points back) */
const mainOf = p => (p && p.mainOf && findProd(p.mainOf)) || p;
const unit2Of = p => { const m = mainOf(p); return m && m.unit2 ? findProd(m.unit2) : null; };
const otherUnit = p => !p ? null : p.mainOf ? findProd(p.mainOf) : p.unit2 ? findProd(p.unit2) : null;
function viewForm() {
  const editing = app.formFor ? mainOf(findProd(app.formFor)) : null;
  const src = !editing && app.dupFrom ? app.productions.find(p => p.id === app.dupFrom) : null;
  const me = app.settings.me || {};
  const p = editing || (src ? { ...src, name: (src.name || "Production") + " (copy)" } : newProduction({ ac: me.name || "", acPhone: me.phone || "" }));
  const hasItems = (editing || src) && totals(editing || src).lines > 0;
  const houses = HOUSES.map(h => `<button class="house-opt" type="button" data-act="pick-house" data-house="${h.id}" aria-pressed="${h.id === p.houseId}" ${hasItems && h.id !== p.houseId ? "disabled" : ""}><b>${esc(h.name)}</b><span><span class="num">${houseCount(h)}</span> items in catalog</span></button>`).join("");
  // an old list with a typed-in day count keeps it until its dates are picked again
  const days = p.shootDays && !Object.keys(p.days || {}).length ? null : p.days || {};
  const back = editing ? `data-act="open" data-id="${esc(app.pid && findProd(app.pid) ? app.pid : editing.id)}" data-keep="1"` : `data-act="home" data-id=""`;
  const u2 = unit2Of(editing || src), u2same = u2 ? u2.sameDates !== false : true, u2days = u2 && u2.days || {};
  return `<section class="pad">
    <div class="prod-head"><button class="btn ghost back" type="button" ${back}>← ${editing ? "Back to list" : "Productions"}</button>
    <h2 class="page">${editing ? "Production details" : src ? "Duplicate production" : "New production"}</h2>
    ${src ? `<p class="hint" style="margin:0">A copy of ${esc(src.name || "the production")} with all ${totals(src).lines} items. Nothing is made until you tap Create.</p>` : ""}</div>
    <form class="form" id="prodForm" autocomplete="off">
      <div class="row2">
        <div class="field"><label for="f-name">Production</label><input id="f-name" name="name" required value="${esc(p.name)}"></div>
        <div class="field"><label for="f-company">Production company</label><input id="f-company" name="company" value="${esc(p.company)}"></div>
      </div>
      <div class="field"><span class="lbl" id="house-lbl">Rental house</span><div class="house-pick" id="housePick" role="group" aria-labelledby="house-lbl" data-value="${esc(p.houseId || "")}">${houses}</div>
        <span class="err" id="houseErr" hidden>Pick the rental house this list is for.</span>
        ${hasItems ? `<span class="hint">The rental house is locked while the list has items, since each list uses that house's catalog.</span>` : ""}</div>
      <div class="row3">
        <div class="field"><label for="f-dp">DP</label><input id="f-dp" name="dp" value="${esc(p.dp)}"></div>
        <div class="field"><label for="f-ac">1st AC</label><input id="f-ac" name="ac" value="${esc(p.ac)}"></div>
        <div class="field"><label for="f-acphone">1st AC phone</label><input id="f-acphone" name="acPhone" type="tel" inputmode="tel" value="${esc(p.acPhone)}"></div>
      </div>
      <div class="row-dates">
        <div class="field"><span class="lbl" id="prep-lbl">Prep day</span>
          <button class="date-btn" type="button" data-act="cal-open" data-mode="prep" id="f-prepbtn" aria-labelledby="prep-lbl f-prepbtn">${prepBtnHtml(p.prep)}</button>
          <input type="hidden" name="prep" id="f-prep" value="${esc(p.prep)}"></div>
        <div class="field"><span class="lbl" id="dates-lbl">Shoot days</span>
          <button class="date-btn" type="button" data-act="cal-open" data-mode="shoot" id="f-dates" aria-labelledby="dates-lbl f-dates">${datesBtnHtml(p.shootStart, p.shootEnd, days, p.shootDays)}</button>
          <input type="hidden" name="shootStart" id="f-start" value="${esc(p.shootStart)}"><input type="hidden" name="shootEnd" id="f-end" value="${esc(p.shootEnd)}">
          <input type="hidden" name="days" id="f-days" value="${esc(days ? JSON.stringify(days) : "")}"><input type="hidden" name="shootDays" id="f-ndays" value="${esc(days ? "" : p.shootDays)}"></div>
      </div>
      <div class="u2">
        <label class="check u2-on"><input type="checkbox" name="u2on" id="f-u2on" ${u2 ? "checked" : ""}><b>Add 2nd Unit</b></label>
        <div class="u2-body" id="u2Body" ${u2 ? "" : "hidden"}>
          <span class="hint">A second list for this production, with its own camera crew. You can start it as a copy of the main list.</span>
          <div class="row3">
            <div class="field"><label for="f-u2dp">2nd Unit DP</label><input id="f-u2dp" name="u2_dp" value="${esc(u2 ? u2.dp : "")}"></div>
            <div class="field"><label for="f-u2ac">2nd Unit 1st AC</label><input id="f-u2ac" name="u2_ac" value="${esc(u2 ? u2.ac : "")}"></div>
            <div class="field"><label for="f-u2acphone">1st AC phone</label><input id="f-u2acphone" name="u2_acPhone" type="tel" inputmode="tel" value="${esc(u2 ? u2.acPhone : "")}"></div>
          </div>
          <label class="check"><input type="checkbox" name="u2_same" id="f-u2same" ${u2same ? "checked" : ""}>Same dates as the Main Unit</label>
          <div class="row-dates" id="u2Dates" ${u2same ? "hidden" : ""}>
            <div class="field"><span class="lbl" id="u2prep-lbl">2nd Unit prep day</span>
              <button class="date-btn" type="button" data-act="cal-open" data-mode="prep" data-target="u2" id="f-u2-prepbtn" aria-labelledby="u2prep-lbl f-u2-prepbtn">${prepBtnHtml(u2 && !u2same ? u2.prep : "")}</button>
              <input type="hidden" name="u2_prep" value="${esc(u2 && !u2same ? u2.prep : "")}"></div>
            <div class="field"><span class="lbl" id="u2dates-lbl">2nd Unit shoot days</span>
              <button class="date-btn" type="button" data-act="cal-open" data-mode="shoot" data-target="u2" id="f-u2-dates" aria-labelledby="u2dates-lbl f-u2-dates">${datesBtnHtml(u2 && !u2same ? u2.shootStart : "", u2 && !u2same ? u2.shootEnd : "", u2days)}</button>
              <input type="hidden" name="u2_shootStart" value="${esc(u2 && !u2same ? u2.shootStart : "")}"><input type="hidden" name="u2_shootEnd" value="${esc(u2 && !u2same ? u2.shootEnd : "")}">
              <input type="hidden" name="u2_days" value="${esc(JSON.stringify(u2 && !u2same ? u2days : {}))}"></div>
          </div>
          <span class="err" id="u2Err" hidden></span>
        </div>
      </div>
      <div class="field"><label for="f-notes">Notes</label><textarea id="f-notes" name="notes" rows="3" class="nt-${p.notesSize || "m"}${p.notesBold ? " nt-b" : ""}" placeholder="Anything the rental house should know. Shown at the bottom of the details on the list.">${esc(p.notes)}</textarea>
        <div class="note-tools"><label class="tog-b" title="Bold"><input type="checkbox" name="notesBold" ${p.notesBold ? "checked" : ""}><span aria-hidden="true">B</span><span class="sr">Bold</span></label>
          <div class="seg sm" role="radiogroup" aria-label="Text size">${[["s", "Small"], ["m", "Normal"], ["l", "Large"]].map(([v, t]) => `<label><input type="radio" name="notesSize" value="${v}" ${(p.notesSize || "m") === v ? "checked" : ""}><span>${t}</span></label>`).join("")}</div></div></div>
      <div class="form-actions">
        <div class="grow"><button class="btn primary" type="submit">${editing ? "Save details" : "Create production"}</button>
        <button class="btn" type="button" ${back}>Cancel</button></div>
        ${editing ? `<button class="btn danger" type="button" data-act="delete" id="delBtn">Delete production${u2 ? " (both units)" : ""}</button>` : ""}
      </div>
    </form>
  </section>`;
}

/* the shoot dates button on the form: the range and how many shoot days it makes */
function datesBtnHtml(a, b, days, typed) {
  if (!a) return `<span class="d-range muted">Pick the first and last shoot day</span><span class="d-n">${CAL_ICON}</span>`;
  const range = b && b !== a ? `${fmtShort(a)} – ${fmtShort(b)}` : fmtShort(a);
  const n = days ? countShootDays(a, b, days) : Number(typed) || countShootDays(a, b, {});
  return `<span class="d-range">${esc(range)}</span><span class="d-n"><b class="num">${n}</b> shoot day${n === 1 ? "" : "s"}</span>`;
}
const CAL_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`;
function prepBtnHtml(d) {
  return d ? `<span class="d-range">${esc(fmtShort(d))}</span><span class="d-n">${WEEKDAYS[weekday(d)] || ""}</span>` : `<span class="d-range muted">Pick the prep day</span><span class="d-n">${CAL_ICON}</span>`;
}
/* the calendar, for the prep day (one day) and the shoot days (a range). Shoot: tap the first day, then the last.
   Fridays and Saturdays start off; tap a day in the range to switch it on or off. Switching every day off clears the range. */
const cal = { mode: "shoot", start: "", end: "", days: {}, prep: "", y: 0, m: 0, stage: "start" };
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/* the form's date fields: the production's own, or (target "u2") the 2nd Unit's */
const calField = (f, name) => f.elements[(cal.target ? cal.target + "_" : "") + name];
const calBtnId = kind => "f-" + (cal.target ? cal.target + "-" : "") + kind;
function calOpen(mode, target) {
  const f = document.getElementById("prodForm"); if (!f) return;
  cal.mode = mode === "prep" ? "prep" : "shoot"; cal.target = target || "";
  cal.start = calField(f, "shootStart").value; cal.end = calField(f, "shootEnd").value || cal.start; cal.prep = calField(f, "prep").value;
  try { cal.days = JSON.parse(calField(f, "days").value || "{}") || {}; } catch (e) { cal.days = {}; }
  // for the 2nd Unit, the Main Unit's prep and shoot days (as they are in the form now) show alongside
  cal.ref = null;
  if (cal.target === "u2") {
    let rd = {}; try { rd = JSON.parse(f.elements.days.value || "{}") || {}; } catch (e) {}
    const ra = f.elements.shootStart.value, rb = f.elements.shootEnd.value || ra;
    cal.ref = { on: new Set(rangeDates(ra, rb).filter(d => dayOn(rd, d))), prep: f.elements.prep.value, start: ra };
    if (!cal.ref.on.size && !cal.ref.prep) cal.ref = null;
  }
  const now = new Date(), base = parseDate(cal.mode === "prep" ? cal.prep || cal.start : cal.start || cal.prep) || parseDate(cal.ref && (cal.ref.start || cal.ref.prep)) || { y: now.getFullYear(), m: now.getMonth() + 1 };
  cal.y = base.y; cal.m = base.m; cal.stage = cal.start ? "done" : "start";
  showModal(`<div class="cal" id="cal">${calHtml()}</div>`);
  document.querySelector("#modal .modal-card")?.classList.add("cal-card");
  const pick = cal.mode === "prep" ? "#cal .cal-day.pick" : "#cal .cal-day.start";
  (document.querySelector(pick) || document.querySelector("#cal .cal-day.today") || document.querySelector("#cal .cal-day"))?.focus({ preventScroll: true });
}
function calHtml() {
  const prep = cal.mode === "prep";
  const first = new Date(Date.UTC(cal.y, cal.m - 1, 1)), lead = first.getUTCDay(), n = new Date(Date.UTC(cal.y, cal.m, 0)).getUTCDate();
  const now = new Date(), today = isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const end = cal.stage === "done" ? cal.end || cal.start : "";
  let cells = "";
  for (let i = 0; i < lead; i++) cells += `<span class="cal-pad"></span>`;
  for (let d = 1; d <= n; d++) {
    const s = isoDate(cal.y, cal.m, d), inR = !!(cal.start && (s === cal.start || (end && s >= cal.start && s <= end)));
    const on = inR && dayOn(cal.days, s), wk = isWeekend(s);
    // picking the prep day, the shoot days show faintly for reference
    const cls = prep
      ? ["cal-day", wk ? "wknd" : "", on ? "ctx" : "", s === cal.prep ? "start end pick on" : "", s === today ? "today" : ""]
      : ["cal-day", wk ? "wknd" : "", inR ? "in" : "", inR && !on ? "off" : "", on ? "on" : "", s === cal.start ? "start" : "", end && s === end ? "end" : "", s === today ? "today" : "", s === cal.prep ? "prepday" : ""];
    const ref = cal.ref && cal.ref.on.has(s), refPrep = cal.ref && cal.ref.prep === s;
    if (ref) cls.push("ref"); if (refPrep) cls.push("refprep");
    const lbl = `${d} ${MONTHS[cal.m - 1]}${prep ? s === cal.prep ? ", prep day" : on ? ", shoot day" : "" : inR ? on ? ", shoot day" : ", day off" : ""}${ref ? ", Main Unit shoot day" : refPrep ? ", Main Unit prep day" : ""}`;
    cells += `<button class="${cls.filter(Boolean).join(" ")}" type="button" data-act="cal-day" data-d="${s}" aria-pressed="${prep ? s === cal.prep : on}" aria-label="${lbl}">${d}</button>`;
  }
  let sum, tip, any;
  if (prep) {
    any = !!cal.prep; sum = cal.prep ? `Prep <b>${esc(fmtShort(cal.prep))}</b> · ${WEEKDAYS[weekday(cal.prep)]}` : "No prep day yet";
    tip = cal.start ? "Tap the prep day. The shoot days show faintly." : "Tap the prep day.";
  } else {
    const count = cal.start ? countShootDays(cal.start, end || cal.start, cal.days) : 0, r = shootTrim(cal.start, end || cal.start, cal.days);
    const range = r.a ? (r.b !== r.a ? `${fmtShort(r.a)} – ${fmtShort(r.b)}` : fmtShort(r.a)) : "";
    any = !!cal.start; sum = range ? `<b>${esc(range)}</b> · <b class="num">${count}</b> shoot day${count === 1 ? "" : "s"}` : "No dates yet";
    tip = cal.stage === "start" ? "Tap the first shoot day." : cal.stage === "end" ? "Now tap the last shoot day." : "Tap a day in the range to switch it on or off. Fridays and Saturdays start off.";
  }
  return `<div class="cal-head"><button class="iconbtn" type="button" data-act="cal-prev" aria-label="Previous month">‹</button><b>${prep ? "Prep day · " : "Shoot days · "}${MONTHS[cal.m - 1]} ${cal.y}</b><button class="iconbtn" type="button" data-act="cal-next" aria-label="Next month">›</button></div>
    <div class="cal-grid${prep ? " prep" : ""}" role="group" aria-label="${prep ? "Prep day" : "Shoot days"}">${WEEKDAYS.map((w, i) => `<span class="cal-wd${i >= 5 ? " wknd" : ""}">${w}</span>`).join("")}${cells}</div>
    <p class="cal-sum" aria-live="polite">${sum}</p>
    ${cal.ref ? `<p class="cal-legend"><span class="lg lg-ref" aria-hidden="true"></span>Main Unit shoot days${cal.ref.prep ? ` · <span class="lg-p" aria-hidden="true">P</span> Main Unit prep` : ""}</p>` : ""}
    <p class="hint cal-tip">${tip}</p>
    <div class="modal-actions">${any ? `<button class="btn ghost" type="button" data-act="cal-clear">Clear</button>` : ""}<span class="grow"></span><button class="btn" type="button" data-act="modal-close">Cancel</button><button class="btn primary" type="button" data-act="cal-done">Done</button></div>`;
}
/* the range as it really is: from the first day that's on to the last */
function shootTrim(a, b, days) {
  const on = rangeDates(a, b).filter(d => dayOn(days, d));
  return { a: on[0] || "", b: on[on.length - 1] || "" };
}
function calRefresh(focusD) {
  const el = document.getElementById("cal"); if (!el) return;
  el.innerHTML = calHtml();
  if (focusD) el.querySelector(`[data-d="${focusD}"]`)?.focus();
}
function calClear() {
  if (cal.mode === "prep") cal.prep = "";
  else { cal.start = ""; cal.end = ""; cal.days = {}; cal.stage = "start"; }
}
function calPick(s) {
  if (cal.mode === "prep") { cal.prep = cal.prep === s ? "" : s; calRefresh(s); return; }
  if (cal.stage === "start" || (cal.stage === "done" && (s < cal.start || s > (cal.end || cal.start)))) { cal.start = s; cal.end = ""; cal.days = {}; cal.stage = "end"; }
  else if (cal.stage === "end") { if (s < cal.start) cal.start = s; else { cal.end = s; cal.stage = "done"; } }
  else {  // switch a day in the range on or off; every day off is the same as Clear
    const now = dayOn(cal.days, s);
    if (!now === !isWeekend(s)) delete cal.days[s]; else cal.days[s] = now ? 0 : 1;
    if (!countShootDays(cal.start, cal.end || cal.start, cal.days)) calClear();
  }
  calRefresh(s);
}
function calDone() {
  const f = document.getElementById("prodForm");
  if (f && cal.mode === "prep") {
    calField(f, "prep").value = cal.prep;
    document.getElementById(calBtnId("prepbtn")).innerHTML = prepBtnHtml(cal.prep);
  } else if (f) {
    // keep only the real shoot days: the range starts and ends on days that are on
    const r = cal.start ? shootTrim(cal.start, cal.end || cal.start, cal.days) : { a: "", b: "" };
    const days = {}; for (const d of rangeDates(r.a, r.b)) if (cal.days[d] !== undefined) days[d] = cal.days[d];
    calField(f, "shootStart").value = r.a; calField(f, "shootEnd").value = r.b; calField(f, "days").value = JSON.stringify(days);
    if (calField(f, "shootDays")) calField(f, "shootDays").value = "";
    document.getElementById(calBtnId("dates")).innerHTML = datesBtnHtml(r.a, r.b, days);
  }
  const back = cal.mode === "prep" ? calBtnId("prepbtn") : calBtnId("dates");
  closeModal(); document.getElementById(back)?.focus();
}

function ruleParts(r) {
  if (r.kind === "item") { const a = ITEM.get(r.when), b = ITEM.get(r.add), gone = "(no longer in the catalog)"; return { when: a ? a.it.name : gone, add: b ? b.it.name : gone, house: a ? a.h.name : "" }; }
  return { when: r.label, add: r.kind === "media" ? "memory cards to match the camera, and a card reader" : r.battery.label, house: "" };
}
function viewSettings() {
  const pkRow = r => { const x = ruleParts(r); return `<div class="pk-row"><span class="pk-nm">${esc(x.add)}</span>
      <span class="stepper sm"><button type="button" data-act="rdec" data-rid="${esc(r.id)}" aria-label="Fewer">−</button><input type="number" min="1" max="99" inputmode="numeric" data-rqty="${esc(r.id)}" value="${r.qty}" aria-label="How many with each one"><button type="button" data-act="rinc" data-rid="${esc(r.id)}" aria-label="More">+</button></span>
      <button class="x" type="button" data-act="rdel" data-rid="${esc(r.id)}" aria-label="Take ${esc(x.add)} out of the package">×</button></div>`; };
  const byWhen = new Map();
  for (const r of app.settings.rules) { const k = r.kind === "item" ? r.when : "rule:" + r.id; if (!byWhen.has(k)) byWhen.set(k, []); byWhen.get(k).push(r); }
  const rules = [...byWhen].map(([k, rs]) => { const x = ruleParts(rs[0]), item = rs[0].kind === "item";
    return `<div class="package"><div class="pk-head"><b>${esc(x.when)}</b>${x.house && HOUSES.length > 1 ? `<small>${esc(x.house)}</small>` : ""}<span class="pk-each">with each one</span></div>
      ${rs.map(pkRow).join("")}
      ${item && ITEM.has(k) ? `<button class="btn ghost sm pk-plus" type="button" data-act="pkg-add" data-id="${esc(k)}">+ Add an item</button>` : ""}</div>`; }).join("");
  const clashRows = (app.settings.clashes || []).map(r => `<div class="rule clash"><button class="txt" type="button" data-act="clash-edit" data-rid="${esc(r.id)}" aria-label="Edit this rule">
      <span class="c-a">${esc(r.a.map(itName).join(", "))}${HOUSES.length > 1 && houseById(r.house) ? ` <small>· ${esc(houseById(r.house).name)}</small>` : ""}</span>
      <span class="c-b">doesn't work with <b>${esc(r.b.map(itName).join(", "))}</b></span>
      ${r.swap ? `<span class="c-sw">Use instead: <b>${esc(itName(r.swap))}</b></span>` : ""}${r.why ? `<small>${esc(r.why)}</small>` : ""}</button>
      <button class="x" type="button" data-act="clash-del" data-rid="${esc(r.id)}" aria-label="Delete this rule">×</button></div>`).join("");
  const me = app.settings.me || {}, acct = accountHtml();
  const themeSeg = `<div class="seg" role="radiogroup" aria-label="Light or dark">${[["light", "Light"], ["dark", "Dark"], ["auto", "Auto"]].map(([v, t]) => `<label><input type="radio" name="theme" value="${v}" ${theme.pref === v ? "checked" : ""}><span>${t}</span></label>`).join("")}</div>`;
  return `<section class="pad">
    <div class="prod-head">${app.setFrom && app.productions.some(x => x.id === app.setFrom) ? `<button class="btn ghost back" type="button" data-act="open" data-id="${esc(app.setFrom)}" data-keep="1">← Back to the list</button>` : `<button class="btn ghost back" type="button" data-act="home">← Productions</button>`}<div class="set-title"><h2 class="page">Settings</h2>${acct}</div></div>
    <div class="set-group"><h3>Your details</h3>
      <form class="form tight" id="meForm" autocomplete="off"><div class="row2">
        <div class="field"><label for="me-name">Your name (1st AC)</label><input id="me-name" name="name" maxlength="80" value="${esc(me.name || "")}"></div>
        <div class="field"><label for="me-phone">Your phone</label><input id="me-phone" name="phone" type="tel" inputmode="tel" maxlength="30" value="${esc(me.phone || "")}"></div></div>
        <span class="hint">Filled in on every new production. You can still change them on each one.</span></form></div>
    ${(() => { const rows = HOUSES.map(h => { const n = hiddenItems(h).length; return n ? `<div class="cat-tools"><b>${esc(h.name)}</b><button class="btn sm" type="button" data-act="removed-list" data-house="${h.id}">Removed items (${n})</button></div>` : ""; }).join("");
      return `<div class="set-group"><h3>Catalog</h3>${rows}<div class="cat-io"><button class="btn" type="button" data-act="cat-export">${SAVE_ICON}<span>Save my catalog as a file</span></button>
        <label class="btn"><input type="file" accept=".json,application/json" data-catimport="1" hidden>${LOAD_ICON}<span>Load a catalog file</span></label></div>
      <span class="hint">A catalog file holds its order, names, colors and the items added. Loading one replaces your catalog; your lists stay as they are. Edit the catalog with the pencil in Add gear.</span></div>`; })()}
    <div class="set-group"><h3>Appearance</h3>${themeSeg}<span class="hint">Auto follows your device.</span>
      ${canBuzz() ? `<label class="check"><input type="checkbox" name="haptics" ${app.settings.haptics === false ? "" : "checked"}> Vibrate lightly on taps</label>` : ""}</div>
    ${isAndroid() || helperOn() ? `<div class="set-group" id="sendAppGroup"><h3>Word files on Android</h3>
      <p class="hint" style="margin:0">Android won't attach a Word file from the app by itself. A small helper app does it: tap Send, and the share menu opens with the Word file attached, for WhatsApp, Gmail or any other app.</p>
      ${app.helperMissing ? `<p class="hint warn">The helper app isn't on this phone yet. Get it below, then switch it on.</p>` : ""}
      <div><a class="btn" href="${HELPER_APK}" rel="noopener">${SAVE_ICON}<span>Get the helper app</span></a></div>
      <label class="check"><input type="checkbox" name="helperOn" ${helperOn() ? "checked" : ""}> The helper app is installed on this phone</label>
      <span class="hint">Once downloaded, open the file to install it. Android asks once to allow installs from your browser.</span></div>` : ""}
    <div class="set-group"><h3>Share the app</h3><div><button class="btn" type="button" data-act="share-app">${SEND_ICON}<span>Share AC Cam List</span></button></div><span class="hint">Sends a link to the app. Lists stay yours.</span></div>
    <div class="set-group"><h3>Packages</h3>
      <div class="packages">${rules || `<p class="hint">No packages yet.</p>`}</div>
      <label class="check pk-readers"><input type="checkbox" name="readers" ${app.settings.readers ? "checked" : ""}> A card reader for each kind of card on the list</label>
      <div><button class="btn" type="button" data-act="rule-new">+ New package</button></div></div>
    <div class="set-group"><h3>Doesn't work together</h3>
      <p class="hint" style="margin:0">Items that don't work together, and what to take instead. When both are on a list you're told why, and can swap in one tap.</p>
      <div class="rules">${clashRows || `<p class="hint">No rules yet.</p>`}</div>
      <div><button class="btn" type="button" data-act="clash-new">+ New rule</button></div></div>
  </section>`;
}

/* a new default: an item, chosen by category and subcategory, and what comes with it */
const dd = { house: "", when: {}, add: {} };
function pickerHtml(key) {
  const h = houseById(dd.house), v = dd[key] || {};
  const c = h.categories.find(x => x.id === v.c), sub = c ? [c.direct, ...c.subcategories].find(x => x.key === v.s) : null;
  const cats = h.categories.filter(x => catCount(x)).map(x => `<option value="${esc(x.id)}" ${x.id === v.c ? "selected" : ""}>${esc(x.name)}</option>`).join("");
  const subs = c ? [c.direct, ...c.subcategories].filter(x => x.items.length).map(x => `<option value="${esc(x.key)}" ${x.key === v.s ? "selected" : ""}>${esc(x.direct ? "(straight in " + c.name + ")" : x.name)}</option>`).join("") : "";
  let items = "";
  if (sub) for (const [g, its] of groupItems(sub.items, sub)) items += `${g ? `<optgroup label="${esc(headLabel(h, sub.key + "/" + g, g))}">` : ""}${its.map(it => `<option value="${esc(it.id)}" ${it.id === v.id ? "selected" : ""}>${esc(it.name)}</option>`).join("")}${g ? "</optgroup>" : ""}`;
  return `<div class="row2"><div class="field"><label for="pk-${key}-c">Category</label><select id="pk-${key}-c" data-pkc="${key}"><option value="">Choose…</option>${cats}</select></div>
      <div class="field"><label for="pk-${key}-s">Subcategory</label><select id="pk-${key}-s" data-pks="${key}" ${c ? "" : "disabled"}><option value="">Choose…</option>${subs}</select></div></div>
    <div class="field"><label for="pk-${key}-i">Item</label><select id="pk-${key}-i" data-pki="${key}" ${sub ? "" : "disabled"}><option value="">Choose…</option>${items}</select></div>`;
}
/* a new "doesn't work together" rule: one or more items, what they don't work with, and what to use instead */
const cx = { id: "", a: [], b: [] };
const pickOf = id => { const e = ITEM.get(id); return e ? { c: e.c.id, s: e.s.key, id } : {}; };
const cxChips = k => cx[k].map(id => `<span class="cx-chip">${esc(itName(id))}<button type="button" class="cx-x" data-act="cx-x" data-k="${k}" data-id="${esc(id)}" aria-label="Take off ${esc(itName(id))}">×</button></span>`).join("");
function clashDialog(rid) {
  const r = rid && (app.settings.clashes || []).find(x => x.id === rid);
  const recent = [...app.productions].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).find(p => houseById(p.houseId));
  dd.house = r && houseById(r.house) ? r.house : cur() && houseById(cur().houseId) ? cur().houseId : recent ? recent.houseId : HOUSES[0].id;
  dd.ca = {}; dd.cb = {}; dd.cc = r && r.swap ? pickOf(r.swap) : {};
  cx.id = r ? r.id : ""; cx.a = r ? [...r.a] : []; cx.b = r ? [...r.b] : [];
  showModal(`<form class="form dialog" id="clashForm" autocomplete="off"><h3 class="plain">${r ? "Edit rule" : "Doesn't work together"}</h3>
    ${HOUSES.length > 1 ? `<div class="field"><label for="rd-house">Rental house</label><select id="rd-house" data-rdhouse="1">${HOUSES.map(h => `<option value="${h.id}" ${h.id === dd.house ? "selected" : ""}>${esc(h.name)}</option>`).join("")}</select></div>` : ""}
    <fieldset class="pk"><legend>This item</legend><div class="cx-chips" id="cx-a">${cxChips("a")}</div><div id="pk-ca">${pickerHtml("ca")}</div><span class="hint">Pick one or more, for example every camera without a radio inside.</span></fieldset>
    <fieldset class="pk"><legend>Doesn't work with</legend><div class="cx-chips" id="cx-b">${cxChips("b")}</div><div id="pk-cb">${pickerHtml("cb")}</div></fieldset>
    <fieldset class="pk"><legend>Use instead <small>(optional)</small></legend><div id="pk-cc">${pickerHtml("cc")}</div></fieldset>
    <div class="field"><label for="cx-why">Why <small>(optional)</small></label><input id="cx-why" name="why" maxlength="120" placeholder="e.g. No radio inside the camera" value="${esc(r ? r.why || "" : "")}"></div>
    <span class="err" id="rdErr" hidden></span>
    <div class="modal-actions"><span class="grow"></span><button class="btn" type="button" data-act="modal-close">Cancel</button><button class="btn primary" type="submit">Save rule</button></div></form>`);
  if (!r) document.getElementById("pk-ca-c")?.focus();
}
/* a package: the item you add, and what comes with it. Its media come from a tick box: the right card for the camera, and how many */
function ruleDialog(whenId) {
  const fixed = whenId && ITEM.get(whenId);
  const recent = [...app.productions].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).find(p => houseById(p.houseId));
  dd.house = fixed ? fixed.h.id : (cur() && houseById(cur().houseId) ? cur().houseId : recent ? recent.houseId : HOUSES[0].id);
  dd.when = fixed ? pickOf(whenId) : {}; dd.media = {}; dd.fixed = fixed ? whenId : ""; dd.q = {};
  dd.adds = []; if (!fixed || !pkgKinds().length) { dd.adds = ["add0"]; dd.add0 = {}; dd.q.add0 = 1; }
  showModal(`<form class="form dialog" id="ruleForm" autocomplete="off"><h3 class="plain">${fixed ? "Add to the package" : "New package"}</h3>
    ${!fixed && HOUSES.length > 1 ? `<div class="field"><label for="rd-house">Rental house</label><select id="rd-house" data-rdhouse="1">${HOUSES.map(h => `<option value="${h.id}" ${h.id === dd.house ? "selected" : ""}>${esc(h.name)}</option>`).join("")}</select></div>` : ""}
    ${fixed ? `<p class="pk-fixed">When you add <b>${esc(fixed.it.name)}</b></p>` : `<fieldset class="pk"><legend>When you add</legend><div id="pk-when">${pickerHtml("when")}</div></fieldset>`}
    <fieldset class="pk"><legend>Comes with</legend>
      <div id="pk-media">${pkgMediaHtml()}</div>
      <div id="pk-adds">${pkgAddsHtml()}</div>
      <div><button class="btn sm" type="button" data-act="pk-more">+ Another item</button></div></fieldset>
    <span class="err" id="rdErr" hidden></span>
    <div class="modal-actions"><span class="grow"></span><button class="btn" type="button" data-act="modal-close">Cancel</button><button class="btn primary" type="submit">Save package</button></div></form>`);
  if (!fixed) document.getElementById("pk-when-c")?.focus();
}
/* a camera's media in its package: one line for each kind of card it takes, the card already picked; tick, and set how many */
function pkgKinds() {
  const e = ITEM.get(dd.when.id), ch = e && e.it.camera && !e.it.camera.film ? cardChoices(e, dd.house) : [];
  const kinds = [];
  for (const c of ch) { let k = kinds.find(x => x.type === c.type); if (!k) kinds.push(k = { type: c.type, cards: [] }); k.cards.push(c); }
  return kinds;
}
function pkgMediaHtml() {
  const kinds = pkgKinds(); if (!kinds.length) return "";
  const e = ITEM.get(dd.when.id), size = c => cardBytes(c.name) || 1;
  return `<div class="pk-media"><span class="lbl">Media</span>${kinds.map(k => {
    const m = dd.media[k.type] || (dd.media[k.type] = { on: false, qty: 4, id: "" });
    if (!k.cards.some(c => c.id === m.id)) m.id = (k.cards.filter(c => size(c) <= 1.01e12).sort((a, b) => size(b) - size(a))[0] || k.cards.slice().sort((a, b) => size(a) - size(b))[0]).id;
    const t = esc(k.type);
    return `<div class="pk-kind${m.on ? " on" : ""}"><label class="check"><input type="checkbox" data-pkmedia="on" data-type="${t}" ${m.on ? "checked" : ""}> ${t}</label>
      ${m.on ? `<div class="pk-kq">${k.cards.length > 1 ? `<select aria-label="${t} card" data-pkmedia="id" data-type="${t}">${k.cards.map(c => `<option value="${esc(c.id)}" ${c.id === m.id ? "selected" : ""}>${esc(shortCard(c.name))}</option>`).join("")}</select>` : `<span class="pk-card">${esc(shortCard(k.cards[0].name))}</span>`}
        <input type="number" min="1" max="99" inputmode="numeric" aria-label="How many ${t} cards" data-pkmedia="qty" data-type="${t}" value="${m.qty}"></div>` : ""}</div>`; }).join("")}</div>`;
}
function pkgAddsHtml() {
  return dd.adds.map(k => `<div class="pk-add" id="pa-${k}"><div id="pk-${k}">${pickerHtml(k)}</div>
    <div class="pk-q"><div class="field"><label for="rd-q-${k}">Quantity</label><input id="rd-q-${k}" type="number" min="1" max="99" inputmode="numeric" data-pkq="${k}" value="${dd.q[k] || 1}"></div>
    ${dd.adds.length > 1 || pkgKinds().length ? `<button class="btn ghost sm" type="button" data-act="pk-less" data-k="${k}">Remove</button>` : ""}</div></div>`).join("");
}

/* where the production stands today, in a few words: "Shoot starts in 6 days", "Shoot day 3 of 6", "Wrapped 18 Nov" */
function todayIso() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
const dayGap = (a, b) => { const pa = parseDate(a), pb = parseDate(b); return pa && pb ? Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000) : null; };
const fmtDM = s => { const q = parseDate(s); return q ? `${q.d} ${MONTHS[q.m - 1]}` : ""; };
function fmtSpan(a, b) {
  const pa = parseDate(a), pb = parseDate(b);
  if (!pa) return ""; if (!pb || a === b) return fmtDM(a);
  return pa.m === pb.m && pa.y === pb.y ? `${pa.d}–${pb.d} ${MONTHS[pa.m - 1]}` : `${fmtDM(a)} – ${fmtDM(b)}`;
}
function prodStatus(p, today = todayIso()) {
  const end = p.shootEnd || p.shootStart, inDays = (n, what) => n === 1 ? `${what} tomorrow` : `${what} in ${n} days`;
  if (p.prep && today < p.prep && (!p.shootStart || p.prep <= p.shootStart)) return { t: inDays(dayGap(today, p.prep), "Prep"), k: "soon" };
  if (p.prep && today === p.prep) return { t: "Prep day today", k: "live" };
  if (p.shootStart && today < p.shootStart) return { t: inDays(dayGap(today, p.shootStart), "Shoot starts"), k: "soon" };
  if (p.shootStart && today <= end) {
    const all = rangeDates(p.shootStart, end).filter(x => dayOn(p.days, x)), k = all.filter(x => x <= today).length;
    return dayOn(p.days, today) ? { t: `Shoot day ${k} of ${all.length}`, k: "live" } : { t: "Day off today", k: "soon" };
  }
  if (end && today > end) return { t: `Wrapped ${fmtDM(end)}`, k: "done" };
  return null;
}
const CHIP_CAL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>`;
const PREP_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 6.5a4 4 0 0 0-5.3 5.2L4 17v3h3l5.3-5.2a4 4 0 0 0 5.2-5.3l-2.5 2.5-2.5-2.5z"/></svg>`;
const INFO_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/></svg>`;
function viewProduction() {
  const p = cur(), h = houseById(p.houseId), t = totals(p);
  const when = fmtRange(p.shootStart, p.shootEnd), days = shootDays(p);
  const shootDates = p.shootStart ? (p.shootEnd && p.shootEnd !== p.shootStart ? `${fmtShort(p.shootStart)}–${fmtShort(p.shootEnd)}` : fmtShort(p.shootStart)) : "";
  const factsOf = x => { const xd = shootDays(x), xs = x.shootStart ? (x.shootEnd && x.shootEnd !== x.shootStart ? `${fmtShort(x.shootStart)}–${fmtShort(x.shootEnd)}` : fmtShort(x.shootStart)) : "";
    return [["Production company", esc(x.company || "")], ["Rental house", h ? esc(h.name) : ""], ["DP", esc(x.dp || "")],
      ["1st AC", x.ac || x.acPhone ? esc(x.ac || "") + (x.acPhone ? `<small>${esc(x.acPhone)}</small>` : "") : ""],
      ["Prep", x.prep ? esc(fmtShort(x.prep)) : ""], ["Shoot", xs ? esc(xs) + (xd ? `<small>${xd} shoot day${xd === 1 ? "" : "s"}</small>` : "") : ""]]; };
  // with two units, both show the same rows (a dash where one has nothing), so switching between them doesn't move the page
  const ou = otherUnit(p), oFacts = ou ? factsOf(ou) : [];
  const facts = factsOf(p).filter(([k, v], i) => v || (oFacts[i] && oFacts[i][1])).map(([k, v]) => {
    const o2 = (oFacts.find(f => f[0] === k) || [])[1] || "", out = v || `<span class="pf-none">—</span>`;
    return [k, /<small>/.test(o2) && !/<small>/.test(out) ? out + `<small aria-hidden="true">&nbsp;</small>` : out];  // same height as the other unit's row
  });
  if (unitLine(p)) facts.splice(1, 0, ["Unit", esc(unitLine(p))]);
  if (p.notes) facts.push(["Notes", `<span class="pf-notes">${esc(p.notes)}</span>`]);
  const missing = !p.dp && !p.ac && !p.shootStart;
  const fv = favoritesFor(p), nFav = fv.starred.length + fv.custom.length;
  const infoOpen = app.open.has("prodfacts");
  // the row under the name: day and month only, so shoot and prep fit on one line (the years are in Info)
  const dm = s => { const q = parseDate(s); return q ? q.d + "." + q.m : ""; };
  const shootDM = p.shootStart ? (p.shootEnd && p.shootEnd !== p.shootStart ? `${dm(p.shootStart)}–${dm(p.shootEnd)}` : dm(p.shootStart)) : "";
  const st = prodStatus(p);
  const shootTxt = p.shootStart ? `<span class="ph-chip">${CHIP_CAL}<span>${esc(fmtSpan(p.shootStart, p.shootEnd))}</span>${days ? `<span class="ph-n">· ${days} day${days === 1 ? "" : "s"}</span>` : ""}</span>` : "";
  const prepTxt = p.prep ? `<span class="ph-chip">${PREP_ICON}<span class="ph-n">Prep</span><span>${esc(fmtDM(p.prep))}</span></span>` : "";
  // the lens finder gets the whole screen: nothing above the tabs
  const finder = app.tab === "add" && fin().on;
  const head = finder ? "" : `<div class="prod-head">
      <div class="ph-top"><button class="btn ghost back" type="button" data-act="home">← Productions</button><button class="btn primary sm" type="button" data-act="preview" ${t.lines ? "" : "disabled"}>Preview &amp; export</button></div>
      ${st ? `<p class="ph-status ${st.k}">${esc(st.t)}</p>` : otherUnit(p) && prodStatus(otherUnit(p)) ? `<p class="ph-status ph-hold" aria-hidden="true">&nbsp;</p>` : ""}
      <h2 class="ph-name">${esc(p.name || "Untitled production")}</h2>
      ${(() => { const m = mainOf(p), q = unit2Of(p); return q ? `<div class="seg sm unit-sw" role="group" aria-label="Unit">${[[m, "Main Unit"], [q, "2nd Unit"]].map(([x, t]) => `<button type="button" data-act="unit-sw" data-id="${esc(x.id)}" aria-pressed="${x.id === p.id}">${t}</button>`).join("")}</div>` : ""; })()}
      <div class="ph-chips">${shootTxt}${prepTxt}${shootTxt || prepTxt ? "" : `<button class="ph-chip ph-add" type="button" data-act="edit">${CHIP_CAL}<span>Add dates</span></button>`}
        <button class="ph-chip ph-info" type="button" data-act="pinfo" aria-expanded="${infoOpen}" aria-controls="pinfo" aria-label="Info: company, DP, 1st AC and notes" title="Info">${INFO_ICON}</button></div>
      <div class="pinfo${infoOpen ? " open" : ""}" id="pinfo"><div class="pinfo-in"><div class="pinfo-card">
        <dl class="prod-facts">${facts.map(([k, v]) => `<div${k === "Notes" ? ` class="pf-wide"` : ""}><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>
        <div class="pinfo-acts"><button class="btn sm" type="button" data-act="edit">${missing ? "+ Add DP, 1st AC and dates" : "Edit details"}</button></div></div></div></div>
    </div>`;
  return `<section class="pad">
    ${head}
  </section>
  ${app.tab === "add" ? viewCatalog(p, h) : app.tab === "fav" ? viewFavorites(p, h) : app.tab === "media" ? viewMedia(p, h) : viewList(p, h)}
  <nav class="navbar" role="tablist" aria-label="Production"${finder ? " hidden" : ""}><div class="navbar-in">
    ${[["add", "Add gear", ""], ["fav", "Favorites", nFav || ""], ["list", "Camera List", t.lines || ""], ["media", "Media Calculator", ""]].map(([k, label, n]) =>
      `<button class="nav-tab" role="tab" type="button" data-act="tab" data-tab="${k}" aria-selected="${app.tab === k}"><span class="nt-l">${label}${k === "list" || k === "fav" ? `<span class="num"${k === "list" ? ` id="tabCount"` : ""}>${n}</span>` : ""}</span></button>`).join("")}
  </div></nav>`;
}

/* ----- shared row for catalog and favorites ----- */
function stepper(act, id, val, field, small) {
  const f = field ? ` data-f="${field}"` : "";
  return `<span class="stepper${small ? " sm" : ""}"><button type="button" data-act="${act}dec" data-id="${esc(id)}"${f} aria-label="Decrease${field ? " " + field.toUpperCase() : ""}">−</button><input type="number" min="0" max="999" inputmode="numeric" data-${act}qty="${esc(id)}"${f} value="${val}" aria-label="${field ? field.toUpperCase() + " quantity" : "Quantity"}"><button type="button" data-act="${act}inc" data-id="${esc(id)}"${f} aria-label="Increase${field ? " " + field.toUpperCase() : ""}">+</button></span>`;
}
function ctlHtml(p, id) {
  const l = p.items[id];
  if (!l) return `<button class="add" type="button" data-act="cinc" data-id="${esc(id)}" aria-label="Add">+ Add</button>`;
  return stepper("c", id, l.qty, null, false);
}
function rowHtml(p, it, q, extra) {
  const on = !!p.items[it.id], e = ITEM.get(it.id), link = linkHtml(it, e?.h);
  const specs = specsHtml(it, extra, { q }), nameLink = "";
  const corner = link ? link.replace('class="ext"', 'class="ext corner"') : "";  // the product page globe sits in the row's top-right corner
  return `<li class="item ${on ? "on" : ""}${corner ? " has-link" : ""}" data-row="${esc(it.id)}">${corner}${starBtn(it.id, { name: it.name, section: it.section })}
    <span class="info"><span class="nm-row flow"><span class="nm nm-btn" role="button" tabindex="0" data-act="note" data-id="${esc(it.id)}" title="${esc(it.name)} · tap to add a note">${nameHtml(it.lens ? lensShortName(it, lensSpec(it, e?.s.id)) : it.name, q)}</span>${nameLink}</span>${specs}${noteHtml(it.id)}</span><span class="ctl">${ctlHtml(p, it.id)}</span></li>`;
}

/* ----- Add gear: the rental house catalog ----- */
function viewCatalog(p, h) {
  if (fin().on) return finderHtml(p, h);
  const chips = [`<button class="chip" type="button" data-act="chip" data-cat="all" aria-pressed="${app.cat === "all"}">All <span class="num">${houseCount(h)}</span></button>`]
    .concat(h.categories.filter(c => app.editCat || catCount(c)).map(c => `<button class="chip" type="button" data-act="chip" data-cat="${c.id}" aria-pressed="${app.cat === c.id}" style="--tape: ${catTape(c)}"><span class="dot"></span>${esc(c.name)} <span class="num">${catCount(c)}</span></button>`)).join("");
  return `<div class="bar pad">
      <div class="search-row"><label class="search" for="q"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
      <input id="q" type="search" placeholder="Search ${esc(h.name)}" autocomplete="off" value="${esc(app.q)}"></label>
      <button class="btn icon-btn spec-btn" type="button" data-act="fin-open" aria-label="Lens search: find a lens by focal length and stop" title="Lens search">${LENS_ICON}</button>
      <button class="btn icon-btn${app.editCat ? " primary" : ""}" type="button" data-act="cat-editmode" aria-pressed="${app.editCat}" aria-label="${app.editCat ? "Done editing the catalog" : "Edit the catalog"}" title="${app.editCat ? "Done editing" : "Edit the catalog"}">${PEN_ICON}</button></div>
      <div class="chips" role="toolbar" aria-label="Filter by category">${chips}</div>
    </div>

    <div class="pad" id="tree">${treeHtml(p, h)}</div>`;
}
const PEN_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>`;
function selCount(p, pred) { let n = 0; for (const id of Object.keys(p.items)) { const e = ITEM.get(id); if (e && pred(e)) n++; } return n; }
function selBadge(n, key) { return `<span class="sel" data-sel="${esc(key)}" ${n ? "" : "hidden"}>${n}</span>`; }
const NOFOLDER = "__none";
const grpOf = (it, s) => { const g = it.grp || naturalGroup(it, s); return g === NOFOLDER ? "" : g; };
/* the user's dragged order of groups wins; the rest keep the default order after them */
function userOrder(arr, order, key) {
  if (!order || !order.length) return arr;
  const at = v => { const i = order.indexOf(key(v)); return i < 0 ? 1e6 : i; };
  return arr.map((v, n) => [v, n]).sort((a, b) => at(a[0]) - at(b[0]) || a[1] - b[1]).map(a => a[0]);
}
function groupItems(items, s) {
  const m = new Map();
  for (const it of items) { const b = grpOf(it, s); if (!m.has(b)) m.set(b, []); m.get(b).push(it); }
  let out;
  if (s.groupBy) { const order = s.groups || [], at = g => { const i = order.indexOf(g); return i < 0 ? 1e6 : i; }; out = [...m.entries()].sort((a, b) => at(a[0]) - at(b[0]) || a[0].localeCompare(b[0])); }
  else out = [...m.entries()].sort((a, b) => a[0] === "Generic" ? 1 : b[0] === "Generic" ? -1 : a[0].localeCompare(b[0], "en", { sensitivity: "base" }));
  return userOrder(out, s.gorder, e => e[0]);
}
const hay = (it, s) => norm(it.name + " " + (it.sku || "") + " " + noteOf(it.id) + " " + it.brand + " " + (it.group || "") + " " + s.name + " " + (it.site_name || "") + " " + (it.lens ? (it.lens.focals || "") + " " + (it.lens.coverage || "") : ""));
const GRIP = `<svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="1.6"/><circle cx="9" cy="3" r="1.6"/><circle cx="3" cy="9" r="1.6"/><circle cx="9" cy="9" r="1.6"/><circle cx="3" cy="15" r="1.6"/><circle cx="9" cy="15" r="1.6"/></svg>`;
function editRowHtml(it, kB, q, brand) {
  return `<li class="item edit" data-drop="${esc(kB)}" data-row="${esc(it.id)}"${brand ? ` data-brand="${esc(brand)}"` : ""}><button class="handle" type="button" data-drag="cat" data-id="${esc(it.id)}" aria-label="Drag ${esc(it.name)} to another heading">${GRIP}</button>
    <span class="info"><span class="nm-row"><span class="nm">${nameHtml(it.name, q)}</span></span>${q && it.sku && norm(it.sku).includes(q) ? `<span class="specs"><span class="sku">${hl(it.sku, q)}</span></span>` : ""}${noteHtml(it.id)}</span>
    ${linkHtml(it, ITEM.get(it.id)?.h) || `<span class="ext-gap" aria-hidden="true"></span>`}<button class="btn sm" type="button" data-act="cat-edit" data-id="${esc(it.id)}">Edit</button></li>`;
}
/* a lens subcategory split by format, largest first; items without a known format go last ("Other").
   Only when it holds more than one format; folders the user made are left as they are. */
const COV_ORDER = ["MF", "LF", "FF", "S35", "APS-C", "MFT", "S16", "2/3", ""];
function lensFormats(groups, s) {
  if (s.groupBy || s.direct) return null;
  const natural = [], other = [];
  for (const grp of groups) (grp[1].length && !(s.extra || []).includes(grp[0]) && grp[1].every(it => (it.brand || "Generic") === grp[0]) ? natural : other).push(grp);
  const m = new Map();
  for (const [, its] of natural) for (const it of its) {
    const cv = it.lens && COV_ORDER.includes(it.lens.coverage) ? it.lens.coverage : "";
    if (!m.has(cv)) m.set(cv, []); m.get(cv).push(it);
  }
  if (m.size < 2) return null;
  return { covs: [...m.entries()].sort((a, b) => COV_ORDER.indexOf(a[0]) - COV_ORDER.indexOf(b[0])).map(([cov, its]) => ({ cov, its })), other };
}
function treeHtml(p, h) {
  const q = norm(app.q.trim()), searching = q.length > 0, ed = app.editCat;
  const pen = (k, label) => ed ? `<button class="iconbtn pen" type="button" data-act="rename-head" data-k="${esc(k)}" aria-label="Rename ${esc(label)}">✎</button>` : "";
  const dz = k => ed ? ` data-drop="${esc(k)}"` : "";
  const out = [];
  for (const c of h.categories) {
    if (app.cat !== "all" && app.cat !== c.id) continue;
    const subs = [];
    let cn = 0;
    for (const s of c.subcategories) {
      const items = searching ? s.items.filter(it => hay(it, s).includes(q)) : s.items;
      if (!items.length && (!ed || searching)) continue;
      cn += items.length;
      const groups = groupItems(items, s);
      const looseIdx = groups.findIndex(([g]) => g === "");
      const looseItems = looseIdx >= 0 ? groups.splice(looseIdx, 1)[0][1] : [];
      if (ed && !searching) {
        for (const g of s.extra || []) if (!groups.some(([x]) => x === g)) groups.push([g, []]);
        groups.splice(0, groups.length, ...userOrder(groups, s.gorder, x => x[0]));
      }
      const kS = s.key;
      const renderGroup = ([b, its]) => {
        const kB = kS + "/" + b, label = headLabel(h, kB, b);
        const open = searching || groups.length === 1 || app.open.has(kB);
        const nSel = its.filter(it => p.items[it.id]).length;
        // a folder of the user's own gets its own "+ New item", which lands in it
        const addHere = ed && !searching && isOwnGroup(h, kB) ? `<li class="add-li"><button class="add-head" type="button" data-act="new-item" data-k="${esc(kB)}">+ New item in ${esc(label)}</button></li>` : "";
        return `<details class="brand" data-k="${esc(kB)}"${dz(kB)} ${open ? "open" : ""}><summary${dz(kB)}><span class="bname">${ed ? `<button class="handle" type="button" data-drag="cgrp" data-id="${esc(kB)}" data-label="${esc(label)}" aria-label="Move ${esc(label)}: drag, or use the arrow keys">${GRIP}</button>` : ""}${hl(label, q)}${pen(kB, label)}</span><span class="sumr">${selBadge(nSel, kB)}<span class="cnt">${its.length}</span>${CHEV}</span></summary><ul class="items">` +
          (its.length ? (splitByBrand(h, s, b) ? brandRows(its, (it, br) => ed ? editRowHtml(it, kB, q, br) : rowHtml(p, it, q), ed, kB, null, kB, (peekEdits(h.id).brandOrder || {})[kB], searching) : its.map(it => ed ? editRowHtml(it, kB, q) : rowHtml(p, it, q)).join("")) : `<li class="drop-empty"${dz(kB)}>Empty folder. Drag items here.</li>`) + addHere + `</ul></details>`;
      };
      let brands;
      const fmt = !ed && c.id === "lenses" ? lensFormats(groups, s) : null;
      if (fmt) {
        // lenses: first by format (Full frame, Super 35…), then by manufacturer; folders the user made stay folders
        brands = fmt.covs.map(({ cov, its }) => {
          const kF = kS + "#" + (cov || "other"), open = searching || app.open.has(kF);
          const nSel = its.filter(it => p.items[it.id]).length;
          return `<details class="brand fmt" data-k="${esc(kF)}" ${open ? "open" : ""}><summary><span class="bname">${esc(COV_LABEL[cov] || "Other")}</span><span class="sumr">${selBadge(nSel, kF)}<span class="cnt">${its.length}</span>${CHEV}</span></summary><ul class="items flat">${brandRows(its, it => rowHtml(p, it, q), false, kS, null, kF, (peekEdits(h.id).brandOrder || {})[kS], searching)}</ul></details>`;
        }).join("") + fmt.other.map(renderGroup).join("");
      } else if (isFlat(h, s)) {
        // items sitting in their own manufacturer's group go in one list with a heading per manufacturer; folders you made stay folders
        const natural = [], other = [];
        for (const grp of groups) (grp[1].length && !(s.extra || []).includes(grp[0]) && grp[1].every(it => (it.brand || "Generic") === grp[0]) ? natural : other).push(grp);
        const flatItems = natural.flatMap(([, its]) => its);
        brands = (flatItems.length ? `<ul class="items flat">${brandRows(flatItems, (it, br) => ed ? editRowHtml(it, kS, q, br) : rowHtml(p, it, q), ed, kS, br => kS + "/" + br, kS, (peekEdits(h.id).brandOrder || {})[kS], searching)}</ul>` : "") + other.map(renderGroup).join("");
      } else brands = groups.map(renderGroup).join("");
      // dropping on a type-grouped subcategory (not on one of its folders) puts the item straight in it
      const subDrop = s.groupBy ? kS + "/" + NOFOLDER : kS;
      if (looseItems.length) brands = `<ul class="items loose">${looseItems.map(it => ed ? editRowHtml(it, subDrop, q) : rowHtml(p, it, q)).join("")}</ul>` + brands;
      const nSel = selCount(p, e => e.s === s && e.h.id === h.id);
      const sHandle = ed ? `<button class="handle" type="button" data-drag="csub" data-id="${esc(kS)}" data-label="${esc(s.name)}" aria-label="Move ${esc(s.name)}: drag, or use the arrow keys">${GRIP}</button>` : "";
      const addItem = ed && !searching ? `<div class="add-row inset"><button class="add-head" type="button" data-act="new-item" data-k="${esc(kS)}">+ New item in ${esc(s.name)}</button><button class="add-head" type="button" data-act="new-folder" data-k="${esc(kS)}">+ New folder in ${esc(s.name)}</button></div>` : "";
      // open or close everything inside at once, when there are a few headings to go through
      const nHeads = (brands.match(/<details class="brand|class="mfr-head/g) || []).length;
      const anyClosed = /<details class="brand[^>]*" >/.test(brands) || brands.includes('class="mfr-head closed"');
      const allBtn = !ed && !searching && nHeads >= 2 ? `<div class="sub-tools"><button class="btn ghost sm" type="button" data-act="sub-all" data-k="${esc(kS)}" data-open="${anyClosed ? 1 : 0}">${anyClosed ? "Open all" : "Close all"}</button></div>` : "";
      subs.push(`<details class="sub" data-k="${esc(kS)}"${dz(subDrop)} ${searching || app.open.has(kS) ? "open" : ""}><summary${dz(subDrop)}><span class="sub-title">${sHandle}<span>${esc(s.name)}${pen(kS, s.name)}</span></span><span class="sumr">${selBadge(nSel, kS)}<span class="cnt">${items.length}</span>${CHEV}</span></summary>${allBtn}${brands || `<p class="drop-empty"${dz(kS)}>Empty. Drag items here.</p>`}${addItem}</details>`);
    }
    const dItems = searching ? c.direct.items.filter(it => hay(it, c.direct).includes(q)) : c.direct.items;
    cn += dItems.length;
    const direct = dItems.length ? `<ul class="items direct">${dItems.map(it => ed ? editRowHtml(it, c.direct.key, q) : rowHtml(p, it, q)).join("")}</ul>`
      : ed && !searching && !subs.length ? `<p class="drop-zone"${dz(c.direct.key)}>Drag items here to put them straight in ${esc(c.name)}</p>` : "";
    if (!subs.length && !dItems.length && (!ed || searching)) continue;
    const nSel = selCount(p, e => e.c.id === c.id && e.h.id === h.id);
    const open = searching || app.cat === c.id || app.open.has(c.id);
    const addSub = ed ? `<div class="add-row"><button class="add-head" type="button" data-act="new-item" data-k="${esc(c.direct.key)}">+ New item in ${esc(c.name)}</button><button class="add-head" type="button" data-act="new-folder" data-k="${esc(c.id)}">+ New folder in ${esc(c.name)}</button></div>` : "";
    out.push(`<details class="cat" data-k="${esc(c.id)}"${dz(c.direct.key)} style="--tape: ${catTape(c)}" ${open ? "open" : ""}><summary${dz(c.direct.key)}><span class="cat-title">${ed ? `<button class="handle" type="button" data-drag="ccat" data-id="${esc(c.id)}" data-label="${esc(c.name)}" aria-label="Move ${esc(c.name)}: drag, or use the arrow keys">${GRIP}</button>` : ""}${tapeIcon(c.id, c.name)}${esc(c.name)}${pen(c.id, c.name)}</span><span class="sumr">${selBadge(nSel, c.id)}<span class="cnt">${cn}</span>${CHEV}</span></summary><div class="cat-body">${direct}${subs.join("")}${addSub}</div></details>`);
  }
  if (ed && !searching) out.push(`<button class="add-head big" type="button" data-act="new-cat">+ Add category or subcategory</button>`);
  const lq = searching ? parseLensQuery(app.q) : null;
  const banner = lq ? `<button class="f-banner" type="button" data-act="fin-open" data-mm="${esc(lq.f)}" data-t="${esc(lq.t)}">${RULER_ICON}<span><b>${esc(lq.f)}mm${lq.t ? " · T" + esc(lq.t) : ""}</b>See the exact lens and the closest ones on a ruler</span><span aria-hidden="true">→</span></button>` : "";
  return banner + (out.length ? out.join("") : `<p class="empty">Nothing in ${esc(h.name)} matches "${esc(app.q)}". Try part of the model name, the brand, or a focal length like 35mm.</p>`);
}
/* ----- Lens search: a lens by focal length and stop, plus lens type, mount and format.
   The exact match sits in the middle of a ruler, shorter lenses to the left, longer to the right. ----- */
/* a cine lens from the side: mount, barrel with its focus and iris rings, wider front */
const LENS_ICON = `<svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><rect x="1.8" y="9.2" width="2.7" height="5.6" rx=".5"/><rect x="4.5" y="7" width="10.5" height="10" rx="1"/><path d="M7.6 7v10M10.2 7v10M7.6 5.6v1.4M8.9 5.6v1.4M10.2 5.6v1.4"/><path d="M15 5.2h5.6a1 1 0 0 1 1 1v11.6a1 1 0 0 1-1 1H15z"/><path d="M18.3 8.2v7.6"/></svg>`;
const RULER_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 18h18M5 18v-4M9 18v-7M12 18v-4M15 18v-7M19 18v-4"/></svg>`;
const fin = () => app.finder || (app.finder = { on: false, f: "50", t: "", kind: "", mount: "", cov: "", brand: "", more: {} });
const numIn = s => parseFloat(String(s || "").replace(",", "."));
const fmtN = x => String(Math.round(x * 10) / 10);
const COVER = { "2/3": 0, S16: 1, MFT: 2, "APS-C": 3, S35: 4, FF: 5, LF: 6, MF: 7 };
const MOUNTS = [["PL", "PL"], ["LPL", "LPL"], ["EF", "Canon EF"], ["E", "Sony E"], ["L", "L-Mount"], ["M", "Leica M"], ["MFT", "Micro Four Thirds"], ["G", "Fujifilm G"], ["DL", "DJI DL"], ["B4", "B4 (2/3\")"], ["Other", "Other"]];
const CINE_SUBS = ["cine_sets", "cine_primes", "cine_zooms", "anamorphic", "specialty", "pl"];
/* which mounts a lens comes in: from its name ("PL/EF/E Mount", "LPL-Mount", "For Sony E"), else from where the rental house lists it */
function lensMounts(it, sub, sp) {
  const n = it.name || "", m = new Set();
  if (/\bLPL\b/.test(n)) m.add("LPL");
  if (/\bPL\b/.test(n)) m.add("PL");
  if (/\bEF\b|\bEF(?=\d)|\bEF-S\b/.test(n)) m.add("EF");
  if (/(^|[\s/\\(])E(?=[\s\-/\\)]|$)|\bFE\b/.test(n)) m.add("E");
  if (/\bL-Mount\b|\bLumix S\b/i.test(n)) m.add("L");
  if (/\bM-Mount\b/i.test(n)) m.add("M");
  if (/\bMFT\b|\bLumix G\b|\bLeica DG\b|\bPanasonic Leica\b/i.test(n)) m.add("MFT");
  if (/\bGFX?\b/i.test(n)) m.add("G");
  if (/^DJI\b/i.test(n)) m.add("DL");
  if (/For Sony E\b/i.test(n)) { m.clear(); m.add("E"); }
  if (!m.size) {
    const s = sub || "";
    if (s === "b4" || sp.cov === "2/3") m.add("B4");
    else if (s === "e_mount") m.add("E");
    else if (s === "ef_mount") m.add("EF");
    else if (s === "mft") m.add("MFT");
    else if (s === "e_ef") m.add(/^Canon\b/i.test(n) ? "EF" : "E");
    else if (/Signature Prime/i.test(n)) m.add("LPL");
    else if (CINE_SUBS.includes(s)) m.add("PL");
    else m.add("Other");
  }
  return [...m];
}
const LENS_SPEC = new WeakMap();
/* focal lengths (one, a set's list, or a zoom range), stop range, format, mounts and kind of a lens */
function lensSpec(it, sub) {
  if (LENS_SPEC.has(it)) return LENS_SPEC.get(it);
  const L = it.lens || {}, name = it.name || "", fs = L.focals || "";
  const nums = (fs.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  let focals = null, zoom = null;
  if (L.set && nums.length) focals = nums;
  else if (/[–-]/.test(fs) && nums.length >= 2) zoom = [nums[0], nums[1]];
  else if (nums.length) focals = [nums[0]];
  else if (it.lens) {
    const z = name.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*mm/i), one = name.match(/(\d+(?:\.\d+)?)\s*mm/i);
    if (z) zoom = [+z[1], +z[2]]; else if (one) focals = [+one[1]];
  }
  let stop = null, label = L.stop || "";
  const sn = (label.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (sn.length) stop = [sn[0], sn[sn.length - 1]];
  else {
    const m = name.match(/\b([TF])\s?\/?\s?(\d{1,2}(?:\.\d)?)\b/i);
    if (m && +m[2] >= 0.7 && +m[2] <= 22) { stop = [+m[2], +m[2]]; label = (m[1].toUpperCase() === "F" ? "f/" : "T") + m[2]; }
  }
  let spec = null;
  if (it.lens && (focals || zoom)) {
    spec = { focals, zoom, set: !!L.set, stop, label, cov: L.coverage || "", squeeze: L.squeeze || "" };
    spec.ana = !!(spec.squeeze || /anamorph/i.test(name) || sub === "anamorphic");
    spec.probe = /probe|pro2be|x-tract|skater ?scope/i.test(name);
    spec.macro = /macro/i.test(name);
    spec.tilt = /tilt|shift|swing/i.test(name);
    spec.fisheye = /fish-?eye/i.test(name);
    spec.mounts = lensMounts(it, sub, spec);
    if (spec.set && focals) {  // a set lens by lens: its own stop where known, or the set's one stop
      const st = L.stops || {}, one = stop && stop[0] === stop[1] ? label : "";
      spec.per = focals.map(f => { const lab = st[String(f)] || one; return { f, label: lab, n: lab ? parseFloat(lab.replace(/^[^\d]*/, "")) : null }; });
    }
  }
  LENS_SPEC.set(it, spec);
  return spec;
}
const lensType = sp => sp.zoom ? "zoom" : sp.set ? "set" : "prime";
/* the Lens type menu: spherical and anamorphic, each as primes, sets or zooms, then the specialty lenses */
const KINDS = [
  ["Spherical", [["sph", "All spherical", sp => !sp.ana], ["sph-prime", "Spherical primes", sp => !sp.ana && lensType(sp) !== "zoom"], ["sph-zoom", "Spherical zooms", sp => !sp.ana && lensType(sp) === "zoom"]]],
  ["Anamorphic", [["ana", "All anamorphic", sp => sp.ana], ["ana-prime", "Anamorphic primes", sp => sp.ana && lensType(sp) !== "zoom"], ["ana-zoom", "Anamorphic zooms", sp => sp.ana && lensType(sp) === "zoom"]]],
  ["Specialty", [["probe", "Probe lenses", sp => sp.probe], ["macro", "Macro", sp => sp.macro], ["tilt", "Tilt & shift", sp => sp.tilt], ["fisheye", "Fisheye", sp => sp.fisheye]]]];
/* primes cover single lenses and the lenses in sets alike (an older "sets" choice reads as primes) */
const kindTest = v => { v = v === "sph-set" ? "sph-prime" : v === "ana-set" ? "ana-prime" : v; for (const [, opts] of KINDS) for (const [k, , fn] of opts) if (k === v) return fn; return () => true; };
const houseLenses = h => { const out = []; for (const [id, e] of ITEM) if (e.h.id === h.id) { const sp = lensSpec(e.it, e.s.id); if (sp) out.push([id, e, sp]); } return out; };
/* stops between two apertures: + means a is slower than b */
const stopsBetween = (a, b) => 2 * Math.log2(a / b);
function stopGap(sp, T) {
  if (!T || !sp.stop) return null;
  const [a, b] = sp.stop;
  return T >= a && T <= b ? 0 : T < a ? stopsBetween(a, T) : stopsBetween(b, T);
}
function focalFit(sp, F) {
  if (sp.zoom) { const pos = Math.min(sp.zoom[1], Math.max(sp.zoom[0], F)); return { pos, d: Math.abs(Math.log(pos / F)) }; }
  let pos = sp.focals[0];
  for (const f of sp.focals) if (Math.abs(Math.log(f / F)) < Math.abs(Math.log(pos / F))) pos = f;
  return { pos, d: Math.abs(Math.log(pos / F)) };
}
function gapText(g, sp) {
  if (g == null) return "";
  if (g === 0 && sp.stop[0] !== sp.stop[1]) return "your stop is within its range";
  if (Math.abs(g) < 0.08) return "same stop";
  const n = Math.round(Math.abs(g) * 3), w = Math.floor(n / 3), r = n % 3;
  if (!n) return `a touch ${g < 0 ? "faster" : "slower"}`;
  return `${(w || "") + (r === 1 ? "⅓" : r === 2 ? "⅔" : "")} stop${n > 3 ? "s" : ""} ${g < 0 ? "faster" : "slower"}`;
}
/* every lens of this rental house within half to double the focal length that passes the filters, scored: focal first, then stop */
function finderMatches(h) {
  const s = fin(), F = numIn(s.f), T = numIn(s.t) > 0 ? numIn(s.t) : null;
  if (!(F > 0)) return null;
  const okKind = kindTest(s.kind), list = [];
  for (const [id, e, sp] of houseLenses(h)) {
    if (!okKind(sp)) continue;
    if (s.mount && !sp.mounts.includes(s.mount)) continue;
    if (s.brand && (e.it.brand || "Generic") !== s.brand) continue;
    if (s.cov && !((COVER[sp.cov] ?? -1) >= COVER[s.cov])) continue;
    const type = lensType(sp), { pos, d } = focalFit(sp, F);
    if (d > Math.log(2.05)) continue;
    // a set or zoom listed as "T1.5–T2.9" doesn't say which stop this focal length has, so it's close, never exact
    const lens = sp.per ? sp.per.find(x => x.f === pos) : null, one = lens && lens.n ? { stop: [lens.n, lens.n] } : null;
    const g = stopGap(one || sp, T), ranged = !one && !!(sp.stop && stopsBetween(sp.stop[1], sp.stop[0]) > 0.34);
    const hit = T != null && g != null && !ranged && Math.abs(g) < 0.08, exactF = d < 0.006;
    const score = d * 4 + (T == null ? 0 : g == null ? 1.2 : Math.abs(g) + (ranged ? 0.3 : 0)) + (type === "zoom" ? 0.35 : 0);  // a lens in a set counts like a single prime
    list.push({ id, e, sp, type, pos, d, g, hit, exact: exactF && (T == null || hit) && type !== "zoom", score, label: one ? lens.label : sp.label, ssp: one || sp });
  }
  return { F, T, list };
}
const colKey = x => x < 20 ? Math.round(x * 2) / 2 : Math.round(x);
/* a result card: the name on one line where it fits; the stop (of this focal length, for a set) and how far it is from yours;
   format · mount · kind; a set lens by lens; product page and Add */
function finderCard(p, m, T) {
  const it = m.e.it, sp = m.sp, on = !!p.items[m.id];
  const sc = T == null || m.g == null ? "" : m.hit ? " hit" : Math.abs(m.g) <= 0.7 ? " near" : "";
  const gap = T != null && m.g != null ? gapText(m.g, m.ssp) : "";
  const meta = [m.type === "set" ? `${m.pos}mm from a ${sp.focals.length}-lens set` : "", sp.cov, sp.mounts.filter(x => x !== "Other").join("/"), sp.ana ? (sp.squeeze ? sp.squeeze + " anamorphic" : "Anamorphic") : "", sp.probe ? "Probe" : sp.tilt ? "Tilt & shift" : sp.macro ? "Macro" : sp.fisheye ? "Fisheye" : ""].filter(Boolean);
  // a tap anywhere on the line opens it to everything about the lens; the link and Add stay where they are
  const open = !!(fin().rows || {})[m.id];
  const facts = [["Covers", COV_LABEL[sp.cov] || sp.cov], ["Mount", sp.mounts.filter(x => x !== "Other").join(", ")],
    ["Stop", sp.label ? sp.label + (sp.per && m.type === "set" ? " (the set)" : "") : ""],
    ["Focal length", sp.zoom ? `${fmtN(sp.zoom[0])}–${fmtN(sp.zoom[1])}mm zoom` : sp.per ? `${sp.focals.length} lenses, ${fmtN(sp.focals[0])}–${fmtN(sp.focals[sp.focals.length - 1])}mm` : `${fmtN(sp.focals[0])}mm`],
    ["Type", [sp.ana ? (sp.squeeze ? sp.squeeze + " anamorphic" : "Anamorphic") : "Spherical", sp.probe ? "probe" : sp.tilt ? "tilt and shift" : sp.macro ? "macro" : sp.fisheye ? "fisheye" : ""].filter(Boolean).join(", ")]].filter(([, v]) => v);
  return `<li class="f-card${on ? " on" : ""}${m.exact ? " exact" : ""}${open ? " open" : ""}" data-fcard="${esc(m.id)}">
    <button class="fv-tap" type="button" data-act="fv-row" data-id="${esc(m.id)}" aria-expanded="${open}" aria-label="${open ? "Less" : "More"} about ${esc(it.name)}"></button>
    <span class="f-nm" title="${esc(it.name)}">${nameHtml(lensShortName(it, sp), "")}</span>
    <span class="f-ext">${linkHtml(it, m.e.h)}</span>
    <span class="f-stopline"><span class="f-stop${sc}">${m.label ? esc(m.label) : "Stop ?"}</span>${gap ? `<span class="f-gap${m.hit ? " hit" : ""}">${gap}</span>` : ""}</span>
    <span class="ctl">${ctlHtml(p, m.id)}</span>
    <span class="f-meta">${meta.map(esc).join(" · ")}</span>
    ${sp.per ? `<span class="f-per">${perHtml(sp.per, m.pos, 2)}</span>` : ""}
    <span class="f-info"><span class="f-info-in"><span class="f-info-body">
      ${it.name !== lensShortName(it, sp) ? `<span class="f-full">${esc(it.name)}</span>` : ""}
      <dl>${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      ${sp.per ? `<span class="f-set"><span class="f-set-h">Lens by lens</span>${perHtml(sp.per, m.pos)}</span>` : ""}
      ${noteOf(m.id) ? `<span class="inote">${esc(noteOf(m.id))}</span>` : ""}
    </span></span></span>
  </li>`;
}
let rulerKey = null, rulerRaf = 0;
if (typeof addEventListener === "function") addEventListener("scroll", () => {
  if (rulerRaf) return;
  rulerRaf = requestAnimationFrame(() => {
    rulerRaf = 0;
    const r = document.getElementById("fRuler"); if (!r) { rulerKey = null; return; }
    let here = null;
    for (const c of r.querySelectorAll(".f-col")) { const bx = c.getBoundingClientRect(); if (bx.top <= 28 && bx.bottom > 28) { here = c; break; } }
    const k = here ? here.dataset.col : null;
    if (k === rulerKey) return;
    rulerKey = k;
    r.querySelectorAll(".f-col.here").forEach(c => c.classList.remove("here")); if (here) here.classList.add("here");
  });
}, { passive: true });
/* a long column: the makers in it, one tap to see only theirs */
function narrowHtml(ms) {
  const n = new Map(); for (const m of ms) { const b = m.e.it.brand || "Generic"; n.set(b, (n.get(b) || 0) + 1); }
  const top = [...n].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return `<div class="f-narrow"><span>Or see one maker</span><div class="f-narrow-chips">${top.map(([b, c]) => `<button class="chip" type="button" data-act="fin-narrow" data-b="${esc(b)}">${esc(b)} <span class="num">${c}</span></button>`).join("")}</div></div>`;
}
function finderResults(p, h) {
  const r = finderMatches(h);
  if (!r) return `<p class="f-none">Type a focal length to start, for example 50.</p>`;
  const { F, T, list } = r, ck = colKey(F), by = new Map([[ck, []]]);
  for (const m of list) { const k = colKey(m.pos); if (!by.has(k)) by.set(k, []); by.get(k).push(m); }
  let keys = [...by.keys()].sort((a, b) => a - b);
  const ci = keys.indexOf(ck); keys = keys.slice(Math.max(0, ci - 4), ci + 6);
  // best first; where matches are as good, single primes and lenses from sets take turns
  const mix = ms => { ms.sort((a, b) => a.score - b.score); const n = {}; for (const m of ms) m.rk = n[m.type] = (n[m.type] ?? -1) + 1; return ms.sort((a, b) => Math.round(a.score * 20) - Math.round(b.score * 20) || a.rk - b.rk || (a.type === "set") - (b.type === "set")); };
  for (const k of keys) mix(by.get(k));
  const shown = keys.flatMap(k => by.get(k)), nExact = shown.filter(m => m.exact).length;
  if (!shown.length) return `<p class="f-none">No lenses between ${fmtN(F / 2)} and ${fmtN(F * 2)}mm at ${esc(h.name)} with these filters.</p>`;
  // a ruler down the left: shorter at the top, longer further down; your focal length open, the others one line each until you open them
  const mo = fin().more;
  const cols = keys.map(k => {
    const ms = by.get(k), center = k === ck, open = center || !!mo["o" + k];
    const lim = (center ? 5 : 3) + 5 * (mo[k] || 0), left = ms.length - lim;
    const diff = center ? (ms.some(m => m.exact) ? "Exact" : "Your search") : `${k < F ? "−" : "+"}${fmtN(Math.abs(k - F))}mm`;
    const count = ms.length ? `${ms.length} lens${ms.length === 1 ? "" : "es"}` : "none";
    return `<section class="f-col${center ? " center" : ""}${open ? " open" : ""}" data-col="${k}" aria-label="${fmtN(k)}mm">
      <span class="fv-mark" aria-hidden="true"><b>${fmtN(k)}</b><small>mm</small></span>
      <div class="fv-body">
        <button class="fv-head" type="button" data-act="fv-toggle" data-mm="${k}" aria-expanded="${open}"${center ? " disabled" : ""}><span class="fv-diff">${diff}</span><span class="fv-n">${count}</span>${center ? "" : CHEV}</button>
        ${open ? (ms.length ? `<ul class="f-cards">${ms.slice(0, lim).map(m => finderCard(p, m, T)).join("")}</ul>` : `<p class="f-none">No ${fmtN(F)}mm${T ? " T" + fmtN(T) : ""} with these filters. The closest are just above and below.</p>`) : ""}
        ${open && left > 0 ? `<button class="f-more" type="button" data-act="fin-more" data-mm="${k}">Show ${Math.min(5, left)} more <span>· ${left} left at ${fmtN(k)}mm</span></button>` : ""}
        ${center && left > 5 && !fin().brand ? narrowHtml(ms) : ""}
      </div>
    </section>`;
  }).join("");
  return `<p class="f-sum"><b>${nExact}</b> exact · <b>${shown.length - nExact}</b> close · ${esc(h.name)}</p>
    <div class="fv" id="fRuler" role="region" aria-label="Lenses by focal length: shorter at the top, longer further down">${cols}</div>`;
}
function finderHtml(p, h) {
  const s = fin(), lens = h.categories.find(c => c.id === "lenses"), all = houseLenses(h);
  const count = fn => all.filter(([, , sp]) => fn(sp)).length;
  const sel = (key, v) => s[key] === v ? " selected" : "";
  const kinds = `<option value=""${sel("kind", "")}>Any lens (${all.length})</option>` + KINDS.map(([grp, opts]) => `<optgroup label="${grp}">${opts.map(([k, label, fn]) => { const n = count(fn); return n || s.kind === k ? `<option value="${k}"${sel("kind", k)}>${esc(label)} (${n})</option>` : ""; }).join("")}</optgroup>`).join("");
  const mounts = `<option value=""${sel("mount", "")}>Any mount</option>` + MOUNTS.map(([k, label]) => { const n = count(sp => sp.mounts.includes(k)); return n || s.mount === k ? `<option value="${k}"${sel("mount", k)}>${esc(label)} (${n})</option>` : ""; }).join("");
  const covs = [["", "Any format"], ["S16", "S16 and up"], ["S35", "S35 and up"], ["FF", "FF and up"], ["LF", "Large format"]].map(([k, label]) => `<option value="${k}"${sel("cov", k)}>${label}</option>`).join("");
  return `<div class="pad finder" style="--tape: ${lens ? catTape(lens) : "var(--pal-amber)"}">
    <div class="f-head"><div><h3 class="f-title">${tapeIcon("lenses")}Find a lens</h3><p class="hint">Your focal length opens first. Shorter lenses sit above it on the ruler, longer ones below.</p></div>
      <button class="btn sm" type="button" data-act="fin-close">Done</button></div>
    <div class="f-form">
      <div class="f-fields">
        <label class="f-field"><span>Focal length</span><span class="f-inp"><input data-fin="f" type="text" inputmode="decimal" autocomplete="off" value="${esc(s.f)}" placeholder="50" aria-label="Focal length in mm"><i>mm</i></span></label>
        <label class="f-field"><span>Stop</span><span class="f-inp"><i>f/</i><input data-fin="t" type="text" inputmode="decimal" autocomplete="off" value="${esc(s.t)}" aria-label="Stop (f-number or T-stop)"></span></label>
      </div>
      <div class="f-fields">
        <label class="f-field${s.kind ? " set" : ""}"><span>Lens type</span><select data-fin="kind">${kinds}</select></label>
        <div class="f-field${s.brand ? " set" : ""}"><span id="fb-lbl">Manufacturer</span><button class="f-pick" type="button" data-act="fin-brand" aria-labelledby="fb-lbl fb-val" aria-haspopup="dialog"><span id="fb-val">${esc(s.brand || "Any manufacturer")}</span>${CHEV}</button></div>
      </div>
      <div class="f-fields">
        <label class="f-field${s.mount ? " set" : ""}"><span>Mount</span><select data-fin="mount">${mounts}</select></label>
        <label class="f-field${s.cov ? " set" : ""}"><span>Covers</span><select data-fin="cov">${covs}</select></label>
      </div>
    </div>
    <div id="fRes" class="f-res">${finderResults(p, h)}</div>
  </div>`;
}
/* the lens search's manufacturer: a list with a search field on top */
function finBrandDialog() {
  const p = cur(), h = p && houseById(p.houseId); if (!h) return;
  const bn = new Map(); for (const [, e] of houseLenses(h)) bn.set(e.it.brand || "Generic", (bn.get(e.it.brand || "Generic") || 0) + 1);
  const cur0 = fin().brand || "";
  const row = (b, label, n) => `<li data-b="${esc(norm(label))}"><button type="button" data-act="fin-brand-pick" data-b="${esc(b)}" aria-pressed="${b === cur0}"><span>${esc(label)}</span>${n != null ? `<span class="num">${n}</span>` : ""}</button></li>`;
  showModal(`<div class="bpick"><h3 class="plain">Manufacturer</h3>
    <label class="search" for="bq"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><input id="bq" type="search" placeholder="Search manufacturers" autocomplete="off" aria-label="Search manufacturers"></label>
    <ul class="bp-list" id="bpList">${row("", "Any manufacturer", null)}${[...bn.entries()].sort((a, b) => brandSort(a[0], b[0])).map(([b, n]) => row(b, b, n)).join("")}</ul>
    <p class="hint" id="bpNone" hidden>No manufacturer by that name.</p>
    <div class="modal-actions"><button class="btn" type="button" data-act="modal-close">Cancel</button></div></div>`);
  document.getElementById("bq")?.focus();
}
function centerFinder() { const r = document.getElementById("fRuler"); if (r) r.dataset.c = "1"; }  // the ruler runs down the page now: nothing to center
function refreshFinder(keepKey) {
  const p = cur(), el = document.getElementById("fRes"); if (!p || !el) return;
  el.innerHTML = finderResults(p, houseById(p.houseId));
  centerFinder(keepKey);
}
/* a search like "50mm t1.9" offers the finder */
function parseLensQuery(q) {
  const m = String(q).match(/(\d{1,3}(?:[.,]\d)?)\s*mm\b/i); if (!m) return null;
  const t = String(q).match(/\b[tf]\s*\/?\s*(\d{1,2}(?:[.,]\d)?)\b/i);
  return { f: m[1].replace(",", "."), t: t ? t[1].replace(",", ".") : "" };
}

function refreshRows(p, ids) {
  for (const id of new Set(ids)) {
    const e = ITEM.get(id);
    document.querySelectorAll(`[data-row="${CSS.escape(id)}"]`).forEach(row => {
      if (!e) return;
      const tmp = document.createElement("ul"); tmp.innerHTML = rowHtml(p, e.it, norm(app.q.trim()));
      row.replaceWith(tmp.firstElementChild);
    });
    if (e) {
      const bk = grpOf(e.it, e.s);
      const cv = x => x.it.lens && COV_ORDER.includes(x.it.lens.coverage) ? x.it.lens.coverage : "";
      const keys = [[e.c.id, x => x.c.id === e.c.id], [e.s.key, x => x.s === e.s],
        [e.s.key + "/" + bk, x => x.s === e.s && grpOf(x.it, x.s) === bk], [e.s.key + "#" + (cv(e) || "other"), x => x.s === e.s && cv(x) === cv(e)]];
      for (const [k, pred] of keys) {
        const el = document.querySelector(`[data-sel="${CSS.escape(k)}"]`);
        if (el) { const n = selCount(p, x => x.h.id === e.h.id && pred(x)); el.textContent = n; el.hidden = !n; }
      }
    }
  }
  for (const id of new Set(ids)) document.querySelectorAll(`[data-fcard="${CSS.escape(id)}"]`).forEach(card => {
    card.classList.toggle("on", !!p.items[id]); const c = card.querySelector(".ctl"); if (c) c.innerHTML = ctlHtml(p, id);
  });
  const t = totals(p);
  const set = (sel, v) => { const el = document.getElementById(sel); if (el) el.textContent = v; };
  const tc = document.getElementById("tabCount"), was = tc ? parseInt(tc.textContent, 10) || 0 : 0;
  set("dockLines", t.lines); set("dockPcs", t.pcs); set("tabCount", t.lines || "");
  if (tc && t.lines > was) replay(tc, "bump");
}
/* touch feedback on phones that can vibrate (Android): a short tap on every press, a pattern when something is added,
   removed or needs a look, and a tiny tick as the lens ruler passes each focal length. Off in Settings. */
const HAPTIC = { tap: 8, tick: 5, add: [10, 35, 12], warn: [18, 60, 18], done: [8, 45, 18] };
const canBuzz = () => typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
function buzz(kind) { if (app.settings.haptics === false || !canBuzz()) return; try { navigator.vibrate(HAPTIC[kind] || 8); } catch (e) {} }
/* restart a short CSS animation on an element */
function replay(el, cls) { if (!el || !el.classList) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function popQty(kind, id, f) { if (typeof document === "undefined") return; document.querySelectorAll(`[data-${kind}qty="${CSS.escape(id)}"]${f ? `[data-f="${f}"]` : ""}`).forEach(el => replay(el, "pop")); }

/* ----- edit dialogs ----- */
function optList(pairs, sel) { return pairs.map(([v, t]) => `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${esc(t)}</option>`).join(""); }
/* group choices for a subcategory key ("" = a subcategory about to be made); ownMode adds "Same as brand" */
function groupOpts(h, skey, sel, ownMode) {
  const sub = skey ? subByKey(h, skey) : null;
  const brandOpt = !(sub && sub.groupBy) ? `<option value="__brand" ${sel === "__brand" ? "selected" : ""}>Same as manufacturer</option>` : `<option value="${NOFOLDER}" ${sel === NOFOLDER || sel === "" ? "selected" : ""}>No folder (straight in the subcategory)</option>`;
  if (!sub) return brandOpt + `<option value="__new">New group…</option>`;
  const gs = groupsOf(h, sub);
  if (sel && sel !== "__brand" && sel !== NOFOLDER && !gs.includes(sel)) gs.unshift(sel);
  return brandOpt + optList(gs.map(g => [g, headLabel(h, skey + "/" + g, g)]), sel) + `<option value="__new">New group…</option>`;
}
const NEW_CAT = `<option value="__new">+ New category…</option>`, NEW_SUB = `<option value="__new">+ New subcategory…</option>`;
const catOptions = (h, sel) => (sel === "__new" ? NEW_CAT.replace('">', '" selected>') : NEW_CAT) + `<optgroup label="Existing categories">${optList(h.categories.map(c => [c.id, c.name]), sel)}</optgroup>`;
const subOptions = (c, sel) => c
  ? optList([[c.direct.key, "None (directly in " + c.name + ")"], ...c.subcategories.map(s => [s.key, s.name])], sel) + (sel === "__new" ? NEW_SUB.replace('">', '" selected>') : NEW_SUB)
  : optList([["__none", "None"]], sel) + (sel === "__new" ? NEW_SUB.replace('">', '" selected>') : NEW_SUB);
const isDirect = v => v === "__none" || /\/_$/.test(v || "");
/* a category or subcategory typed by name: reuse one with the same name, or create it. Both return the subcategory key. */
function ensureCategory(h, name, subName, section) {
  const ex = h.categories.find(c => norm(c.name) === norm(name));
  if (ex) return [ex.id, subName ? ensureSub(h, ex.id, subName, section) : ex.id + "/_"];
  return addCategory(h, name, subName, section);
}
function ensureSub(h, cid, name, section) {
  const c = h.categories.find(x => x.id === cid);
  const ex = c && c.subcategories.find(s => norm(s.name) === norm(name));
  return ex ? ex.key : addSubcategory(h, cid, name, section);
}
/* the item dialog: edit a rental house item, edit one of the user's own, or make a new one (id null) at presetKey */
function catEditDialog(h, id, presetKey, opts = {}) {
  const e = id ? ITEM.get(id) : null;
  if (id && !e) return;
  const mode = !e ? "new" : e.it.own ? "own" : "base";
  const base = e ? BITEM.get(id) : null, own = mode === "own" ? ownItem(h, id) : null;
  const [pc, ps, pg] = presetKey ? splitKey(presetKey) : ["", "", ""];  // a folder's key has a third part: the folder
  let sub = e ? e.s : presetKey ? subByKey(h, pc + "/" + ps) : null;
  if (!sub) { const c0 = h.categories.find(c => c.id === app.cat && c.subcategories.length) || h.categories.find(c => c.subcategories.length); sub = c0.subcategories[0]; }
  const cat = catOfSub(h, sub), [hc, hs] = splitKey(sub.key);
  const gsel = mode === "base" ? (!sub.groupBy && grpOf(e.it, e.s) === e.it.brand ? "__brand" : grpOf(e.it, e.s)) : own && own.g ? own.g : pg && sub === subByKey(h, pc + "/" + ps) ? pg : sub.groupBy ? defaultGroup({}, sub, h) : "__brand";
  const sec = e ? e.it.section : opts.addTo || typicalSection(h, hc, hs, "accessories");
  const secs = optList(allSections().map(s => [s.id, secName(s.id)]), sec);
  const hint = mode === "base" ? `On the ${esc(h.name)} site: ${esc(base.site_name || base.name)}${base.sku ? ` · SKU ${esc(base.sku)}` : ""}`
    : mode === "own" ? "" : opts.addTo ? `It goes on the Camera List, and into ${esc(h.name)}'s catalog for next time. Check where it should live.` : `Added to ${esc(h.name)}'s catalog for you. Add it to any list like other items.`;
  const dupBtn = mode !== "new" ? `<button class="btn" type="button" data-act="cat-item-dup" data-id="${esc(id)}">Duplicate</button>` : "";
  const actions = mode === "base" ? `<button class="btn danger" type="button" data-act="cat-item-remove" data-id="${esc(id)}">Remove from catalog</button>` + (e.it.edited ? `<button class="btn ghost" type="button" data-act="cat-item-reset" data-id="${esc(id)}">Undo edits</button>` : "") + dupBtn
    : mode === "own" ? `<button class="btn danger" type="button" data-act="cat-item-delete" data-id="${esc(id)}">Delete item</button>` + dupBtn
    : opts.addTo ? `<button class="btn ghost" type="button" data-act="ci-listonly" data-to="${esc(opts.addTo)}">Only on this list</button>` : "";
  const brands = [...new Set([...ITEM.values()].filter(x => x.h === h).map(x => x.it.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  showModal(`<datalist id="ci-brands">${brands.map(b => `<option value="${esc(b)}"></option>`).join("")}</datalist><form class="form dialog" id="catItemForm" data-id="${esc(id || "")}" data-mode="${mode}"${opts.addTo ? ` data-addto="${esc(opts.addTo)}"` : ""} autocomplete="off">
    <h3 class="plain">${mode === "new" ? opts.addTo ? "Add to the list and the catalog" : "New item" : "Edit item"}</h3>
    <div class="field"><label for="ci-name">Name</label><input id="ci-name" name="name" maxlength="160" value="${esc(e ? e.it.name : opts.name || "")}" required>
      ${hint ? `<span class="hint">${hint}</span>` : ""}</div>
    <div class="field"><label for="ci-brand">Manufacturer</label><input id="ci-brand" name="brand" maxlength="60" value="${esc(mode === "base" ? e.it.brand || "" : own && own.brand || opts.brand || "")}"${mode === "base" ? "" : ` placeholder="Optional"`} list="ci-brands"></div>
    <div class="row2">
      <div class="field"><label for="ci-c">Category</label><select id="ci-c" name="c">${catOptions(h, cat.id)}</select>
        <input id="ci-cnew" name="cnew" maxlength="60" placeholder="New category name" aria-label="New category name" hidden></div>
      <div class="field"><label for="ci-s">Subcategory</label><select id="ci-s" name="s">${subOptions(cat, sub.key)}</select>
        <input id="ci-snew" name="snew" maxlength="60" placeholder="New subcategory name" aria-label="New subcategory name" value="General" hidden></div>
    </div>
    <div class="field" id="ci-gfield" hidden><label for="ci-g">Folder</label><select id="ci-g" name="g">${groupOpts(h, sub.key, gsel, mode !== "base")}</select>
      <input id="ci-gnew" name="gnew" maxlength="60" placeholder="New folder name" aria-label="New folder name" hidden></div>
    <details class="more"><summary>More${CHEV}</summary><div class="more-in">
      ${opts.addTo ? "" : `<div class="field"><label for="ci-note">Note</label><textarea id="ci-note" name="note" rows="2" maxlength="300" placeholder="Only you see it, in the catalog. Not added to the Camera List.">${esc(id ? noteOf(id) : "")}</textarea></div>`}
      ${opts.addTo ? "" : `<div class="field"><label for="ci-sku">SKU</label><input id="ci-sku" name="sku" maxlength="40" value="${esc(mode === "base" ? e.it.sku || "" : own && own.sku || "")}" placeholder="Optional"></div>`}
      ${mode !== "base" && !opts.addTo ? `<div class="field"><label for="ci-url">Link</label><input id="ci-url" name="url" type="url" inputmode="url" maxlength="500" value="${esc(own && own.url || "")}" placeholder="Optional: the product page"></div>` : ""}
      <div class="field"><label for="ci-sec">Camera List section</label><select id="ci-sec" name="section">${secs}</select><span class="hint">Where it goes on the Camera List and in the exports.</span></div>
      ${mode !== "new" && actions ? `<div class="more-acts">${actions}</div>` : ""}
    </div></details>
    <div class="modal-actions">${mode === "new" ? actions : ""}<span class="grow"></span>
      <button class="btn" type="button" data-act="modal-close">Cancel</button><button class="btn primary" type="submit">${mode === "new" ? "Add item" : "Save"}</button></div>
  </form>`);
  if (opts.addTo) { document.getElementById("ci-s")?.focus({ preventScroll: true }); const card = document.querySelector("#modal .modal-card"); if (card) card.scrollTop = 0; }
  else document.getElementById("ci-name")?.focus();
}
/* a copy of a catalog item, as one of the user's own, right under it; then its dialog opens to rename it */
function duplicateCatItem(h, id) {
  const e = ITEM.get(id); if (!e) return null;
  const own = e.it.own ? ownItem(h, id) : null, g = grpOf(e.it, e.s);
  const nid = createOwnItem(h, { name: e.it.name + " (copy)", brand: e.it.brand === "Generic" ? "" : e.it.brand, sku: own ? own.sku : "", url: e.it.url || "", s: e.s.key, g: e.s.groupBy ? g || NOFOLDER : g && g !== e.it.brand ? g : "__brand", section: e.it.section });
  if (nid) reorderItem(h, nid, id, true);
  return nid;
}
function noteDialog(id) {
  const e = ITEM.get(id); if (!e) return;
  const now = noteOf(id);
  showModal(`<form class="form dialog" id="noteForm" data-id="${esc(id)}" autocomplete="off">
    <h3 class="plain">Note</h3>
    <div class="field"><label for="nt-text">${esc(e.it.name)}</label><textarea id="nt-text" name="note" rows="3" maxlength="300" placeholder="">${esc(now)}</textarea>
      <span class="hint">Only you see it, here in the catalog. It isn't added to the Camera List or the exports.</span></div>
    <div class="modal-actions">${now ? `<button class="btn ghost" type="button" data-act="note-clear" data-id="${esc(id)}">Delete note</button>` : ""}<span class="grow"></span>
      <button class="btn" type="button" data-act="modal-close">Cancel</button><button class="btn primary" type="submit">Save</button></div>
  </form>`);
  const ta = document.getElementById("nt-text"); if (ta) { ta.focus(); ta.setSelectionRange && ta.setSelectionRange(ta.value.length, ta.value.length); }
}
/* category or subcategory picked in the dialog: refresh the lists under it */
function catDialogSync(changed) {
  const p = cur(), h = p && houseById(p.houseId), f = document.getElementById("catItemForm");
  if (!h || !f) return;
  const id = f.dataset.id, mode = f.dataset.mode, e = id ? ITEM.get(id) : null, ownMode = mode !== "base";
  const probe = mode === "base" ? BITEM.get(id) : { brand: (f.elements.brand?.value || "").trim() || "Generic" };
  const cs = f.elements.c, ss = f.elements.s, gs = f.elements.g;
  if (changed === "c") {
    const c = h.categories.find(x => x.id === cs.value);
    ss.innerHTML = subOptions(c, c ? (c.subcategories[0] ? c.subcategories[0].key : c.direct.key) : "__none");
  }
  if (changed === "c" || changed === "s") {
    const tgt = ss.value === "__new" || ss.value === "__none" ? null : subByKey(h, ss.value);
    const here = e && tgt && e.s === tgt;
    const own = mode === "own" ? ownItem(h, id) : null;
    const sel = here ? (own ? own.g || (tgt.groupBy ? defaultGroup(probe, tgt, h) : "__brand") : (!tgt.groupBy && grpOf(e.it, e.s) === e.it.brand ? "__brand" : grpOf(e.it, e.s)))
      : tgt ? (tgt.groupBy ? defaultGroup(probe, tgt, h) : "__brand") : "__brand";
    gs.innerHTML = groupOpts(h, tgt ? tgt.key : "", sel, true);
    if (tgt) { const [hc, hs] = splitKey(tgt.key); f.elements.section.value = here ? e.it.section : typicalSection(h, hc, hs, f.elements.section.value); }
  }
  f.elements.cnew.hidden = cs.value !== "__new";
  f.elements.snew.hidden = ss.value !== "__new";
  document.getElementById("ci-gfield").hidden = true;  // the folder isn't chosen here: it stays, or follows the subcategory
  if (changed === "c" && cs.value === "__new") f.elements.cnew.focus();
  else if (changed === "s" && ss.value === "__new") { f.elements.snew.focus(); f.elements.snew.select(); }
  f.elements.gnew.hidden = gs.value !== "__new";
  if (gs.value === "__new" && changed === "g") f.elements.gnew.focus();
}
function newHeadDialog(kind, h, cid) {
  const secs = optList(allSections().map(s => [s.id, secName(s.id)]), "accessories");
  const body = kind === "section"
    ? `<h3 class="plain">New Camera List section</h3>
      <div class="row2"><div class="field"><label for="nh-name">Section name</label><input id="nh-name" name="name" maxlength="60" required placeholder=""></div>
      <div class="field"><label for="nh-pos">Place it</label><select id="nh-pos" name="pos">${sectionSlots("R|aks")}</select></div></div>
      <p class="hint">Shows in every production and in the Word, PDF and CSV exports. Drag lines into it, or type items in.</p>`
    : `<h3 class="plain">Add a category or subcategory</h3>
      <div class="field"><label for="nh-cat">Category</label><select id="nh-cat" name="cat">${catOptions(h, cid || "__new")}</select>
        <input id="nh-name" name="name" maxlength="60" placeholder="New category name" aria-label="New category name" ${cid ? "hidden" : ""}></div>
      <div id="nh-color" ${cid ? "hidden" : ""}>${swatchField({ id: "__new", custom: true }, "nh-col")}</div>
      <div class="row2"><div class="field"><label for="nh-sub">Subcategory</label><input id="nh-sub" name="sub" maxlength="60" placeholder="${cid ? "" : "Optional: leave empty for none"}"></div>
      <div class="field"><label for="nh-sec">Camera List section</label><select id="nh-sec" name="section">${secs}</select></div></div>
      <p class="hint">Then drag items onto it, or pick it in an item's Edit.</p>`;
  showModal(`<form class="form dialog" id="newHeadForm" data-kind="${kind === "section" ? "section" : "cat"}" autocomplete="off">${body}
    <div class="modal-actions"><span class="grow"></span><button class="btn" type="button" data-act="modal-close">Cancel</button><button class="btn primary" type="submit">Add</button></div></form>`);
  document.getElementById(kind === "section" || !cid ? "nh-name" : "nh-sub")?.focus();
}
function folderDialog(h, parent) {
  const inCat = !parent.includes("/");
  const where = inCat ? h.categories.find(c => c.id === parent)?.name : subByKey(h, parent)?.name;
  const secs = inCat ? optList(allSections().map(s => [s.id, secName(s.id)]), typicalSection(h, parent, "_", "accessories")) : "";
  showModal(`<form class="form dialog" id="folderForm" data-parent="${esc(parent)}" autocomplete="off">
    <h3 class="plain">New folder in ${esc(where || "")}</h3>
    <div class="field"><label for="fd-name">Folder name</label><input id="fd-name" name="name" maxlength="60" required placeholder=""></div>
    ${inCat ? `<div class="field"><label for="fd-sec">Camera List section for its items</label><select id="fd-sec" name="section">${secs}</select></div>` : ""}
    <p class="hint">${inCat ? "It shows as a subcategory" : "It shows as a group"} in ${esc(where || "")}. Drag items into it.</p>
    <div class="modal-actions"><span class="grow"></span><button class="btn" type="button" data-act="modal-close">Cancel</button><button class="btn primary" type="submit">Add folder</button></div>
  </form>`);
  document.getElementById("fd-name")?.focus();
}
function mfrDialog(h, gkey, brand) {
  const [c, sId, g] = splitKey(gkey), s = subOf(h, c, sId);
  const n = s ? s.items.filter(x => grpOf(x, s) === g && (x.brand || "Generic") === brand).length : 0;
  showModal(`<form class="form dialog" id="mfrForm" data-k="${esc(gkey)}" data-b="${esc(brand)}" autocomplete="off">
    <h3 class="plain">Rename manufacturer</h3>
    <div class="field"><label for="mf-name">Manufacturer</label><input id="mf-name" name="name" maxlength="60" value="${esc(brand)}" required></div>
    <p class="hint">The ${n} item${n === 1 ? "" : "s"} under ${esc(brand)} here move to this name. Typing a name that's already in the list puts them with that manufacturer. To change just one item, drag it to another manufacturer or use its Edit.</p>
    <div class="modal-actions"><span class="grow"></span><button class="btn" type="button" data-act="modal-close">Cancel</button><button class="btn primary" type="submit">Save</button></div>
  </form>`);
  const inp = document.getElementById("mf-name"); if (inp) { inp.focus(); inp.select(); }
}
function removedDialog(h) {
  const list = hiddenItems(h).sort((a, b) => BLOC.get(a.id).ord - BLOC.get(b.id).ord);
  showModal(`<div class="form dialog"><h3 class="plain">Removed from ${esc(h.name)}'s catalog</h3>
    ${list.length ? `<ul class="pick-list">${list.map(it => `<li><span class="info"><span class="nm">${esc(it.name)}</span></span><button class="btn sm" type="button" data-act="cat-item-restore" data-id="${esc(it.id)}" data-house="${esc(h.id)}">Bring back</button></li>`).join("")}</ul>` : `<p class="hint">Nothing removed.</p>`}
    <div class="modal-actions"><span class="grow"></span><button class="btn primary" type="button" data-act="modal-close">Done</button></div></div>`);
}
function headDialog(scope, h, k) {
  const orig = headOrig(scope, h, k);
  const now = scope === "section" ? secName(k) : headLabel(h, k, orig);
  const [, s, g] = splitKey(k);
  const what = scope === "section" ? "Camera List section" : g ? "folder" : s ? "subcategory" : "category";
  const ownFolder = scope !== "section" && g && isOwnGroup(h, k);
  const own = scope === "section" ? (app.settings.customSections || []).find(c => c.id === k) : ownFolder || customDef(h, k);
  const nOwn = scope === "section" || !own || ownFolder ? 0 : ownItemsIn(h, k).length;
  const delWhat = (scope === "section" ? "Its items move back to their usual section." : ownFolder ? "Items in it go back to their usual group." : s ? "Rental house items in it go back to where the rental house lists them." : "Rental house items and subcategories in it go back to where the rental house lists them.")
    + (nOwn ? ` The ${nOwn} item${nOwn === 1 ? "" : "s"} you created in it ${nOwn === 1 ? "is" : "are"} deleted too.` : "");
  const catObj = scope !== "section" && !s && !g ? h.categories.find(c => c.id === k) : null;
  showModal(`<form class="form dialog" id="headForm" data-scope="${scope}" data-k="${esc(k)}" autocomplete="off">
    <h3 class="plain">${catObj ? "Edit" : "Rename"} ${what}</h3>
    ${scope !== "section" && s && !g && subOf(h, splitKey(k)[0], s) && !subOf(h, splitKey(k)[0], s).groupBy ? `<label class="check"><input type="checkbox" name="flat" ${isFlat(h, subOf(h, splitKey(k)[0], s)) ? "checked" : ""}> Show as one list divided by manufacturer</label>` : ""}
    ${scope !== "section" && g ? `<label class="check"><input type="checkbox" name="split" ${splitByBrand(h, subOf(h, splitKey(k)[0], splitKey(k)[1]) || {}, g) ? "checked" : ""}> Divide this ${what} by manufacturer</label>` : ""}
    <div class="field"><label for="hd-name">Name</label><input id="hd-name" name="name" maxlength="60" value="${esc(now)}" required>
      ${now !== orig ? `<span class="hint">Original name: ${esc(orig)}</span>` : scope === "section" ? `<span class="hint">Used in every list and in the Word, PDF and CSV exports.</span>` : ""}</div>
    ${catObj ? swatchField(catObj, "hd-col") : ""}
    ${own ? `<p class="hint">You made this ${what}. ${delWhat}</p>` : ""}
    <div class="modal-actions">${own ? `<button class="btn danger" type="button" data-act="head-delete" data-scope="${scope}" data-k="${esc(k)}">Delete</button>` : now !== orig ? `<button class="btn ghost" type="button" data-act="head-reset" data-scope="${scope}" data-k="${esc(k)}">Use original</button>` : ""}<span class="grow"></span>
      <button class="btn" type="button" data-act="modal-close">Cancel</button><button class="btn primary" type="submit">Save</button></div>
  </form>`);
  const inp = document.getElementById("hd-name"); if (inp) { inp.focus(); inp.select && inp.select(); }
}

/* ----- Favorites tab ----- */
function favoritesFor(p) {
  const favs = app.settings.favorites;
  const starred = [], custom = [];
  for (const [k, f] of Object.entries(favs)) {
    if (k.startsWith("c:")) custom.push({ key: k, ...f });
    else { const e = ITEM.get(k); if (e && e.h.id === p.houseId) starred.push(e); }
  }
  starred.sort((a, b) => a.ord - b.ord);
  const counts = new Map();
  for (const o of app.productions) {
    if (o.id === p.id || o.houseId !== p.houseId) continue;
    for (const id of Object.keys(o.items || {})) if (ITEM.has(id) && !favs[id]) counts.set(id, (counts.get(id) || 0) + 1);
  }
  const used = [...counts.entries()].sort((a, b) => b[1] - a[1] || ITEM.get(a[0]).ord - ITEM.get(b[0]).ord).slice(0, 60).map(([id, n]) => ({ e: ITEM.get(id), n }));
  return { starred, custom, used };
}
function customLineId(p, name, section) { return Object.keys(p.items).find(id => p.items[id].custom && flat(p.items[id].name) === flat(name) && p.items[id].section === section); }
function viewFavorites(p, h) {
  const f = favoritesFor(p);
  const cRows = f.custom.map(c => {
    const lid = customLineId(p, c.name, c.section);
    const ctl = lid ? stepper("l", lid, p.items[lid].qty, null, false) : `<button class="add" type="button" data-act="addfav" data-name="${esc(c.name)}" data-section="${esc(c.section)}">+ Add</button>`;
    return `<li class="item ${lid ? "on" : ""}">${starBtn(c.key, c)}<span class="info"><span class="nm">${esc(c.name)}</span><span class="specs"><span>${esc(secName(c.section))}</span></span></span><span class="ctl">${ctl}</span></li>`;
  }).join("");
  const starred = favByCategory(h, f.starred.map(e => [e, rowHtml(p, e.it, "")]));
  const typed = cRows ? `<div class="fav-cat" style="--tape: var(--tape-custom)"><h4 class="fav-cat-h">${tapeIcon("custom")}Not in the catalog<span class="cnt">${f.custom.length}</span></h4><ul class="fav-list">${cRows}</ul></div>` : "";
  const used = favByCategory(h, f.used.map(({ e, n }) => [e, rowHtml(p, e.it, "", `In ${n} production${n === 1 ? "" : "s"}`)]));
  return `<section class="pad">
    <div class="fav-group"><h3>Starred</h3>
      ${starred || typed ? starred + typed : `<p class="hint">Tap ☆ next to any item in Add gear or in the list to keep it here for quick picking.</p>`}</div>
    <div class="fav-group"><h3>Used before</h3>
      ${used || `<p class="hint">Items from your other ${esc(h.name)} productions will show up here.</p>`}</div>
  </section>`;
}
/* favorites laid out like the catalog: one open block per category, a small heading per subcategory, catalog order inside */
function favByCategory(h, rows) {
  const cats = h.categories.map(c => ({ c, subs: new Map() }));
  for (const [e, html] of rows.sort((a, b) => a[0].ord - b[0].ord)) {
    const b = cats.find(x => x.c === e.c); if (!b) continue;
    if (!b.subs.has(e.s)) b.subs.set(e.s, []);
    b.subs.get(e.s).push(html);
  }
  return cats.filter(b => b.subs.size).map(({ c, subs }) => {
    const n = [...subs.values()].reduce((a, l) => a + l.length, 0);
    // items placed straight in the category come first, without a heading
    const list = [...subs.entries()].sort((a, b) => (a[0].direct ? 0 : 1) - (b[0].direct ? 0 : 1))
      .map(([s, l]) => (s.direct ? "" : `<li class="fav-head">${esc(s.name)}<span class="cnt">${l.length}</span></li>`) + l.join("")).join("");
    return `<div class="fav-cat" style="--tape: ${catTape(c)}"><h4 class="fav-cat-h">${tapeIcon(c.id, c.name)}${esc(c.name)}<span class="cnt">${n}</span></h4><ul class="fav-list">${list}</ul></div>`;
  }).join("");
}

/* ----- Gear list: the production's list, in the user's section layout ----- */
function linesBySection(p) {
  const by = Object.fromEntries(allSections().map(s => [s.id, []]));
  // a line whose section was deleted goes back to its catalog section, or AKS
  for (const [id, l] of Object.entries(p.items)) (by[l.section] || by[ITEM.get(id)?.it.section] || by.aks).push([id, l]);
  // lines the user dragged keep their place; the rest follow catalog order, typed-in items last
  const key = l => l.pos !== undefined ? [0, l.pos, 0] : [1, l.custom ? 1e9 : (l.ord || 0), l.added || 0];
  for (const k in by) by[k].sort((a, b) => { const x = key(a[1]), y = key(b[1]); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
  return by;
}
function lineHtml(p, id, l) {
  const e = ITEM.get(id);
  const key = l.custom ? favKeyCustom(l.name, l.section) : id;
  const qtys = l.tx !== undefined
    ? `<span class="qtys"><span class="tr q-sets"><span>Sets</span>${stepper("l", id, lineQty(l), null, false)}</span><span class="q-txrx"><span class="tr"><span>TX</span>${stepper("l", id, l.tx, "tx", true)}</span><span class="tr"><span>RX</span>${stepper("l", id, l.rx, "rx", true)}</span></span></span>`
    : stepper("l", id, l.qty, null, false);
  const kids = (l.children || []).length ? `<ul class="kids">${l.children.map(c => `<li>– ${c.qty}x ${esc(c.name)}</li>`).join("")}</ul>` : "";
  const specs = e ? specsHtml(e.it, "", { list: true }) : "";
  const hay = norm([l.name, l.note, l.brand, l.sku || (e && e.it.sku), ...(l.children || []).map(c => c.name)].filter(Boolean).join(" "));
  const editing = app.editing === id;
  // the line's editor: name, sub-items, note. Its section follows where the item lives in the catalog
  const editor = editing ? `<div class="editor">
      <div class="field"><label for="en-${esc(id)}">Name</label><input id="en-${esc(id)}" type="text" data-ename="${esc(id)}" value="${esc(l.name)}">${e ? `<span class="hint">A new name is kept in ${esc(e.h.name)}'s catalog too, for your next lists.</span>` : ""}</div>
      <div class="field"><span class="lbl">Sub-items</span>
        <ul class="children">${(l.children || []).map(c => `<li class="child">${stepper("k", id + "|" + c.id, c.qty, null, true)}<input type="text" data-kname="${esc(id + "|" + c.id)}" value="${esc(c.name)}" aria-label="Sub-item name"><button class="x" type="button" data-act="krm" data-id="${esc(id + "|" + c.id)}" aria-label="Remove ${esc(c.name)}">×</button></li>`).join("")}</ul>
        <form class="custom-add" data-kadd="${esc(id)}" autocomplete="off"><input name="name" placeholder="Add a sub-item" aria-label="New sub-item"><button type="submit">+ Add</button></form></div>
      <div class="field"><label for="eo-${esc(id)}">Note</label><input id="eo-${esc(id)}" type="text" data-note="${esc(id)}" placeholder="Shown in brackets after the name" value="${esc(l.note)}"></div>
      <div class="editor-actions"><button class="btn" type="button" data-act="dup-line" data-id="${esc(id)}">Duplicate</button><button class="btn primary" type="button" data-act="edit-done">Done</button></div>
    </div>` : "";
  return `<li class="line" data-line="${esc(id)}" data-s="${esc(hay)}">
      <div class="l-top"><button class="handle" type="button" data-drag="line" data-id="${esc(id)}" aria-label="Move ${esc(l.name)}: drag, or use the arrow keys">${GRIP}</button><span class="nm">${esc(l.name)}${l.note ? ` <span class="note">(${esc(l.note)})</span>` : ""}</span>
        <span class="tools">${(e && linkHtml(e.it, e.h)) || `<span class="ext-gap" aria-hidden="true"></span>`}${starBtn(key, { name: l.name, section: l.section })}<button class="iconbtn" type="button" data-act="edit-line" data-id="${esc(id)}" aria-label="Edit ${esc(l.name)}" aria-expanded="${editing}">✎</button><button class="x" type="button" data-act="remove" data-id="${esc(id)}" aria-label="Remove ${esc(l.name)}">×</button></span></div>
      ${specs ? `<div class="l-meta">${specs}</div>` : ""}
      ${kids}
      <div class="l-bottom">${qtys}${l.autoWhy ? `<span class="auto">${esc(`${l.auto} auto-added: ${l.autoWhy}`)}</span>` : ""}</div>
      ${editor}
    </li>`;
}
/* ----- Media: for each camera on the list, how long a card records at the format it shoots, and how many cards go on the list ----- */
const CARD_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h8l4 4v14H7z"/><path d="M10 3v4M13 3v4M16 4v3"/></svg>`;
const hasRec = e => !!(e && e.it.camera && !e.it.camera.film && ((e.it.camera.media || []).length || recProfile(e.it.name)));
const shortCard = n => String(n || "").replace(/\b(Memory Card|Card|Memory)\b/gi, "").replace(/\s{2,}/g, " ").trim();
const recKey = name => (REC_OF.find(([re]) => re.test(name || "")) || [])[1] || "";
/* the card a camera's figures use: the one picked, else one of its kind already on the list, else a 1TB one (or the biggest under that) */
function pickCard(e, houseId) {
  const choices = cardChoices(e, houseId); if (!choices.length) return "";
  const first = choices.filter(c => c.type === choices[0].type), size = c => cardBytes(c.name) || 1;
  return (first.filter(c => size(c) <= 1.01e12).sort((a, b) => size(b) - size(a))[0] || first.sort((a, b) => size(a) - size(b))[0]).id;
}
function recEnsure(l, e, p) {
  const r = l.rec || (l.rec = {});
  if (p && (!r.card || !ITEM.has(r.card))) { const ch = cardChoices(e, p.houseId); r.card = (ch.find(c => p.items[c.id]) || {}).id || pickCard(e, p.houseId); }
  const prof = recProfile(e.it.name); if (!prof || r.mbps) return;
  const last = (app.settings.recLast || {})[recKey(e.it.name)] || {};
  const c = prof.find(x => x.n === r.codec) || prof.find(x => x.n === last.codec) || prof[0];
  r.codec = c.n;
  const md = c.m.find(x => x[0] === r.mode) || c.m.find(x => x[0] === last.mode) || c.m[0];
  r.mode = md[0];
  const fps = r.fps || last.fps || app.settings.recFps || 25, opts = REC_FPS.filter(f => f <= md[3]);
  r.fps = opts.includes(fps) ? fps : opts.filter(f => f <= fps).pop() || opts[0] || 24;
}
function mediaCamHtml(p, id) {
  const l = p.items[id], e = ITEM.get(id); if (!l || !e) return "";
  recEnsure(l, e, p);
  const r = recResult(l, e), choices = cardChoices(e, p.houseId), card = l.rec.card, onList = card && p.items[card] ? lineQty(p.items[card]) : 0;
  const c = r.c, md = r.md, sizeUnknown = card && !cardBytes(ITEM.get(card)?.it.name || "");
  const fmtPart = r.prof ? `<div class="mc-fmt"><div class="field"><label for="rs-codec-${esc(id)}">Format</label><select id="rs-codec-${esc(id)}" data-rec="codec" data-id="${esc(id)}">${r.prof.map(x => `<option ${x === c ? "selected" : ""}>${esc(x.n)}</option>`).join("")}</select></div>
      <div class="field"><label for="rs-mode-${esc(id)}">Resolution</label><select id="rs-mode-${esc(id)}" data-rec="mode" data-id="${esc(id)}">${(c ? c.m : []).map(x => `<option value="${esc(x[0])}" ${x === md ? "selected" : ""}>${esc(x[0])} · ${x[1]}×${x[2]}</option>`).join("")}</select></div></div>
      <div class="field"><span class="lbl" id="rs-fps-${esc(id)}">Frame rate</span><div class="chips wrap fps" role="group" aria-labelledby="rs-fps-${esc(id)}">${REC_FPS.filter(f => !md || f <= md[3]).map(f => `<button type="button" class="chip" data-act="rec-fps" data-id="${esc(id)}" data-fps="${f}" aria-pressed="${l.rec.fps === f}">${fpsLabel(f)}</button>`).join("")}</div></div>`
    : `<div class="field"><label for="rs-mbps-${esc(id)}">Data rate (Mbps)</label><input id="rs-mbps-${esc(id)}" type="number" inputmode="decimal" min="1" max="20000" data-rec="mbps" data-id="${esc(id)}" value="${l.rec.mbps || ""}"></div>`;
  const rate = r.rate ? (r.rate >= 1e8 ? Math.round(r.rate / 1e6) : (r.rate / 1e6).toFixed(1)) + " MB/s" : "";
  return `<div class="media-cam" id="mc-${esc(id)}">
    <h3 class="mc-name">${esc(l.name)}${lineQty(l) > 1 ? ` <small>× ${lineQty(l)}</small>` : ""}</h3>
    <div class="field"><span class="lbl">Card</span>${choices.length ? `<div class="chips wrap">${choices.map(x => `<button type="button" class="chip" data-act="rec-card" data-id="${esc(id)}" data-card="${esc(x.id)}" aria-pressed="${card === x.id}">${esc(shortCard(x.name))}</button>`).join("")}</div>` : `<p class="hint">Not in ${esc(houseById(p.houseId)?.name || "the")} catalog</p>`}</div>
    ${sizeUnknown ? `<div class="field"><span class="lbl">Card size</span><div class="chips wrap">${[64, 128, 256, 512, 1000, 2000].map(g => `<button type="button" class="chip" data-act="rec-gb" data-id="${esc(id)}" data-gb="${g}" aria-pressed="${l.rec.gb === g}">${g >= 1000 ? g / 1000 + "TB" : g + "GB"}</button>`).join("")}</div></div>` : ""}
    ${fmtPart}
    <div class="mc-out">
      <div class="mc-res"><div class="mc-big">${r.per ? fmtDur(r.per) : "–"}</div><div class="mc-sub">one card${rate ? ` · ${rate}` : ""}</div></div>
      ${card ? `<div class="mc-list"><span class="stepper"><button type="button" data-act="mq" data-id="${esc(id)}" data-d="-1" aria-label="One card less"${onList ? "" : " disabled"}>−</button><b class="num">${onList}</b><button type="button" data-act="mq" data-id="${esc(id)}" data-d="1" aria-label="One card more">+</button></span>
        <div class="mc-sub">on the list${onList && r.per ? ` · <b>${fmtDur(r.per * onList)}</b>` : ""}</div></div>` : ""}
    </div>
  </div>`;
}
function viewMedia(p, h) {
  const cams = Object.entries(p.items).filter(([id]) => hasRec(ITEM.get(id))).map(([id]) => id);
  return `<section class="pad media-tab">
    ${cams.length ? cams.map(id => mediaCamHtml(p, id)).join("") : `<div class="empty-state"><h3>No cameras on the list yet</h3><button class="btn primary" type="button" data-act="tab" data-tab="add">Add gear</button></div>`}
  </section>`;
}
/* a change in the Media tab: kept on the camera's line, and that camera's card redrawn in place */
function recApply(p, id, fn) {
  const l = p.items[id], e = ITEM.get(id); if (!l || !e) return;
  recEnsure(l, e, p); fn(l, e);
  if (l.rec && l.rec.codec) { const k = recKey(e.it.name); if (k) { (app.settings.recLast || (app.settings.recLast = {}))[k] = { codec: l.rec.codec, mode: l.rec.mode, fps: l.rec.fps }; app.settings.recFps = l.rec.fps; touchSettings(); } }
  touch(p); mediaRedraw(p);
}
function mediaRedraw(p) {
  if (app.tab !== "media") return;
  document.querySelectorAll(".media-cam").forEach(el => { const id = el.id.slice(3); const html = mediaCamHtml(p, id); if (html) el.outerHTML = html; });
  refreshRows(p, []);
}
const SEC_CAT = { camera: "camera", lens: "lenses", filters: "filters", accessories: "camera_accessories" };
const secTape = s => SEC_CAT[s.id] && (app.settings.catColors || {})[SEC_CAT[s.id]] ? catTape({ id: SEC_CAT[s.id] }) : `var(--sec-${s.custom ? "custom" : s.id}, var(--pal-slate))`;
function viewList(p, h) {
  const t = totals(p), by = linesBySection(p), issues = coverageIssues(p), clashes = clashIssues(p);
  const secs = allSections(), closed = s => app.open.has("secx/" + s.id);
  const anyOpen = secs.some(s => by[s.id].length && !closed(s));
  const sections = secs.map(s => {
    const rows = by[s.id], shut = closed(s);
    const pcs = rows.reduce((a, [, l]) => a + lineQty(l), 0);
    return `<div class="section${shut ? " closed" : ""}" data-sec="${s.id}" style="--tape: ${secTape(s)}"><h3 data-act="sec-toggle" data-k="${s.id}"><span>${tapeIcon(s.custom ? "custom" : s.id, secName(s.id))}${esc(secName(s.id))}${s.custom ? `<button class="iconbtn pen" type="button" data-act="rename-sec" data-k="${s.id}" aria-label="Rename ${esc(secName(s.id))}">✎</button>` : ""}</span><span class="sumr"><span class="cnt">${rows.length ? `${rows.length} · ${pcs} pcs` : ""}</span><button class="iconbtn sec-tog" type="button" data-act="sec-toggle" data-k="${s.id}" aria-expanded="${!shut}" aria-label="${shut ? "Open" : "Close"} ${esc(secName(s.id))}">${CHEV}</button></span></h3>
      <div class="sec-body">${rows.length ? `<ul class="lines">${rows.map(([id, l]) => lineHtml(p, id, l)).join("")}</ul>` : `<p class="section-empty">${["grip", "aks"].includes(s.id) ? "Add items by name below." : s.custom ? "Drag lines here, or add items by name below." : "Nothing here yet."}</p>`}
      <form class="custom-add" data-custom="${s.id}" autocomplete="off"><input name="name" placeholder="Add to ${esc(secName(s.id))}" aria-label="New item for ${esc(secName(s.id))}"><button type="submit">+ Add</button></form></div>
    </div>`;
  }).join("");
  return `<section class="pad">
    <div class="list-tools">
      <label class="search lsearch" for="lq"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
        <input id="lq" type="search" placeholder="Search the list" autocomplete="off" value="${esc(app.lq || "")}" aria-label="Search the Camera List"></label>
      <div class="lt-row"><span class="summary-line"><b class="num">${t.lines}</b> items · <span class="num">${t.pcs}</span> pcs · ${esc(h.name)}</span>
        ${t.lines ? `<button class="btn ghost sm" type="button" data-act="sec-all" data-open="${anyOpen ? 0 : 1}">${anyOpen ? "Close all" : "Open all"}</button>` : ""}</div></div>
    <div id="copyFallback"></div>
    ${issues.length ? `<div class="warnbox" role="alert"><b>Coverage warning</b>${issues.map(i => `<p>${esc(issueText(i))}</p>`).join("")}</div>` : ""}
    ${clashes.map(i => `<div class="warnbox" role="alert"><b>Doesn't work together</b><p>${clashPair(i)}${i.r.why ? ` · ${esc(i.r.why)}` : ""}</p>${clashActs(i, false)}</div>`).join("")}
    ${t.lines ? "" : `<div class="empty-state"><h3>The list is empty</h3><p>Open Add gear to pick items from ${esc(h.name)}'s catalog, or type items into any section below.</p><button class="btn primary" type="button" data-act="tab" data-tab="add">Add gear</button></div>`}
    <p class="empty" id="lqNone" hidden>Nothing on the list matches. Try another word.</p>
    <div id="listSecs">${sections}</div>
    <div class="section"><button class="add-head big" type="button" data-act="new-section">+ New section</button></div>
  </section>`;
}
/* the Cam list search: hide lines that don't match, and sections left empty */
function applyListFilter() {
  const q = norm((app.lq || "").trim()), wrap = document.getElementById("listSecs");
  if (!wrap) return;
  let shown = 0;
  wrap.querySelectorAll(".section[data-sec]").forEach(sec => {
    let n = 0;
    sec.querySelectorAll("li.line").forEach(li => { const hit = !q || (li.dataset.s || "").includes(q); li.hidden = !hit; if (hit) n++; });
    sec.classList.toggle("searching", !!q);
    sec.hidden = !!q && !n; shown += n;
  });
  const none = document.getElementById("lqNone"); if (none) none.hidden = !q || shown > 0;
  stripe(wrap);
}
function addCustomLine(p, name, sec) {
  const id = uid("custom-");
  p.items[id] = { qty: 1, note: "", name: String(name).slice(0, 120), brand: "", section: sec, cat: "", sub: "", custom: true, added: Date.now(), children: [] };
  touch(p);
  return id;
}
/* an item typed into the Cam list: is it already in the house's catalog, and if not, where would it go?
   Each subcategory holding items of that list section is scored by the words its items share with the name (rare words count more). */
const GUESS_STOP = new Set(["the", "and", "for", "with", "set", "kit", "mm", "inch", "pro", "mini", "new", "black", "of", "to", "x"]);
const words = s => norm(s).replace(/[^a-z0-9.]+/g, " ").split(" ").filter(w => w.length >= 2 && !GUESS_STOP.has(w));
function catalogGuess(h, name, sec) {
  const n = flat(name), all = [...ITEM.values()].filter(e => e.h === h);
  const exact = all.find(e => flat(e.it.name) === n);
  if (exact) return { match: exact.it.id };
  if (n.length >= 5) { const inc = all.filter(e => flat(e.it.name).includes(n)); if (inc.length === 1) return { match: inc[0].it.id }; }
  const pool = all.filter(e => e.it.section === sec);
  if (!pool.length) return { none: true };
  const df = new Map();
  for (const e of all) for (const w of new Set(words(e.it.name))) df.set(w, (df.get(w) || 0) + 1);
  const ws = [...new Set(words(name))];
  const brands = new Map(all.map(e => [norm(e.it.brand), e.it.brand]));
  const brand = ws.map(w => brands.get(w)).find(b => b && b !== "Generic") || "";
  const hits = new Map(), best = new Map();
  for (const e of pool) {
    const iw = new Set(words(e.it.name + " " + e.s.name)); let sc = 0;
    for (const w of ws) if (iw.has(w) && norm(e.it.brand) !== w) sc += 1 / Math.log2(1.5 + (df.get(w) || 1));
    if (!sc) continue;
    hits.set(e.s, (hits.get(e.s) || 0) + 1);
    if (!best.has(e.s) || sc > best.get(e.s).sc) best.set(e.s, { sc, e });
  }
  const subs = [...new Set(pool.map(e => e.s))];
  // the closest single item counts most; a few more alike in the same subcategory tip the balance
  const ranked = [...best.entries()].map(([s, b]) => [s, b.sc + 0.1 * Math.min(5, hits.get(s))]).sort((a, b) => b[1] - a[1]);
  let sub = ranked.length ? ranked[0][0] : null, sure = false;
  if (subs.length === 1) { sub = subs[0]; sure = true; }
  else if (ranked.length) sure = best.get(sub).sc >= 0.9 && (ranked.length === 1 || ranked[0][1] >= ranked[1][1] * 1.4);
  if (!sub) sub = subs.sort((a, b) => pool.filter(e => e.s === b).length - pool.filter(e => e.s === a).length)[0];
  const like = best.has(sub) ? best.get(sub).e : null;
  const group = sub.groupBy && like ? grpOf(like.it, like.s) : undefined;
  return { sub, sure, brand, group };
}

/* ---------- exports ---------- */
/* the document's top block, as in the user's own Word list: production line (large), crew line, then dates.
   Each line is label/value pairs (labels bold) or plain text. The rental house is not printed. */
function headerParts(p) {
  const days = shootDays(p), L = [];
  const seg = (lbl, v) => v ? [{ lbl, v }] : [];
  const a = [...seg("Production", p.name), ...seg("Production company", p.company)];
  if (a.length) L.push({ big: true, segs: a });
  const b = [...seg("DP", p.dp), ...seg("1st AC", p.ac && p.ac + (p.acPhone ? " " + p.acPhone : ""))];
  if (b.length) L.push({ segs: b });
  if (p.prep) L.push({ plain: `- Prep: ${fmtShort(p.prep)}` });
  if (p.shootStart) {
    const range = p.shootEnd && p.shootEnd !== p.shootStart ? `${fmtShort(p.shootStart)}–${fmtShort(p.shootEnd)}` : fmtShort(p.shootStart);
    L.push({ plain: `- Shoot: ${range}${days ? ` // ${days} shoot day${days === 1 ? "" : "s"} total` : ""}` });
  }
  if (unitLine(p)) L.push({ plain: unitLine(p) });
  return L;
}
const headerLines = p => headerParts(p).map(l => l.plain || l.segs.map(s => `${s.lbl}: ${s.v}`).join(" // "));
/* colors from the user's Word list: peach header block, green labels for camera/lens/support, blue for the rest */
const DOC_HEAD_FILL = "FBE4D5";
const secFill = id => ["camera", "lens", "support"].includes(id) ? "C5E0B3" : "DEEAF6";
/* one exported row per line; a wireless video line counts sets, with its transmitters and receivers as sub-items under it */
const skuOn = () => app.settings.exportSku !== false;
function exportRows(id, l) {
  const e = ITEM.get(id);
  const extra = [];
  if (l.note) extra.push(l.note);
  if (e && e.it.lens && e.it.lens.set && e.it.lens.focals) extra.push(e.it.lens.focals);
  const kids = (l.children || []).map(c => `${c.qty}x ${c.name}`);
  const base = { extra, kids, sku: l.sku || (e && e.it.sku) || "", l };
  if (l.tx !== undefined) return [{ ...base, kids: [l.tx ? `${l.tx}x TX` : "", l.rx ? `${l.rx}x RX` : "", ...kids].filter(Boolean), qty: lineQty(l), name: l.name }];
  return [{ ...base, qty: l.qty, name: l.name }];
}
function listText(p, o = {}) {
  const by = linesBySection(p);
  const out = [docTitle(p).toUpperCase() + (o.noVer ? "" : ` · VERSION ${docVer(p)} · ${verStamp()}`), ...headerLines(p), ""];
  for (const s of allSections()) {
    if (!by[s.id].length) continue;
    out.push(secName(s.id).toUpperCase());
    for (const [id, l] of by[s.id]) for (const r of exportRows(id, l)) {
      out.push(`${r.qty}x ${r.name}${skuOn() && r.sku ? ` [${r.sku}]` : ""}${r.extra.length ? ` (${r.extra.join("; ")})` : ""}`);
      for (const k of r.kids) out.push(`   - ${k}`);
    }
    out.push("");
  }
  if (p.notes) out.push("NOTES", p.notes, "");
  return out.join("\n").trim() + "\n";
}
function csvText(p) {
  const q = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const by = linesBySection(p), rows = [["Section", "Qty", "Item", "Note", "Sub-items", "SKU", "Brand", "Catalog category", "Catalog subcategory"]];
  for (const s of allSections()) for (const [id, l] of by[s.id]) for (const r of exportRows(id, l))
    rows.push([secName(s.id), r.qty, r.name, r.extra.join("; "), r.kids.join("; "), r.sku, l.brand || "", l.cat || "", l.sub || ""]);
  return "﻿" + rows.map(r => r.map(q).join(",")).join("\r\n") + "\r\n";
}
function fileBase(p) { return ("Camera list - " + (p.name || "production") + (unitLine(p) ? " " + unitLine(p) : "") + (p.shootStart ? " " + fmtShort(p.shootStart).replace(/\./g, "-") : "") + " v" + docVer(p)).replace(/[\\/:*?"<>|]+/g, " ").trim(); }

/* ----- the clean layout (default), after the camlist look: the production's name with "Camera List" across from it on every page,
   a short block of details, then each section between two thin rules: "2 x" and the item in bold, its sub-items and notes under it,
   the SKU in its own column on the right ----- */
const layoutOf = () => app.settings.exportLayout === "table" ? "table" : "clean";
/* the list's version: one more each time a changed list is saved (Word, PDF or Send); saving the same list again keeps its number */
function docSigOf(p) {
  const o = otherUnit(p), t = JSON.stringify([listText(p, { noVer: true }), p.notesBold, p.notesSize, o && p.mainOf ? [o.dp, acText(o), o.prep, o.shootStart, o.shootEnd] : 0]);
  let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return String(h >>> 0);
}
const docVer = p => p.docSig && p.docSig === docSigOf(p) ? (p.docVer || 1) : (p.docVer || 0) + 1;
function commitVer(p) { const sig = docSigOf(p); if (p.docSig !== sig) { p.docVer = docVer(p); p.docSig = sig; touch(p); } }
/* the title at the top of the list ("Camera List", or the one set in Settings) */
const docTitle = p => String((p && p.docTitle) || app.settings.docTitle || "Camera List").slice(0, 60);
const CLEAN_FONT = "Futura, 'Century Gothic', 'Avenir Next', 'IBM Plex Sans', Arial, Helvetica, sans-serif";
function shootRangeText(p) {
  if (!p.shootStart) return "";
  const days = shootDays(p), range = p.shootEnd && p.shootEnd !== p.shootStart ? `${fmtShort(p.shootStart)} – ${fmtShort(p.shootEnd)}` : fmtShort(p.shootStart);
  return range + (days ? ` · ${days} shoot day${days === 1 ? "" : "s"}` : "");
}
/* the details block, one centered line each. With a 2nd Unit, both units' camera crew, each role by unit:
   DP Main Unit, DP 2nd Unit, 1st AC Main Unit, 1st AC 2nd Unit; this list's unit reads in full, the other one quieter.
   Then the unit, then the notes. The rental house is not printed. */
const acText = p => p ? [p.ac, p.acPhone].filter(Boolean).join("  ") : "";
function infoRows(p) {
  const o = otherUnit(p);
  if (!o || !p.mainOf) return [{ k: "Production company", v: p.company }, { k: "DP", v: p.dp }, { k: "1st AC", v: acText(p) }, { k: "Prep", v: p.prep ? fmtShort(p.prep) : "" }, { k: "Shoot", v: shootRangeText(p) }].filter(r => r.v);
  const sameDates = (o.prep || "") === (p.prep || "") && shootRangeText(o) === shootRangeText(p);
  return [{ k: "Production company", v: p.company }, ...(sameDates ? [{ k: "Prep", v: p.prep ? fmtShort(p.prep) : "" }, { k: "Shoot", v: shootRangeText(p) }] : [])].filter(r => r.v);
}
/* with a 2nd Unit: each unit's crew in its own column, 2nd Unit on the left and Main Unit on the right. This list's unit reads in full, the other quieter.
   Each column also has its unit's dates when the two units' dates differ. */
function crewCols(p) {
  const o = otherUnit(p); if (!o || !p.mainOf) return null;  // only the 2nd Unit's list shows both crews
  const m = p.mainOf ? o : p, q = p.mainOf ? p : o;
  const sameDates = (o.prep || "") === (p.prep || "") && shootRangeText(o) === shootRangeText(p);
  const col = (x, name) => ({ name, dim: x !== p, rows: [{ k: "DP", v: x.dp }, { k: "1st AC", v: acText(x) }, ...(sameDates ? [] : [{ k: "Prep", v: x.prep ? fmtShort(x.prep) : "" }, { k: "Shoot", v: shootRangeText(x) }])].filter(r => r.v) });
  return [col(q, "2nd Unit"), col(m, "Main Unit")];
}
const unitLine = p => otherUnit(p) ? (p.mainOf ? "2nd Unit" : "Main Unit") : "";
const NOTE_PX = { s: 10.5, m: 12, l: 14.5 }, NOTE_SZ = { s: 19, m: 22, l: 28 };
const hasHebrew = t => /[\u0590-\u05FF]/.test(String(t || ""));
/* when the file is saved: "5.11.26 · 23:40" */
function verStamp(d = new Date()) { const two = n => String(n).padStart(2, "0"); return `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(2)} · ${two(d.getHours())}:${two(d.getMinutes())}`; }
function cleanTitleHtml(p, page, stamp = verStamp()) {
  const unit = unitLine(p);
  return `<div style="font-family:${CLEAN_FONT};color:#111">
    <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:16px">
      <div style="text-align:left;font-size:10.5px;line-height:1.45;color:#8a8a8a;white-space:nowrap">Version ${docVer(p)}<br>${esc(stamp)}</div>
      <div style="font-size:18px;line-height:1.2;white-space:nowrap;text-align:center">${esc(docTitle(p))}</div>
      <div style="font-size:11px;color:#777;padding-top:4px;text-align:right">${page ? esc(page) : ""}</div></div>
    <div style="text-align:center;margin-top:6px"><div style="font-size:25px;line-height:1.15;font-weight:700"><bdi>${esc(p.name || "Production")}</bdi></div>${unit ? `<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-top:3px">${esc(unit)}</div>` : ""}</div></div>`;
}
function exportHtmlClean(p, o = {}) {
  const by = linesBySection(p), sku = skuOn();
  let body = "";
  for (const s of allSections()) {
    const rows = by[s.id].flatMap(([id, l]) => exportRows(id, l));
    if (!rows.length) continue;
    body += `<div class="cl-sh">${esc(secName(s.id))}</div>` + rows.map(r => `<div class="cl-r" data-break><span class="cl-q">${r.qty} x</span><div class="cl-n"><b>${esc(r.name)}</b>${r.kids.map(t => `<div class="cl-k">${esc(t)}</div>`).join("")}${r.extra.map(t => `<div class="cl-x">${esc(t)}</div>`).join("")}</div>${sku ? `<span class="cl-s">${esc(r.sku)}</span>` : ""}</div>`).join("");
  }
  const info = infoRows(p), cols = crewCols(p);
  const line = r => `<div class="cl-i"><b>${esc(r.k)}:</b> <bdi>${esc(r.v)}</bdi></div>`;
  const infoHtml = info.length || cols || p.notes ? `<div class="cl-inf" data-break>${info.slice(0, 1).map(line).join("")}
      ${cols ? `<div class="cl-crew">${cols.map(c => `<div class="cl-col${c.dim ? " cl-dim" : ""}"><div class="cl-ch">${esc(c.name)}</div>${c.rows.map(line).join("")}</div>`).join("")}</div>` : ""}
      ${info.slice(1).map(line).join("")}
      ${p.notes ? `<div class="cl-i cl-notes" dir="auto" style="font-size:${NOTE_PX[p.notesSize] || 12}px;font-weight:${p.notesBold ? 700 : 400}">${esc(p.notes)}</div>` : ""}</div>` : "";
  return `<div class="cl" style="width:794px;box-sizing:border-box;padding:0 56px;background:#fff">
    <style>.cl{color:#111;font-family:${CLEAN_FONT};font-size:12px;line-height:1.35}.cl .cl-inf{margin:14px 0 0;text-align:center}.cl .cl-i{font-size:11.5px;line-height:1.45;color:#111}.cl .cl-i b{font-weight:700}.cl .cl-dim{color:#9a9a9a}.cl .cl-dim b{font-weight:600}.cl .cl-crew{display:grid;grid-template-columns:1fr 1fr;margin:6px auto 4px;max-width:600px}.cl .cl-col{padding:2px 14px}.cl .cl-col+.cl-col{border-left:1px solid #ccc}.cl .cl-ch{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:2px}.cl .cl-dim .cl-i{color:#9a9a9a}.cl .cl-notes{white-space:pre-wrap;margin-top:5px;unicode-bidi:plaintext}.cl .cl-sh{border-top:1px solid #111;border-bottom:1px solid #111;margin-top:18px;padding:5px 0 4px;font-weight:700;font-size:11.5px}.cl .cl-r{display:flex;padding-top:7px}.cl .cl-q{width:38px;flex:none;font-weight:700;white-space:nowrap}.cl .cl-n{flex:1;min-width:0;font-size:12px}.cl .cl-n b{font-weight:700}.cl .cl-k{font-size:11px;padding-top:1px}.cl .cl-x{font-size:11px;font-style:italic;color:#555;padding-top:1px}.cl .cl-s{flex:none;width:96px;padding-left:10px;text-align:right;color:#777;font-size:10px;font-family:'Courier New',monospace;padding-top:2px;overflow-wrap:anywhere}.cl .cl-nt{margin-top:18px;border-top:1px solid #111;padding-top:6px}</style>
    ${o.pdf ? "" : `<div style="padding-top:4px">${cleanTitleHtml(p)}</div>`}
    ${infoHtml}
    ${body}
    <div style="height:8px"></div>
  </div>`;
}
const exportHtml = (p, o) => layoutOf() === "table" ? exportHtmlTable(p) : exportHtmlClean(p, o);
/* Word, clean: the same, with the title line as the page header ("Mizrahi (1 out of 3)" … "Camera List") */
const xmlEsc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const wRun = (t, o = {}) => `<w:r><w:rPr>${o.b ? "<w:b/><w:bCs/>" : ""}${o.i ? "<w:i/>" : ""}${o.color ? `<w:color w:val="${o.color}"/>` : ""}${o.mono ? '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>' : ""}${o.caps ? "<w:caps/>" : ""}<w:sz w:val="${o.sz || 20}"/><w:szCs w:val="${o.sz || 20}"/>${hasHebrew(t) ? "<w:rtl/>" : ""}</w:rPr><w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r>`;
const W_TEXT = 9638;
function docxHeaderClean(p) {
  const fld = (code, sz) => `<w:fldSimple w:instr="${code}"><w:r><w:rPr><w:sz w:val="${sz}"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple>`;
  const unit = unitLine(p);
  const tabs = `<w:tabs><w:tab w:val="center" w:pos="${W_TEXT / 2}"/><w:tab w:val="right" w:pos="${W_TEXT}"/></w:tabs>`, gray = { sz: 16, color: "8A8A8A" };
  // "Camera List" centered on top, the version and the save time in gray at the top left, the page count right, then the production, then the unit
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:p><w:pPr>${tabs}<w:spacing w:before="0" w:after="0"/></w:pPr>${wRun("Version " + docVer(p), gray)}<w:r><w:tab/></w:r>${wRun(docTitle(p), { sz: 28 })}<w:r><w:tab/></w:r>${fld("PAGE", 17)}${wRun(" / ", { sz: 17, color: "777777" })}${fld("NUMPAGES", 17)}</w:p><w:p><w:pPr>${tabs}<w:spacing w:before="0" w:after="${unit ? 0 : 160}"/></w:pPr>${wRun("\u200E" + verStamp() + "\u200E", gray)}<w:r><w:tab/></w:r>${wRun(p.name || "Production", { b: true, sz: 36 })}</w:p>${unit ? `<w:p><w:pPr><w:spacing w:before="0" w:after="160"/><w:jc w:val="center"/></w:pPr>${wRun(unit, { b: true, caps: true, sz: 17 })}</w:p>` : ""}</w:hdr>`;
}
function docxXmlClean(p) {
  const by = linesBySection(p), sku = skuOn();
  const para = (runs, o = {}) => `<w:p><w:pPr>${o.keep ? "<w:keepNext/>" : ""}${o.bdr ? `<w:pBdr><w:top w:val="single" w:sz="6" w:space="2" w:color="111111"/><w:bottom w:val="single" w:sz="6" w:space="2" w:color="111111"/></w:pBdr>` : ""}<w:spacing w:before="${o.before || 0}" w:after="${o.after ?? 0}"/>${o.ind ? `<w:ind w:left="${o.ind}"/>` : ""}${o.right ? '<w:jc w:val="right"/>' : ""}</w:pPr>${runs}</w:p>`;
  const noBorders = `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(v => `<w:${v} w:val="nil"/>`).join("")}</w:tblBorders>`;
  const cell = (w, content) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${content || para("")}</w:tc>`;
  const table = (cols, rows) => `<w:tbl><w:tblPr><w:tblW w:w="${W_TEXT}" w:type="dxa"/>${noBorders}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${cols.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>`;
  const info = infoRows(p), cols = crewCols(p), center = runs => `<w:p><w:pPr><w:spacing w:before="0" w:after="20"/><w:jc w:val="center"/></w:pPr>${runs}</w:p>`;
  const line = (r, dim) => center(wRun(r.k + ": ", { b: true, sz: 19, color: dim ? "9A9A9A" : "" }) + wRun(r.v, { sz: 19, color: dim ? "9A9A9A" : "" }));
  const half = W_TEXT / 2, edge = v => `<w:${v} w:val="nil"/>`;
  const crew = cols ? `<w:tbl><w:tblPr><w:tblW w:w="${W_TEXT}" w:type="dxa"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH"].map(edge).join("")}<w:insideV w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${half}"/><w:gridCol w:w="${half}"/></w:tblGrid><w:tr>${cols.map(c => `<w:tc><w:tcPr><w:tcW w:w="${half}" w:type="dxa"/></w:tcPr>${center(wRun(c.name, { b: true, caps: true, sz: 16, color: c.dim ? "9A9A9A" : "" }))}${c.rows.map(r => line(r, c.dim)).join("") || center("")}</w:tc>`).join("")}</w:tr></w:tbl>` : "";
  let body = info.slice(0, 1).map(r => line(r)).join("") + crew + info.slice(1).map(r => line(r)).join("")
    + (p.notes ? p.notes.split(/\n/).map(t => `<w:p><w:pPr>${hasHebrew(t) ? "<w:bidi/>" : ""}<w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>${wRun(t, { sz: NOTE_SZ[p.notesSize] || 22, b: !!p.notesBold })}</w:p>`).join("") : "");
  const S = sku ? 1500 : 0, Q = 640, N = W_TEXT - Q - S;
  for (const s of allSections()) {
    const rows = by[s.id].flatMap(([id, l]) => exportRows(id, l));
    if (!rows.length) continue;
    body += para(wRun(secName(s.id), { b: true, sz: 20 }), { bdr: true, keep: true, before: 300, after: 40 });
    body += table(sku ? [Q, N, S] : [Q, N], rows.map(r => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(Q, para(wRun(r.qty + " x", { b: true, sz: 20 })))}${cell(N, para(wRun(r.name, { b: true, sz: 20 })) + r.kids.map(t => para(wRun(t, { sz: 18 }))).join("") + r.extra.map(t => para(wRun(t, { i: true, color: "555555", sz: 18 }))).join(""))}${sku ? cell(S, para(wRun(r.sku, { color: "777777", sz: 15, mono: true }), { right: true })) : ""}</w:tr>`));
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:headerReference w:type="default" r:id="rIdHdr"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1250" w:right="1134" w:bottom="1134" w:left="1134" w:header="560" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}
const docxXml = p => layoutOf() === "table" ? docxXmlTable(p) : docxXmlClean(p);

/* Word document in the user's two-column layout: Section | Qty | Item, twice */
function docxXmlTable(p) {
  const x = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const r = (t, o = {}) => `<w:r><w:rPr>${o.b ? "<w:b/>" : ""}${o.i ? "<w:i/>" : ""}${o.color ? `<w:color w:val="${o.color}"/>` : ""}<w:sz w:val="${o.sz || 20}"/></w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
  const para = (runs, o = {}) => `<w:p><w:pPr><w:spacing w:before="0" w:after="${o.after ?? 60}"/>${o.center ? '<w:jc w:val="center"/>' : ""}</w:pPr>${runs}</w:p>`;
  const W = { lbl: 1420, qty: 400, item: 2680 };
  const by = linesBySection(p);
  const side = col => { const rows = []; for (const s of allSections().filter(s => s.column === col)) { let first = true; for (const [id, l] of by[s.id]) for (const er of exportRows(id, l)) { rows.push({ sec: secName(s.id), fill: secFill(s.id), first, er }); first = false; } } return rows; };
  const L = side("L"), R = side("R"), n = Math.max(L.length, R.length);
  const cell = (w, content, o = {}) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.vmerge === "restart" ? '<w:vMerge w:val="restart"/>' : o.vmerge === "cont" ? "<w:vMerge/>" : ""}${o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>` : ""}<w:vAlign w:val="top"/></w:tcPr>${content || para("", { after: 0 })}</w:tc>`;
  const half = row => {
    if (!row) return cell(W.lbl, "") + cell(W.qty, "") + cell(W.item, "");
    const lbl = row.first ? cell(W.lbl, para(r(row.sec, { b: true }), { after: 0, center: true }), { vmerge: "restart", shade: row.fill }) : cell(W.lbl, "", { vmerge: "cont", shade: row.fill });
    const er = row.er;
    const item = para(r(er.name) + (skuOn() && er.sku ? r("  " + er.sku, { color: "7F7F7F", sz: 16 }) : ""), { after: 0 })
      + er.extra.map(t => para(r("– " + t, { i: true, color: "595959", sz: 18 }), { after: 0 })).join("")
      + er.kids.map(t => para(r("- " + t, { sz: 18 }), { after: 0 })).join("");
    return lbl + cell(W.qty, para(r(String(er.qty), { b: true }), { after: 0, center: true })) + cell(W.item, item);
  };
  let rows = "";
  for (let i = 0; i < n; i++) rows += `<w:tr><w:trPr><w:cantSplit/></w:trPr>${half(L[i])}${half(R[i])}</w:tr>`;
  const border = v => `<w:${v} w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/>`;
  const table = n ? `<w:tbl><w:tblPr><w:tblW w:w="${2 * (W.lbl + W.qty + W.item)}" w:type="dxa"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(border).join("")}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${[W.lbl, W.qty, W.item, W.lbl, W.qty, W.item].map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows}</w:tbl>` : "";
  // compact top block: a small title, then shaded lines with no space between them, straight into the table
  const shaded = runs => `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="${DOC_HEAD_FILL}"/><w:spacing w:before="0" w:after="0" w:line="252" w:lineRule="auto"/></w:pPr>${runs}</w:p>`;
  const head = para(r(docTitle(p) + ":", { b: true }) + r("   Version " + docVer(p), { color: "7F7F7F", sz: 16 }), { after: 0 })
    + headerParts(p).map(ln => { const sz = ln.big ? 32 : 20; return shaded(ln.plain ? r(ln.plain, { sz }) : ln.segs.map(g => r(g.lbl + ": ", { b: true, sz }) + r(g.v, { sz })).join(r(" // ", { sz }))); }).join("")
    + `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/></w:pPr></w:p>`;
  const notes = p.notes ? para("", { after: 120 }) + para(r("Notes", { b: true, sz: 22 })) + p.notes.split(/\n/).map(t => para(r(t))).join("") : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${head}${table}${notes}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1453" w:bottom="1134" w:left="1453" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}
async function buildDocx(p) {
  if (!window.JSZip) throw new Error("zip");
  const z = new JSZip();
  const clean = layoutOf() === "clean";
  z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>${clean ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ""}</Types>`);
  z.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  z.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${clean ? '<Relationship Id="rIdHdr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' : ""}</Relationships>`);
  z.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`);
  z.file("word/document.xml", docxXml(p));
  if (clean) z.file("word/header1.xml", docxHeaderClean(p));
  return z.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
/* PDF: the same two-column layout, drawn as HTML and paged at row boundaries */
function exportHtmlTable(p) {
  const by = linesBySection(p);
  const side = col => { const rows = []; for (const s of allSections().filter(s => s.column === col)) { const rs = []; for (const [id, l] of by[s.id]) for (const er of exportRows(id, l)) rs.push(er); rs.forEach((er, i) => rows.push({ sec: secName(s.id), fill: secFill(s.id), span: i === 0 ? rs.length : 0, er })); } return rows; };
  const L = side("L"), R = side("R"), n = Math.max(L.length, R.length);
  const cellsFor = row => {
    if (!row) return `<td class="lb"></td><td></td><td></td>`;
    const er = row.er;
    const item = `${esc(er.name)}${skuOn() && er.sku ? ` <span class="sk">${esc(er.sku)}</span>` : ""}${er.extra.map(t => `<div class="ex">– ${esc(t)}</div>`).join("")}${er.kids.map(t => `<div class="kd">- ${esc(t)}</div>`).join("")}`;
    return (row.span ? `<td class="lb" rowspan="${row.span}" style="background:#${row.fill}">${esc(row.sec)}</td>` : "") + `<td class="q">${er.qty}</td><td>${item}</td>`;
  };
  // a row whose label cell was swallowed by a rowspan above gets no label cell
  let body = "";
  for (let i = 0; i < n; i++) body += `<tr data-break>${L[i] || i >= L.length ? cellsFor(L[i]) : ""}${R[i] || i >= R.length ? cellsFor(R[i]) : ""}</tr>`;
  return `<div style="width:794px;box-sizing:border-box;padding:0 48px;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;font-size:12px;line-height:1.35">
    <style>.pdf{color:#000;font-size:12px;font-family:Arial,Helvetica,sans-serif}.pdf td{color:#000;border:1px solid #a6a6a6;padding:4px 6px;vertical-align:top;font-size:12px}.pdf .lb{font-weight:700;width:86px;text-align:center}.pdf .q{font-weight:700;text-align:center;width:24px}.pdf .ex{font-style:italic;color:#595959;font-size:11px}.pdf .kd{font-size:11px}.pdf .sk{color:#7f7f7f;font-size:10px;font-family:'Courier New',monospace;white-space:nowrap}</style>
    <div data-break style="padding-top:8px"><div style="font-size:13px;font-weight:700;line-height:1.3">${esc(docTitle(p))}: <span style="font-weight:400;color:#7f7f7f;font-size:11px">Version ${docVer(p)}</span></div>${(() => { const hp = headerParts(p); return hp.length ? `<div style="background:#${DOC_HEAD_FILL};padding:1px 6px 2px;line-height:1.3">${hp.map(ln => `<div style="font-size:${ln.big ? 21 : 13}px">${ln.plain ? esc(ln.plain) : ln.segs.map(g => `<b>${esc(g.lbl)}:</b> ${esc(g.v)}`).join(" // ")}</div>`).join("")}</div>` : ""; })()}<div style="height:7px"></div></div>
    ${n ? `<table class="pdf" style="width:100%;border-collapse:collapse;table-layout:fixed">${body}</table>` : ""}
    ${p.notes ? `<div data-break style="margin-top:14px"><b>Notes</b><div style="white-space:pre-wrap">${esc(p.notes)}</div></div>` : ""}
  </div>`;
}
/* preview: the export document on a page, scaled to the screen, with the export buttons under it */
function openPreview(p) {
  closePreview();
  const o = document.createElement("div");
  o.className = "preview"; o.id = "preview";
  o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", "Document preview");
  if (app.settings.exportLayout === "table") { app.settings.exportLayout = "clean"; touchSettings(); }  // one layout now
  o.innerHTML = `<div class="pv-bar"><b>Preview</b><span class="hint">${esc(fileBase(p))}</span>
      <button class="btn sm" type="button" data-act="preview-sku" aria-pressed="${skuOn()}">SKU ${skuOn() ? "on" : "off"}</button><button class="x" type="button" data-act="preview-close" aria-label="Close preview">×</button></div>
    ${(() => { const m = mainOf(p), q = unit2Of(p); return q ? `<div class="pv-units"><span class="seg sm" role="group" aria-label="Unit">${[[m, "Main Unit"], [q, "2nd Unit"]].map(([x, t]) => `<button type="button" data-act="pv-unit" data-id="${esc(x.id)}" aria-pressed="${x.id === p.id}">${t}</button>`).join("")}</span></div>` : ""; })()}
    <div class="pv-scroll"><div class="pv-fit"><div class="pv-paper">${exportHtml(p)}</div></div></div>
    <div class="pv-actions">
      <div class="pv-save" role="group" aria-labelledby="pv-save-l"><span class="pv-lbl" id="pv-save-l">Save to this ${isTouch() ? "phone" : "computer"}</span>
        <div class="pv-seg"><button class="btn" type="button" data-act="export-docx" aria-label="Save as Word">${SAVE_ICON}<span>Word</span></button><button class="btn" type="button" data-act="export-pdf" aria-label="Save as PDF">${SAVE_ICON}<span>PDF</span></button></div></div>
      <div class="pv-send" role="group" aria-labelledby="pv-send-l"><span class="pv-lbl" id="pv-send-l">Send</span>
        <div class="pv-two"><button class="btn" type="button" data-act="copy" aria-label="Copy the list as text">${COPY_ICON}<span>Copy</span></button><button class="btn primary" type="button" data-act="send-open">${SEND_ICON}<span>Send</span></button></div></div></div>`;
  document.body.appendChild(o);
  document.body.style.overflow = "hidden";
  fitPreview();
  o.querySelector(".x").focus();
  navSync();
}
function fitPreview() {
  const o = document.getElementById("preview");
  if (!o) return;
  const sc = o.querySelector(".pv-scroll"), fit = o.querySelector(".pv-fit"), paper = o.querySelector(".pv-paper");
  const k = Math.min(1, (sc.clientWidth - 24) / 794);
  paper.style.transform = `scale(${k})`;
  fit.style.width = 794 * k + "px";
  fit.style.height = paper.offsetHeight * k + "px";
}
/* the preview moves to the other unit's list: the page slides out toward the side you came from, the other slides in, and its crew lines fade up */
function swapPreview(p, dir) {
  const o = document.getElementById("preview"); if (!o) { openPreview(p); return; }
  o.querySelector(".pv-bar .hint").textContent = fileBase(p);
  o.querySelectorAll('[data-act="pv-unit"]').forEach(x => x.setAttribute("aria-pressed", String(x.dataset.id === p.id)));
  const paper = o.querySelector(".pv-paper"), still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const put = () => { paper.innerHTML = exportHtml(p); fitPreview(); };
  if (still || !paper.animate) { put(); return; }
  const k = (paper.style.transform.match(/scale\(([\d.]+)\)/) || [, 1])[1];
  paper.animate([{ opacity: 1, transform: `translateX(0) scale(${k})` }, { opacity: 0, transform: `translateX(${-dir * 28}px) scale(${k})` }], { duration: 150, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" })
    .onfinish = () => {
      put();
      const k2 = (paper.style.transform.match(/scale\(([\d.]+)\)/) || [, 1])[1];
      paper.getAnimations().forEach(a => a.cancel());
      paper.animate([{ opacity: 0, transform: `translateX(${dir * 28}px) scale(${k2})` }, { opacity: 1, transform: `translateX(0) scale(${k2})` }], { duration: 260, easing: "cubic-bezier(.2, .8, .2, 1)" });
      paper.querySelectorAll(".cl-inf > *").forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 320, delay: 80 + i * 45, easing: "cubic-bezier(.2, .8, .2, 1)", fill: "backwards" }));
    };
}
/* a saved or sent list: its version number is taken, and the preview says so */
function savedVer(p, sent) {
  const was = p.docSig === docSigOf(p);
  commitVer(p);
  if (sent) { toast(`✓ Sent · version ${p.docVer}`); buzz("done"); }
  else if (!was) toast(`Saved as version ${p.docVer}`);
  const paper = document.querySelector("#preview .pv-paper"); if (paper) { paper.innerHTML = exportHtml(p); fitPreview(); }
}
/* the app itself, to send to someone */
const APP_URL = "https://ofirkarl.github.io/ACCamList/";
/* Word files on Android: Chrome won't put them in the share menu, so a small helper app (AC Cam List Send) does.
   The file goes to it in an intent:// link; it opens the share menu with the file attached. Whether it's installed is per phone. */
const SEND_PKG = "com.ofirkarl.accamlist.send";
const HELPER_APK = "https://github.com/ofirkarl/ACCamList/releases/latest/download/ac-cam-list-send.apk";
const LS_HELPER = "accam-send-helper";
const isAndroid = () => { try { return /Android/i.test(navigator.userAgent); } catch (e) { return false; } };
const helperOn = () => { try { return localStorage.getItem(LS_HELPER) === "1"; } catch (e) { return false; } };
const setHelper = on => { try { if (on) localStorage.setItem(LS_HELPER, "1"); else localStorage.removeItem(LS_HELPER); } catch (e) {} };
const useHelper = fmt => fmt === "docx" && isAndroid() && helperOn();
const blobB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = rej; r.readAsDataURL(blob); });
function helperUrl(name, mime, subject, text, b64) {
  const e = encodeURIComponent;
  return `intent://send#Intent;scheme=accamlist;package=${SEND_PKG};S.name=${e(name)};S.mime=${e(mime)};S.subject=${e(subject)};S.text=${e(text)};S.data=${e(b64)};S.browser_fallback_url=${e(APP_URL + "#send-app")};end`;
}
async function shareApp() {
  const data = { title: "AC Cam List", text: "Camera equipment lists for camera assistants: pick the rental house, build the list, send it.", url: APP_URL };
  try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(APP_URL); toast("Link to the app copied"); } catch (e) { toast(APP_URL); }
}
function closePreview() { const o = document.getElementById("preview"); if (o) { o.remove(); document.body.style.overflow = ""; navSync(); } }
/* Send: the file goes out through the phone's share menu (Gmail, WhatsApp…) with a subject and message the user can edit */
const LOAD_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 20h14"/></svg>`;
/* a catalog file (Settings → Catalog → Save my catalog as a file) loaded on another phone, in the Claude version, or by a colleague */
async function importCatalog(file) {
  let d = null;
  try { d = JSON.parse(await file.text()); } catch (e) {}
  if (!d || typeof d.catalog !== "object" || Array.isArray(d.catalog) || !Object.keys(d.catalog).some(hid => houseById(hid))) { toast("That isn't an AC Cam List catalog file."); return; }
  const houses = Object.keys(d.catalog).filter(hid => houseById(hid)).map(hid => houseById(hid).name).join(" and ");
  const when = d.savedAt && !isNaN(Date.parse(d.savedAt)) ? verStamp(new Date(d.savedAt)) : "";
  pendingCatalog = d;
  showModal(`<div class="sheet"><h3 class="plain">Load this catalog?</h3><p class="hint">${esc(houses)} catalog${when ? `, saved ${esc(when)}` : ""}. It replaces your catalog for ${Object.keys(d.catalog).length > 1 ? "these houses" : "this house"}: order, names, colors and added items. Your lists stay as they are.</p>
    <div class="modal-actions"><span class="grow"></span><button class="btn" type="button" data-act="modal-close">Cancel</button><button class="btn primary" type="button" data-act="cat-import-go">Load catalog</button></div></div>`);
}
let pendingCatalog = null;
const SAVE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/></svg>`;
const FILE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M12 11v6M9 14l3 3 3-3"/></svg>`;
const COPY_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V4H4v13h4"/></svg>`;
const SEND_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>`;
const SEND_DEFAULT = { subject: "Camera list – {production}", message: "Hi,\n\nAttached is the camera list for {production}.\n\nThanks,\n{ac}", fmt: "pdf" };
const sendFill = (t, p) => String(t || "").replace(/\{production\}/g, p.name || "the production").replace(/\{ac\}/g, p.ac || "").replace(/\s+$/, "");
const sendUnfill = (t, p) => { let s = String(t || ""); if (p.name && p.name.length > 1) s = s.split(p.name).join("{production}"); if (p.ac && p.ac.length > 1) s = s.split(p.ac).join("{ac}"); return s; };
const sendJob = { key: "", blob: null, wait: null };
/* a file, once built, is kept while the list stays the same: saving or sending it again uses the same file straight away */
const fileCache = new Map();
const fileKey = (p, fmt) => [p.id, fmt, docSigOf(p), docVer(p), skuOn(), layoutOf(), docTitle(p)].join(":");
const fileReady = (p, fmt) => fileCache.has(fileKey(p, fmt)) && fileCache.get(fileKey(p, fmt)).done;
function getFile(p, fmt) {
  const k = fileKey(p, fmt), hit = fileCache.get(k);
  if (hit) return hit.job;
  const e = { done: false, job: null };
  e.job = (fmt === "pdf" ? buildPdf(p) : buildDocx(p)).then(b => { e.done = true; return b; }).catch(err => { fileCache.delete(k); throw err; });
  fileCache.set(k, e);
  while (fileCache.size > 6) fileCache.delete(fileCache.keys().next().value);
  return e.job;
}
function sendDialog(p) {
  const s = { ...SEND_DEFAULT, ...(app.settings.send || {}) };
  showModal(`<form class="form dialog" id="sendForm" autocomplete="off">
    <h3 class="plain">Send the list</h3>
    <div class="field"><span class="lbl" id="sd-fmt">File</span><div class="seg" role="radiogroup" aria-labelledby="sd-fmt">${[["pdf", "PDF"], ["docx", "Word"]].map(([v, t]) => `<label><input type="radio" name="fmt" value="${v}" ${s.fmt === v ? "checked" : ""}><span>${t}</span></label>`).join("")}</div></div>
    <div class="field"><label for="sd-subj">Subject</label><input id="sd-subj" name="subject" maxlength="200" value="${esc(sendFill(s.subject, p))}"></div>
    <div class="field"><label for="sd-msg">Message</label><textarea id="sd-msg" name="message" rows="6" maxlength="2000">${esc(sendFill(s.message, p))}</textarea>
      <span class="hint">Your changes are kept for the next list.</span></div>
    <p class="hint send-how" id="sendHow">${sendHowText(s.fmt)}</p>
    <div class="modal-actions"><button class="btn" type="button" data-act="modal-close">Cancel</button><button class="btn primary" type="submit" id="sendGo" disabled>Preparing…</button></div>
  </form>`);
  sendPrep(p, s.fmt);
}
/* can this browser put a file of this kind in the share menu? Chrome on Android shares PDFs but not Word files */
const SEND_MIME = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
/* some phones say they can share a Word file and then refuse when asked (Chrome on Android): once that happens, this phone saves it instead */
const LS_NODOCX = "accam-no-docx-share";
const noDocxShare = () => { try { return localStorage.getItem(LS_NODOCX) === "1"; } catch (e) { return false; } };
function canShareKind(fmt) {
  if (useHelper(fmt)) return true;
  if (fmt === "docx" && noDocxShare()) return false;
  try { return typeof File === "function" && !!navigator.canShare && navigator.canShare({ files: [new File(["x"], "x." + fmt, { type: SEND_MIME[fmt] })] }); } catch (e) { return false; }
}
const isTouch = () => { try { return matchMedia("(pointer: coarse)").matches; } catch (e) { return false; } };
function sendHowText(fmt) {
  if (canShareKind(fmt)) return "This opens your phone's share menu with the file attached: pick Gmail, WhatsApp or any other app.";
  if (fmt === "docx" && canShareKind("pdf")) return "This phone can't attach Word files to the share menu (PDF can). Save & email puts the Word file in Downloads and opens an email: attach it there. To attach Word files straight away, get the helper app in Settings.";
  return "Sending with the file attached works from your phone. Here, Send saves the file and copies the message for you to paste.";
}
/* the file is built as soon as the dialog opens, so tapping Send shares it straight away (phones only open the share menu right after a tap) */
function sendPrep(p, fmt) {
  const key = fileKey(p, fmt);
  const how = document.getElementById("sendHow"); if (how) how.textContent = sendHowText(fmt);
  const go = document.getElementById("sendGo");
  const ready = () => { const g = document.getElementById("sendGo"); if (g && sendJob.key === key) { g.disabled = false; g.textContent = sendLabel(fmt); } };
  if (sendJob.key === key && sendJob.blob) { ready(); return; }
  if (go) { go.disabled = true; go.textContent = fmt === "pdf" ? "Preparing the PDF…" : "Preparing…"; }
  sendJob.key = key; sendJob.blob = null;
  sendJob.b64 = "";
  sendJob.wait = getFile(p, fmt).then(async b => { if (useHelper(fmt)) { const t = await blobB64(b); if (sendJob.key === key) sendJob.b64 = t; } if (sendJob.key === key) { sendJob.blob = b; ready(); } return b; })
    .catch(() => { if (sendJob.key === key) { sendJob.key = ""; const g = document.getElementById("sendGo"); if (g) g.textContent = "Couldn't build the file"; } });
}
const sendLabel = fmt => canShareKind(fmt) ? "Send…" : isTouch() ? "Save & email" : "Save file";
async function sendNow(p, f) {
  const fmt = f.elements.fmt.value || "pdf", subject = f.elements.subject.value.trim(), message = f.elements.message.value;
  app.settings.send = { subject: sendUnfill(subject, p), message: sendUnfill(message, p), fmt }; touchSettings();
  const blob = sendJob.blob; if (!blob) return;
  const name = fileBase(p) + (fmt === "pdf" ? ".pdf" : ".docx");
  if (useHelper(fmt) && sendJob.b64) {  // AC Cam List Send opens the share menu with the Word file attached
    location.href = helperUrl(name, SEND_MIME.docx, subject, message, sendJob.b64);
    closeModal(); commitVer(p); toast("Opening the share menu…"); buzz("done");
    return;
  }
  const file = typeof File === "function" ? new File([blob], name, { type: blob.type || (fmt === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document") }) : null;
  let can = false; try { can = !!(file && navigator.canShare && navigator.canShare({ files: [file] })) && !(fmt === "docx" && noDocxShare()); } catch (e) {}
  if (can) {
    try { await navigator.share({ files: [file], title: subject, text: message }); closeModal(); savedVer(p, true); }
    catch (e) {
      if (e && e.name === "AbortError") return;  // you closed the share menu
      if (fmt === "docx") {  // the phone won't attach Word files: remember it, and offer to save it instead (the next tap)
        try { localStorage.setItem(LS_NODOCX, "1"); } catch (x) {}
        const how = document.getElementById("sendHow"), go = document.getElementById("sendGo");
        if (how) { how.textContent = sendHowText("docx"); how.classList.add("warn"); }
        if (go) go.textContent = sendLabel("docx");
        return;
      }
      toast("The share menu didn't open. Try again.");
    }
    return;
  }
  // no sharing for this file here: save it, copy the message, and on a phone open an email with the subject and message filled in
  closeModal();
  try { await navigator.clipboard.writeText(subject + "\n\n" + message); } catch (e) {}
  if (await saveFile(name, blob)) savedVer(p);
  if (isTouch()) {
    setTimeout(() => { location.href = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(message); }, 700);
    toast(`${fmt === "docx" ? "Word file" : "PDF"} saved. Attach it to the email that opens.`);
  } else toast("File saved, and the message copied for your email.");
}
window.addEventListener("resize", fitPreview);
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function buildPdf(p) {
  if (!window.html2canvas) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  if (!window.jspdf) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  const clean = layoutOf() === "clean";
  const mk = html => { const d = document.createElement("div"); d.style.cssText = "position:fixed;left:-12000px;top:0;width:794px;background:#fff"; d.innerHTML = html; document.body.appendChild(d); return d; };
  const host = mk(exportHtml(p, { pdf: true }));
  // the clean layout repeats its title line at the top of every page: "Mizrahi (1 out of 3)" … "Camera List"
  const stamp = verStamp(), head = clean ? mk(`<div style="box-sizing:border-box;width:794px;padding:0 56px;background:#fff">${cleanTitleHtml(p, "9 out of 9", stamp)}</div>`) : null;
  try {
    const node = host.firstElementChild;
    const PAGE_PX = 1123, TOP = 40, BOTTOM = 44, headH = head ? head.firstElementChild.offsetHeight : 0;
    const bodyTop = clean ? TOP + headH + 10 : TOP, USABLE = PAGE_PX - bodyTop - BOTTOM, H = node.scrollHeight;
    const SCALE = Math.min(2, Math.sqrt(14e6 / (794 * Math.max(H, 1))));  // stay under mobile canvas limits
    const canvas = await window.html2canvas(node, { scale: SCALE, backgroundColor: "#ffffff" });
    const top0 = node.getBoundingClientRect().top;
    const cuts = [...node.querySelectorAll("[data-break]")].map(el => el.getBoundingClientRect().bottom - top0);
    const ends = [];
    for (let start = 0; start < H - 1;) {
      const limit = start + USABLE;
      if (limit >= H) { ends.push(H); break; }
      let best = start;
      for (const c of cuts) if (c > start + 40 && c <= limit) best = c;
      if (best === start) best = limit;
      ends.push(best); start = best;
    }
    const pdf = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth(), k = pw / 794, n = ends.length;
    let s0 = 0;
    for (let i = 0; i < n; i++) {
      const e = ends[i], h = e - s0, c2 = document.createElement("canvas");
      c2.width = canvas.width; c2.height = Math.max(1, Math.round(h * SCALE));
      const ctx = c2.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c2.width, c2.height);
      ctx.drawImage(canvas, 0, Math.round(s0 * SCALE), canvas.width, c2.height, 0, 0, canvas.width, c2.height);
      if (i) pdf.addPage();
      if (head) {
        head.firstElementChild.innerHTML = cleanTitleHtml(p, n > 1 ? `${i + 1} out of ${n}` : "", stamp);
        const hc = await window.html2canvas(head.firstElementChild, { scale: 2, backgroundColor: "#ffffff" });
        pdf.addImage(hc.toDataURL("image/jpeg", 0.92), "JPEG", 0, TOP * k, pw, head.firstElementChild.offsetHeight * k);
      }
      pdf.addImage(c2.toDataURL("image/jpeg", 0.92), "JPEG", 0, bodyTop * k, pw, h * k);
      s0 = e;
    }
    return pdf.output("blob");
  } finally { host.remove(); head?.remove(); }
}
let DL;
async function saveFile(filename, data) {
  if (DL === undefined) { try { DL = window.claude && typeof window.claude.use === "function" ? await window.claude.use("downloads") : null; } catch (e) { DL = null; } }
  if (!DL) {  // nowhere to save here: the text goes to the clipboard instead
    if (/\.txt$/.test(filename) && typeof data === "string") { copyText(data); return false; }
    toast("Files can't be saved in this view. Try Text."); return false;
  }
  try { await DL.save({ filename, data }); return true; }
  catch (e) {
    if (e && e.code === "declined") return false;
    toast(e && e.code === "rate_limited" ? "A download prompt is already open." : "The file couldn't be saved here. Try again, or Send it.");
    return false;
  }
}
function copyText(text, done) {
  const fallback = () => {
    const box = document.getElementById("copyFallback");
    if (!box) return;
    box.innerHTML = `<div class="field" style="padding-bottom:12px"><label for="copyArea">Copy this text</label><textarea class="copybox" id="copyArea" readonly></textarea></div>`;
    const ta = document.getElementById("copyArea"); ta.value = text; ta.focus(); ta.select();
  };
  try { navigator.clipboard.writeText(text).then(() => done ? done() : toast("List copied"), fallback); } catch (e) { fallback(); }
}

/* ---------- events ---------- */
function kidRef(p, ref) { const [lid, kid] = ref.split("|"); const l = p.items[lid]; const c = l && (l.children || []).find(k => k.id === kid); return { l, c }; }
function rerenderKeepScroll() { const y = window.scrollY; render(); window.scrollTo(0, y); }
/* press and hold (a production card): a menu instead of opening it */
const lp = { t: 0, x: 0, y: 0, el: null, fired: false };
function longPress(el) { if (el.dataset.lp === "prod" && !app.sel) prodMenu(el.dataset.id); }
document.addEventListener("pointerdown", e => {
  lp.fired = false; clearTimeout(lp.t); lp.el = null;
  const el = e.target.closest && e.target.closest("[data-lp]");
  if (!el || e.button > 0 || app.sel) return;
  lp.el = el; lp.x = e.clientX; lp.y = e.clientY;
  lp.t = setTimeout(() => { if (lp.el === el && el.isConnected) { lp.fired = true; longPress(el); } }, 520);
});
document.addEventListener("pointermove", e => { if (lp.el && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) { clearTimeout(lp.t); lp.el = null; } });
for (const t of ["pointerup", "pointercancel", "scroll"]) document.addEventListener(t, () => { clearTimeout(lp.t); lp.el = null; }, true);
document.addEventListener("contextmenu", e => {
  const el = e.target.closest && e.target.closest("[data-lp]"); if (!el || app.sel) return;
  e.preventDefault();
  if (!lp.fired) { clearTimeout(lp.t); lp.el = null; lp.fired = true; longPress(el); }
});
document.addEventListener("click", e => {
  if (lp.fired && e.target.closest && e.target.closest("[data-lp]")) { lp.fired = false; e.preventDefault(); return; }
  const b = e.target.closest("[data-act]");
  if (!b || b.disabled) return;
  const act = b.dataset.act, id = b.dataset.id, f = b.dataset.f;
  buzz("tap");
  if (act === "mfr-toggle") {  // a manufacturer heading: close or open it (not when its drag handle was tapped)
    if (e.target.closest("[data-drag]")) return;
    const m = app.settings.closedBrands || (app.settings.closedBrands = {}), k = b.dataset.k;
    if (m[k]) delete m[k]; else m[k] = true;
    touchSettings(); rerenderKeepScroll();
    return;
  }
  const p = cur();
  switch (act) {
    case "home": closePreview(); closeModal(); app.view = "home"; app.pid = null; app.editing = null; app.dupFrom = null; app.lq = ""; render(); window.scrollTo(0, 0); break;
    case "settings": if (app.view === "settings") break; closePreview(); app.setFrom = app.view === "production" ? app.pid : null; app.view = "settings"; render(); window.scrollTo(0, 0); break;
    case "theme": cycleTheme(); break;
    case "acct-in": if (window.AC_AUTH) window.AC_AUTH.signIn().catch(err => { console.warn(err); toast("Sign-in didn't go through. Try again."); }); break;
    case "acct-out": if (window.AC_AUTH) window.AC_AUTH.signOut(); break;
    case "new": app.formFor = null; app.dupFrom = null; app.view = "form"; render(); window.scrollTo(0, 0); document.getElementById("f-name")?.focus(); break;
    case "open": {
      const keep = b.dataset.keep === "1" && app.pid === id;
      app.pid = id; app.view = "production"; app.editing = null; app.dupFrom = null; app.setFrom = null;
      if (!keep) { app.editCat = false; app.tab = totals(cur() || { items: {} }).lines ? "list" : "add"; app.q = ""; app.lq = ""; app.cat = "all"; }
      render(); window.scrollTo(0, 0); break;
    }
    case "edit": app.formFor = app.pid; app.dupFrom = null; app.view = "form"; render(); window.scrollTo(0, 0); break;
    case "pick-house": {
      const wrap = document.getElementById("housePick");
      wrap.dataset.value = b.dataset.house;
      wrap.querySelectorAll(".house-opt").forEach(o => o.setAttribute("aria-pressed", String(o === b)));
      houseTheme(b.dataset.house);
      const err = document.getElementById("houseErr"); if (err) err.hidden = true;
      break;
    }
    /* the production's details panel under its name */
    case "pinfo": {
      const on = !app.open.has("prodfacts");
      if (on) app.open.add("prodfacts"); else app.open.delete("prodfacts");
      document.getElementById("pinfo")?.classList.toggle("open", on);
      document.querySelectorAll('[data-act="pinfo"]').forEach(x => x.setAttribute("aria-expanded", String(on)));
      break;
    }
    /* home: press-and-hold menu and selecting several */
    case "pm-dup": closeModal(); startDuplicate(id); break;
    case "pm-edit": closeModal(); app.pid = id; app.formFor = id; app.dupFrom = null; app.view = "form"; render(); window.scrollTo(0, 0); break;
    case "unit-sw": if (findProd(id) && id !== app.pid) { app.pid = id; app.editing = null; rerenderKeepScroll(); toast(findProd(id).mainOf ? "2nd Unit list" : "Main Unit list"); } break;
    case "u2-copy": case "u2-empty": {
      const m = findProd(id), q = unit2Of(m); closeModal(); if (!m || !q) break;
      if (act === "u2-copy") { q.items = clone(m.items); applyDefaults(q); touch(q); }
      app.pid = q.id; app.tab = "list"; render(); window.scrollTo(0, 0);
      toast(act === "u2-copy" ? `2nd Unit list: a copy of the main list (${totals(q).lines} items)` : "2nd Unit list: empty");
      break;
    }
    case "pm-select": closeModal(); app.sel = new Set([id]); render(); break;
    case "pm-del": {
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Tap again to delete"; break; }
      const nm = app.productions.find(x => x.id === id)?.name || "Production";
      const und = snapProds([id]); closeModal(); deleteProductions([id]); render(); undoable("Deleted", nm, und);
      break;
    }
    case "pick-prod": { if (!app.sel) break; if (app.sel.has(id)) app.sel.delete(id); else app.sel.add(id); rerenderKeepScroll(); break; }
    case "sel-cancel": app.sel = null; rerenderKeepScroll(); break;
    case "sel-dup": {
      const ids = [...(app.sel || [])]; if (!ids.length) break;
      for (const sid of ids) { const src = findProd(sid); if (src) dupWithUnit(src, { name: (src.name || "Production") + " (copy)" }); }
      app.sel = null; rerenderKeepScroll(); toast(`Duplicated ${ids.length} production${ids.length === 1 ? "" : "s"}`);
      break;
    }
    case "sel-del": {
      const ids = [...(app.sel || [])]; if (!ids.length) break;
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = `Tap again to delete ${ids.length}`; setTimeout(() => { if (b.isConnected) { b.classList.remove("armed"); b.textContent = "Delete"; } }, 4000); break; }
      const und = snapProds(ids), what = ids.length === 1 ? findProd(ids[0])?.name || "1 production" : `${ids.length} productions`;
      deleteProductions(ids); app.sel = null; rerenderKeepScroll(); undoable("Deleted", what, und);
      break;
    }
    /* the shoot dates calendar */
    case "cal-open": calOpen(b.dataset.mode, b.dataset.target); break;
    case "cal-day": calPick(b.dataset.d); break;
    case "cal-prev": case "cal-next": { const d = act === "cal-next" ? 1 : -1; cal.m += d; if (cal.m < 1) { cal.m = 12; cal.y--; } if (cal.m > 12) { cal.m = 1; cal.y++; } calRefresh(); document.querySelector(`#cal [data-act="${act}"]`)?.focus(); break; }
    case "cal-clear": calClear(); calRefresh(); break;
    case "cal-done": calDone(); break;
    /* Cam list sections: close and open */
    case "sec-toggle": {
      if (e.target.closest(".pen")) break;
      const k = "secx/" + b.dataset.k;
      if (app.open.has(k)) app.open.delete(k); else app.open.add(k);
      rerenderKeepScroll(); break;
    }
    case "sec-all": {
      const open = b.dataset.open === "1";
      for (const s of allSections()) { if (open) app.open.delete("secx/" + s.id); else app.open.add("secx/" + s.id); }
      rerenderKeepScroll(); break;
    }
    /* catalog: open or close everything inside a subcategory */
    case "sub-all": {
      const sub = b.closest("details.sub"); if (!sub) break;
      const open = b.dataset.open === "1", m = app.settings.closedBrands || (app.settings.closedBrands = {});
      sub.querySelectorAll("details[data-k]").forEach(d => { if (open) app.open.add(d.dataset.k); else app.open.delete(d.dataset.k); });
      sub.querySelectorAll("li.mfr-head[data-k]").forEach(li => { if (open) delete m[li.dataset.k]; else m[li.dataset.k] = true; });
      touchSettings(); rerenderKeepScroll(); break;
    }
    case "dup-line": {
      const l = p.items[id]; if (!l) break;
      const e0 = ITEM.get(id), nid = uid("custom-"), c = JSON.parse(JSON.stringify(l));
      Object.assign(c, { custom: true, added: Date.now(), sku: l.sku || (e0 && e0.it.sku) || "", brand: l.brand || "", auto: 0, url: l.url || (e0 && e0.it.url) || "" });
      delete c.autoWhy; delete c.orig; delete c.pos;
      (c.children || []).forEach(k => { k.id = uid("k"); });
      p.items[nid] = c; moveLine(p, nid, l.section, id, true);
      app.editing = nid; touch(p); rerenderKeepScroll(); document.getElementById("en-" + nid)?.select();
      toast("Duplicated. Rename the copy if you like.");
      break;
    }
    case "send-open": sendDialog(p); break;
    case "delete": {
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Tap again to delete"; setTimeout(() => { if (b.isConnected) { b.classList.remove("armed"); b.textContent = "Delete production"; } }, 4000); break; }
      const delId = mainOf(findProd(app.formFor))?.id || app.formFor, und = snapProds([delId]), nm = findProd(delId)?.name || "the production";
      deleteProductions([delId]);
      app.view = "home"; app.pid = null; render(); undoable("Deleted", nm, und);
      break;
    }
    case "dup": startDuplicate(id || app.pid); break;
    case "tab": app.tab = b.dataset.tab; app.editing = null; render(); window.scrollTo(0, 0); break;
    case "fin-open": { const s = fin(); s.on = true; s.more = {}; if (b.dataset.mm) { s.f = b.dataset.mm; s.t = b.dataset.t || ""; s.kind = ""; s.mount = ""; s.cov = ""; s.brand = ""; }
      render(); const fe = document.querySelector(".finder"); if (fe) window.scrollTo(0, fe.getBoundingClientRect().top + window.scrollY - 8); break; }
    case "fin-close": fin().on = false; render(); break;
    case "fin-brand": finBrandDialog(); break;
    case "fin-brand-pick": { const s2 = fin(); s2.brand = b.dataset.b || ""; s2.more = {}; closeModal(); const v = document.getElementById("fb-val"); v?.closest(".f-field")?.classList.toggle("set", !!s2.brand); if (v) v.textContent = s2.brand || "Any manufacturer"; refreshFinder(); break; }
    case "fin-recenter": { fin().f = b.dataset.mm; fin().more = {}; const inp = document.querySelector('[data-fin="f"]'); if (inp) inp.value = b.dataset.mm; refreshFinder(); break; }
    case "fin-narrow": { const s3 = fin(); s3.brand = b.dataset.b || ""; s3.more = {}; const v = document.getElementById("fb-val"); if (v) { v.textContent = s3.brand; v.closest(".f-field")?.classList.add("set"); } refreshFinder(); document.querySelector(".f-sum")?.scrollIntoView({ block: "start", behavior: "smooth" }); break; }
    case "fv-row": {
      const rows = fin().rows || (fin().rows = {}), on = rows[id] = !rows[id], li = b.closest(".f-card");
      if (li) { li.classList.toggle("open", on); b.setAttribute("aria-expanded", String(on)); b.setAttribute("aria-label", b.getAttribute("aria-label").replace(/^(More|Less)/, on ? "Less" : "More")); }
      break;
    }
    case "fv-toggle": { const mo = fin().more, kk = "o" + b.dataset.mm; mo[kk] = !mo[kk]; refreshFinder(); break; }
    case "fin-more": { const mo = fin().more; mo[b.dataset.mm] = (+mo[b.dataset.mm] || 0) + 1; refreshFinder(b.dataset.mm); break; }
    case "chip": app.cat = b.dataset.cat; document.getElementById("tree").innerHTML = treeHtml(p, houseById(p.houseId));
      document.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c === b))); break;
    /* catalog + favorites rows */
    case "pk-inc": case "pk-dec": {
      const inp = document.querySelector(`[data-pick="${CSS.escape(id)}"]`);
      if (inp) inp.value = Math.max(0, Math.min(9, (parseInt(inp.value, 10) || 0) + (act === "pk-inc" ? 1 : -1)));
      break;
    }
    case "cinc": case "cdec": {
      const l = p.items[id];
      const cur0 = l ? (f ? l[f] : lineQty(l)) : 0;
      const ids = setQty(p, id, cur0 + (act === "cinc" ? 1 : -1), l ? f : undefined);
      if (app.tab === "fav") rerenderKeepScroll(); else refreshRows(p, ids);
      popQty("c", id, l ? f : undefined);
      break;
    }
    case "star": {
      const key = b.dataset.key;
      toggleFav(key, { name: b.dataset.name, section: b.dataset.section });
      const on = isFav(key);
      document.querySelectorAll(`.star[data-key="${CSS.escape(key)}"]`).forEach(s => { s.setAttribute("aria-pressed", String(on)); s.textContent = on ? "★" : "☆"; s.setAttribute("aria-label", on ? "Remove from favorites" : "Add to favorites"); });
      toast(on ? "Added to favorites" : "Removed from favorites");
      if (app.tab === "fav") rerenderKeepScroll();
      break;
    }
    case "addfav": {
      const nid = uid("custom-");
      p.items[nid] = { qty: 1, note: "", name: b.dataset.name, brand: "", section: b.dataset.section, cat: "", sub: "", custom: true, added: Date.now(), children: [] };
      touch(p); rerenderKeepScroll();
      break;
    }
    /* gear list lines */
    case "linc": case "ldec": {
      const l = p.items[id]; if (!l) break;
      const cur0 = f ? l[f] : lineQty(l);
      setQty(p, id, cur0 + (act === "linc" ? 1 : -1), f);
      rerenderKeepScroll(); popQty("l", id, f);
      break;
    }
    case "remove": {
      const und = snapItems(p), name = p.items[id]?.name, gone = p.items[id];
      if (gone && gone.auto && /^for the .* cards$/.test(gone.autoWhy || "")) (p.readerOff || (p.readerOff = {}))[gone.autoWhy.slice(8, -6)] = true;
      delete p.items[id];
      if (app.editing === id) app.editing = null;
      applyDefaults(p); clashSettle(p); touch(p); rerenderKeepScroll(); undoable("Removed", name, und);
      break;
    }
    case "rec-card": if (p) recApply(p, id, l => { l.rec.card = b.dataset.card; delete l.rec.gb; }); break;
    case "rec-gb": if (p) recApply(p, id, l => { l.rec.gb = Number(b.dataset.gb); }); break;
    case "rec-fps": if (p) recApply(p, id, l => { l.rec.fps = Number(b.dataset.fps); }); break;
    case "mq": if (p) { const l = p.items[id], c = l && l.rec && l.rec.card; if (c) { const now = p.items[c] ? lineQty(p.items[c]) : 0; setQty(p, c, Math.max(0, now + Number(b.dataset.d))); closeModal(); mediaRedraw(p); } } break;
    case "edit-line": app.editing = app.editing === id ? null : id; rerenderKeepScroll(); document.getElementById("en-" + id)?.focus(); break;
    case "edit-done": app.editing = null; rerenderKeepScroll(); break;
    case "rename-reset": { const l = p.items[id]; if (l && l.orig) { l.name = l.orig; touch(p); rerenderKeepScroll(); } break; }
    case "kinc": case "kdec": {
      const { l, c } = kidRef(p, id); if (!c) break;
      const und = snapItems(p);
      c.qty = clampQ(c.qty + (act === "kinc" ? 1 : -1));
      if (!c.qty) l.children = l.children.filter(k => k !== c);
      touch(p); rerenderKeepScroll(); if (!c.qty) undoable("Removed", c.name, und); break;
    }
    case "krm": { const { l, c } = kidRef(p, id); if (c) { const und = snapItems(p); l.children = l.children.filter(k => k !== c); touch(p); rerenderKeepScroll(); undoable("Removed", c.name, und); } break; }
    case "undo": { const fn = undoFn; hideUndo(); if (fn) fn(); break; }
    /* editing the catalog and headings */
    case "cat-editmode": app.editCat = !app.editCat; rerenderKeepScroll(); break;
    case "cat-edit": catEditDialog(houseById(p.houseId), id); break;
    case "note": noteDialog(id); break;
    case "note-clear": setNote(id, ""); closeModal(); rerenderKeepScroll(); toast("Note deleted"); break;
    case "rename-mfr": e.preventDefault(); mfrDialog(houseById(p.houseId), b.dataset.k, b.dataset.b); break;
    case "new-folder": folderDialog(houseById(p.houseId), b.dataset.k); break;
    case "new-item": catEditDialog(houseById(p.houseId), null, b.dataset.k); break;
    case "cat-item-remove": {
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Tap again to remove"; break; }
      const h = houseById(p.houseId), name = ITEM.get(id)?.it.name || "";
      removeCatItem(h, id); closeModal(); rerenderKeepScroll(); toast(`Removed ${name}. Bring it back from Removed items.`);
      break;
    }
    case "cat-item-dup": {
      const h = houseById(p.houseId), nid = duplicateCatItem(h, id);
      if (!nid) break;
      rerenderKeepScroll(); catEditDialog(h, nid); document.getElementById("ci-name")?.select();
      toast("Copy made. Rename it here.");
      break;
    }
    case "ci-listonly": {  // a typed-in item that stays off the catalog
      const f2 = document.getElementById("catItemForm"), nm = (f2?.elements.name.value || "").trim();
      if (!nm) { f2?.elements.name.focus(); break; }
      addCustomLine(p, nm, b.dataset.to); closeModal(); rerenderKeepScroll(); toast("Added to this list only");
      document.querySelector(`form[data-custom="${CSS.escape(b.dataset.to)}"] input`)?.focus();
      break;
    }
    case "removed-list": removedDialog(houseById(b.dataset.house || p.houseId)); break;
    case "cat-item-restore": {
      const h = houseById(b.dataset.house || p.houseId); restoreCatItem(h, id);
      if (hiddenItems(h).length) removedDialog(h); else closeModal();
      rerenderKeepScroll(); toast("Back in the catalog");
      break;
    }
    case "cat-item-delete": {
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Tap again to delete"; break; }
      deleteOwnItem(houseById(p.houseId), id); closeModal(); rerenderKeepScroll(); toast("Item deleted");
      break;
    }
    case "cat-item-reset": { const h = houseById(p.houseId); resetCatItem(h, id); closeModal(); rerenderKeepScroll(); toast("Back to the rental house's version"); break; }
    case "cat-reset-all": {
      if (!b.classList.contains("armed")) { b.classList.add("armed", "danger"); b.textContent = "Tap again to undo all"; setTimeout(() => { if (b.isConnected) rerenderKeepScroll(); }, 4000); break; }
      const hid = b.dataset.house || p.houseId, all = app.settings.catalog || (app.settings.catalog = {}); if (STARTER.catalog[hid]) all[hid] = clone(STARTER.catalog[hid]); else delete all[hid];
      applyCatalog(); touchSettings(); rerenderKeepScroll(); toast("Catalog back to the starting version");
      break;
    }
    case "rename-head": e.preventDefault(); headDialog("cat", houseById(p.houseId), b.dataset.k); break;
    case "rename-sec": headDialog("section", null, b.dataset.k); break;
    case "new-cat": newHeadDialog("cat", houseById(p.houseId)); break;
    case "new-sub": newHeadDialog("sub", houseById(p.houseId), b.dataset.c); break;
    case "new-section": newHeadDialog("section", null); break;
    case "head-delete": {
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Tap again to delete"; break; }
      if (b.dataset.scope === "section") deleteSection(b.dataset.k);
      else if (isOwnGroup(houseById(p.houseId), b.dataset.k)) deleteFolder(houseById(p.houseId), b.dataset.k);
      else { deleteCustom(houseById(p.houseId), b.dataset.k); if (app.cat === b.dataset.k) app.cat = "all"; }
      closeModal(); rerenderKeepScroll(); toast("Deleted");
      break;
    }
    case "head-reset": setHead(b.dataset.scope, p ? houseById(p.houseId) : null, b.dataset.k, ""); closeModal(); rerenderKeepScroll(); break;
    /* modal */
    case "modal-close": closeModal(); break;
    case "modal-undo": {
      closeModal();
      if (p && p.items[id]) { delete p.items[id]; applyDefaults(p); touch(p); }
      if (app.tab === "add") refreshRows(p, Object.keys(p.items).concat(id)); else rerenderKeepScroll();
      toast("Removed");
      break;
    }
    /* settings */
    case "rinc": case "rdec": { const r = app.settings.rules.find(x => x.id === b.dataset.rid); if (r) { r.qty = Math.max(0, Math.min(99, r.qty + (act === "rinc" ? 1 : -1))); touchSettings(); rerenderKeepScroll(); } break; }
    case "rdel": app.settings.rules = app.settings.rules.filter(x => x.id !== b.dataset.rid); touchSettings(); rerenderKeepScroll(); break;
    case "rule-new": ruleDialog(); break;
    case "pkg-add": ruleDialog(id); break;
    case "pk-more": { const k = "add" + Date.now().toString(36); dd[k] = {}; dd.q[k] = 1; dd.adds.push(k); document.getElementById("pk-adds").innerHTML = pkgAddsHtml(); document.getElementById("pk-" + k + "-c")?.focus(); break; }
    case "pk-less": { dd.adds = dd.adds.filter(k => k !== b.dataset.k); delete dd[b.dataset.k]; document.getElementById("pk-adds").innerHTML = pkgAddsHtml(); break; }
    case "clash-new": clashDialog(); break;
    case "clash-edit": clashDialog(b.dataset.rid); break;
    case "clash-del": app.settings.clashes = clashRules().filter(x => x.id !== b.dataset.rid); touchSettings(); rerenderKeepScroll(); break;
    case "cx-x": { const k = b.dataset.k; cx[k] = cx[k].filter(x => x !== id); document.getElementById("cx-" + k).innerHTML = cxChips(k); break; }
    case "clash-swap": case "clash-drop": case "clash-keep": {
      const q = cur(); closeModal(); if (!q) break;
      const rid = b.dataset.rid, r = clashRules().find(x => x.id === rid); let ids = [];
      if (act === "clash-keep") { (q.clashOk || (q.clashOk = {}))[rid] = true; touch(q); }
      else if (act === "clash-swap") { ids = clashSwap(q, rid); if (r) toast(`Swapped for ${shortName(itName(r.swap))}`); }
      else { const und = snapItems(q), names = (r ? r.b : []).filter(x => q.items[x]).map(x => shortName(itName(x))).join(", "); ids = clashDrop(q, rid); undoable("Removed", names, und); }
      if (app.tab === "add" && !(app.q || "").trim()) refreshRows(q, Object.keys(q.items).concat(ids)); else rerenderKeepScroll();
      break;
    }
    case "share-app": shareApp(); break;
    case "cat-import-go": {
      const d = pendingCatalog; pendingCatalog = null; closeModal(); if (!d) break;
      const was = clone({ catalog: app.settings.catalog || {}, closedBrands: app.settings.closedBrands || {}, catColors: app.settings.catColors || {} });
      const all = app.settings.catalog || (app.settings.catalog = {});
      for (const hid of Object.keys(d.catalog)) if (houseById(hid)) all[hid] = clone(d.catalog[hid]);
      if (d.closedBrands && typeof d.closedBrands === "object") app.settings.closedBrands = clone(d.closedBrands);
      if (d.catColors && typeof d.catColors === "object") app.settings.catColors = { ...(app.settings.catColors || {}), ...clone(d.catColors) };
      applyCatalog(); touchSettings(); rerenderKeepScroll(); toast("Catalog loaded");
      undoable("Loaded", "a catalog", () => { Object.assign(app.settings, was); applyCatalog(); touchSettings(); rerenderKeepScroll(); });
      break;
    }
    case "cat-export": {  // the same shape as the app's built-in starting catalog
      const d = new Date(), two = n => String(n).padStart(2, "0");
      const data = { catalog: app.settings.catalog || {}, closedBrands: app.settings.closedBrands || {}, catColors: app.settings.catColors || {}, savedAt: d.toISOString() };
      saveFile(`AC Cam List catalog ${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}.json`, JSON.stringify(data)).then(ok => { if (ok) toast("Catalog saved to your Downloads"); });
      break;
    }
    case "notice-close": { const n = document.getElementById("notice"); if (n) { n.classList.remove("in"); n.hidden = true; } break; }
    /* exports */
    case "export-docx": getFile(p, "docx").then(blob => saveFile(fileBase(p) + ".docx", blob)).then(ok => { if (ok) savedVer(p); }).catch(() => toast("The Word file couldn't be built. Use PDF or Text.")); break;
    case "export-csv": saveFile(fileBase(p) + ".csv", csvText(p)); break;
    case "export-pdf": if (!fileReady(p, "pdf")) toast("Building the PDF…"); getFile(p, "pdf").then(blob => saveFile(fileBase(p) + ".pdf", blob)).then(ok => { if (ok) savedVer(p); }).catch(() => toast("The PDF couldn't be built here. Use Word or Text.")); break;
    case "copy": copyText(listText(p), () => { commitVer(p); toast(`List copied · version ${p.docVer}`); }); break;
    case "export-txt": saveFile(fileBase(p) + ".txt", listText(p)).then(ok => { if (ok) savedVer(p); }); break;
    case "preview": openPreview(p); break;
    case "preview-close": closePreview(); break;
    case "preview-sku": {
      app.settings.exportSku = !skuOn(); touchSettings();
      b.setAttribute("aria-pressed", String(skuOn())); b.textContent = "SKU " + (skuOn() ? "on" : "off");
      const paper = document.querySelector("#preview .pv-paper"); if (paper) { paper.innerHTML = exportHtml(p); fitPreview(); }
      break;
    }
    case "pv-unit": if (findProd(id) && id !== app.pid) { const dir = findProd(id).mainOf ? 1 : -1; app.pid = id; app.editing = null; render(); swapPreview(cur(), dir); } break;
    case "preview-layout": {
      app.settings.exportLayout = b.dataset.v === "table" ? "table" : "clean"; touchSettings();
      document.querySelectorAll('[data-act="preview-layout"]').forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      const paper = document.querySelector("#preview .pv-paper"); if (paper) { paper.innerHTML = exportHtml(p); fitPreview(); }
      break;
    }
  }
});
document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target && e.target.id === "bq") { e.preventDefault(); document.querySelector("#bpList li:not([hidden]) button")?.click(); return; } if (e.key !== "Escape") return; if (document.getElementById("modal")) closeModal(); else closePreview(); });
document.addEventListener("toggle", e => {
  const k = e.target && e.target.dataset && e.target.dataset.k;
  if (!k || app.q.trim()) return;
  if (e.target.open) app.open.add(k); else app.open.delete(k);
}, true);
document.addEventListener("input", e => {
  const t = e.target, p = cur();
  if (t.name === "colorHex" && t.form) { const r = t.form.querySelector('input[name="color"][value="custom"]'); if (r) r.checked = true; t.closest(".sw")?.style.setProperty("--sw", t.value); return; }
  if (t.dataset && t.dataset.fin && p) { fin()[t.dataset.fin] = t.value.trim(); fin().more = {}; if (t.tagName === "SELECT") t.closest(".f-field")?.classList.toggle("set", !!t.value); refreshFinder(); return; }
  if (t.id === "q") { app.q = t.value; document.getElementById("tree").innerHTML = treeHtml(p, houseById(p.houseId)); return; }
  if (t.id === "lq") { app.lq = t.value; applyListFilter(); return; }
  if (t.id === "bq") { const q = norm(t.value.trim()); let n = 0; document.querySelectorAll("#bpList li").forEach(li => { const hit = !q || li.dataset.b.includes(q); li.hidden = !hit; if (hit) n++; }); const none = document.getElementById("bpNone"); if (none) none.hidden = n > 0; return; }
  if (!p) return;
  if (t.dataset.note) { const l = p.items[t.dataset.note]; if (l) { l.note = t.value.slice(0, 200); touch(p); } return; }
  if (t.dataset.ename) { const l = p.items[t.dataset.ename]; if (l) { l.name = t.value.slice(0, 160) || l.orig || l.name; touch(p); } return; }
  if (t.dataset.kname) { const { c } = kidRef(p, t.dataset.kname); if (c) { c.name = t.value.slice(0, 120); touch(p); } return; }
});
document.addEventListener("change", e => {
  if (e.target && e.target.dataset && e.target.dataset.catimport) { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) importCatalog(f); return; }
  const t = e.target, p = cur();
  if (t.form && t.form.id === "catItemForm" && ["c", "s", "g"].includes(t.name)) { catDialogSync(t.name); return; }
  if (t.id === "nh-cat") {
    const f = t.form, isNew = t.value === "__new";
    f.elements.name.hidden = !isNew;
    const col = document.getElementById("nh-color"); if (col) col.hidden = !isNew;
    f.elements.sub.placeholder = isNew ? "Optional: leave empty for none" : "";
    if (isNew) f.elements.name.focus(); else f.elements.sub.focus();
    return;
  }
  if (t.dataset.rqty) { const r = app.settings.rules.find(x => x.id === t.dataset.rqty); if (r) { r.qty = Math.max(0, Math.min(99, parseInt(t.value, 10) || 0)); touchSettings(); } return; }
  if (t.name === "theme" && t.type === "radio") { setTheme(t.value); return; }
  if (t.dataset.rec && p) {
    const id = t.dataset.id, k = t.dataset.rec;
    recApply(p, id, (l, e) => {
      if (k === "mbps") { const v = Math.max(0, Math.min(20000, parseFloat(t.value) || 0)); if (v) l.rec.mbps = v; else delete l.rec.mbps; return; }
      const prof = recProfile(e.it.name); if (!prof) return;
      if (k === "codec") { l.rec.codec = t.value; recEnsure(l, e, p); }
      if (k === "mode") { l.rec.mode = t.value; const c = prof.find(x => x.n === l.rec.codec), md = c && c.m.find(x => x[0] === t.value); if (md && l.rec.fps > md[3]) l.rec.fps = REC_FPS.filter(f => f <= md[3]).pop(); }
    });
    return;
  }
  if (t.name === "readers" && t.type === "checkbox") { app.settings.readers = t.checked; touchSettings(); for (const q of app.productions) { applyDefaults(q); touch(q); } toast(t.checked ? "Card readers added to your lists" : "Card readers taken off your lists"); return; }
  if (t.name === "helperOn" && t.type === "checkbox") { setHelper(t.checked); app.helperMissing = false; rerenderKeepScroll(); return; }
  if (t.name === "haptics" && t.type === "checkbox") { app.settings.haptics = t.checked; touchSettings(); buzz("tap"); return; }
  if (t.id === "f-u2on") { document.getElementById("u2Body").hidden = !t.checked; if (t.checked) document.getElementById("f-u2dp")?.focus(); return; }
  if (t.id === "f-u2same") { document.getElementById("u2Dates").hidden = t.checked; return; }
  if (t.form && t.form.id === "prodForm" && (t.name === "notesBold" || t.name === "notesSize")) {
    const ta = document.getElementById("f-notes"), f2 = t.form;
    ta.className = "nt-" + (f2.querySelector('input[name="notesSize"]:checked')?.value || "m") + (f2.elements.notesBold.checked ? " nt-b" : ""); return;
  }
  if (t.dataset.settitle) { app.settings.docTitle = t.value.trim().slice(0, 60); touchSettings(); toast("Title saved"); return; }
  if (t.dataset.pkq) { dd.q[t.dataset.pkq] = Math.max(1, Math.min(99, parseInt(t.value, 10) || 1)); return; }
  if (t.dataset.pkmedia) {
    const k = t.dataset.pkmedia, m = dd.media[t.dataset.type]; if (!m) return;
    if (k === "on") { m.on = t.checked; document.getElementById("pk-media").innerHTML = pkgMediaHtml(); }
    else if (k === "id") m.id = t.value; else m.qty = Math.max(1, Math.min(99, parseInt(t.value, 10) || 1));
    return;
  }
  if (t.dataset.rdhouse) {
    dd.house = t.value; cx.a = []; cx.b = [];
    if (dd.adds) { dd.adds.forEach(k => { dd[k] = {}; }); dd.media = {}; const ad = document.getElementById("pk-adds"); if (ad) ad.innerHTML = pkgAddsHtml(); const md = document.getElementById("pk-media"); if (md) md.innerHTML = pkgMediaHtml(); }
    ["when", "add", "ca", "cb", "cc"].forEach(k => { dd[k] = {}; const box = document.getElementById("pk-" + k); if (box) box.innerHTML = pickerHtml(k); });
    ["a", "b"].forEach(k => { const box = document.getElementById("cx-" + k); if (box) box.innerHTML = ""; });
    return;
  }
  if (t.dataset.pkc || t.dataset.pks || t.dataset.pki) {
    const k = t.dataset.pkc || t.dataset.pks || t.dataset.pki, v = dd[k];
    if (t.dataset.pkc) { v.c = t.value; v.s = ""; v.id = ""; }
    else if (t.dataset.pks) { v.s = t.value; v.id = ""; }
    else v.id = t.value;
    if (t.dataset.pki && (k === "ca" || k === "cb") && t.value) {  // picked: it joins the list above, and the picker is ready for another
      const list = cx[k[1]]; if (!list.includes(t.value)) list.push(t.value);
      v.id = ""; document.getElementById("cx-" + k[1]).innerHTML = cxChips(k[1]);
      document.getElementById("pk-" + k).innerHTML = pickerHtml(k); document.getElementById("pk-" + k + "-i")?.focus();
      return;
    }
    if (!t.dataset.pki) { const box = document.getElementById("pk-" + k); box.innerHTML = pickerHtml(k); box.querySelector(t.dataset.pkc ? "[data-pks]" : "[data-pki]")?.focus(); }
    if (k === "when") {
      dd.media = {}; const md = document.getElementById("pk-media"); if (md) md.innerHTML = pkgMediaHtml();
      const untouched = dd.adds.length === 1 && !(dd[dd.adds[0]] || {}).c;
      if (pkgKinds().length && untouched) { dd.adds = []; document.getElementById("pk-adds").innerHTML = ""; }
      else if (!pkgKinds().length && !dd.adds.length) { dd.adds = ["add0"]; dd.add0 = {}; dd.q.add0 = 1; document.getElementById("pk-adds").innerHTML = pkgAddsHtml(); }
    }
    return;
  }
  if (t.form && t.form.id === "meForm") {
    app.settings.me = { name: t.form.elements.name.value.trim().slice(0, 80), phone: t.form.elements.phone.value.trim().slice(0, 30) };
    touchSettings(); toast("Saved for new productions"); return;
  }
  if (t.form && t.form.id === "sendForm" && t.name === "fmt") { if (p) sendPrep(p, t.value); return; }
  if (!p) return;
  const f = t.dataset.f;
  if (t.dataset.cqty) { const ids = setQty(p, t.dataset.cqty, t.value, p.items[t.dataset.cqty] ? f : undefined); if (app.tab === "fav") rerenderKeepScroll(); else refreshRows(p, ids); return; }
  if (t.dataset.lqty) { setQty(p, t.dataset.lqty, t.value, f); rerenderKeepScroll(); return; }
  if (t.dataset.kqty) { const { l, c } = kidRef(p, t.dataset.kqty); if (c) { c.qty = clampQ(t.value); if (!c.qty) l.children = l.children.filter(k => k !== c); touch(p); rerenderKeepScroll(); } return; }
  if (t.dataset.ename) {  // a line renamed: its catalog item takes the name too, for the next lists
    const id = t.dataset.ename, l = p.items[id], e = ITEM.get(id);
    if (l && e && !l.custom) { const from = e.it.name; if (renameCatItem(e.h, id, l.name)) { syncLineNames(id, from, l.name); l.orig = l.name; toast(`Renamed in ${e.h.name}'s catalog too`); } }
    return;
  }
});
document.addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === "welcomeForm") {
    const nm = f.elements.name.value.trim().slice(0, 80);
    app.settings.me = { ...(app.settings.me || {}), name: nm }; app.settings.welcomed = true; touchSettings();
    buzz("done"); app.view = "home"; app.justWelcomed = true; render(); window.scrollTo(0, 0); return;
  }
  if (f.id === "catItemForm") {
    const p = cur(), h = p && houseById(p.houseId);
    if (!h) return;
    const v = Object.fromEntries(new FormData(f).entries());
    if (!(v.name || "").trim()) { f.elements.name.focus(); return; }
    if (v.c === "__new") {
      const nm = (v.cnew || "").trim();
      if (!nm) { f.elements.cnew.focus(); return; }
      [v.c, v.s] = ensureCategory(h, nm, v.s === "__new" ? (v.snew || "").trim() || "General" : "", v.section);
    } else if (v.s === "__new") v.s = ensureSub(h, v.c, (v.snew || "").trim() || "General", v.section);
    let id = f.dataset.id;
    const was = id ? ITEM.get(id)?.it.name : "";
    if (f.dataset.mode === "new") id = createOwnItem(h, v); else { saveCatItem(h, id, v); syncLineNames(id, was, ITEM.get(id)?.it.name); }
    if (id) setNote(id, v.note);
    const e2 = id && ITEM.get(id);
    if (e2) { app.open.add(e2.c.id); app.open.add(e2.s.key); app.open.add(e2.s.key + "/" + grpOf(e2.it, e2.s)); }
    const addTo = f.dataset.addto;
    if (addTo && e2) { setQty(p, id, 1); if (p.items[id]) p.items[id].section = addTo; touch(p); }  // typed into the Cam list: it goes on the list too
    closeModal(); rerenderKeepScroll();
    if (e2 && !addTo) document.querySelector(`[data-row="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center" });
    if (addTo) document.querySelector(`form[data-custom="${CSS.escape(addTo)}"] input`)?.focus();
    toast(e2 ? `${f.dataset.mode === "new" ? "Added" : "Saved"} in ${e2.c.name}${e2.s.direct ? "" : " › " + e2.s.name}${addTo ? ", and on the list" : ""}` : "Saved");
    return;
  }
  if (f.id === "newHeadForm") {
    const p = cur(), h = p && houseById(p.houseId), v = Object.fromEntries(new FormData(f).entries());
    const name = (v.name || "").trim(), sub = (v.sub || "").trim();
    if (f.dataset.kind === "cat") {
      let cid, skey;
      if (v.cat === "__new") {
        if (!name) { f.elements.name.focus(); return; }
        const existed = h.categories.some(c => norm(c.name) === norm(name));
        [cid, skey] = ensureCategory(h, name, sub, v.section);
        const nc = h.categories.find(c => c.id === cid); if (nc && !existed) setCatColor(nc, pickedColor(f));
      } else {
        if (!sub) { f.elements.sub.focus(); return; }
        cid = v.cat; skey = ensureSub(h, cid, sub, v.section);
      }
      const sObj = subByKey(h, skey), c = sObj ? catOfSub(h, sObj) : null;
      app.open.add(cid); app.open.add(skey);
      if (app.cat !== "all") app.cat = cid;
      toast(sObj && !sObj.direct ? `Added ${c ? c.name : ""} › ${sObj.name}. Drag items onto it.` : `Added ${c ? c.name : ""}. Drag items onto its heading.`);
    } else {
      if (!name) { f.elements.name.focus(); return; }
      addSection(name, v.pos); toast(`Added ${name}`);
    }
    closeModal(); rerenderKeepScroll();
    return;
  }
  if (f.id === "motorForm") {
    const p = cur(); if (!p) return;
    const ids = []; let n = 0;
    for (const inp of f.querySelectorAll("[data-pick]")) {
      const k = Math.max(0, Math.min(9, parseInt(inp.value, 10) || 0)), mid = inp.dataset.pick;
      if (!k) continue;
      ids.push(...setQty(p, mid, (p.items[mid] ? p.items[mid].qty : 0) + k)); n += k;
    }
    closeModal();
    if (app.tab === "add" && !app.q.trim()) refreshRows(p, ids); else rerenderKeepScroll();
    if (n) toast(`Added ${n} motor${n === 1 ? "" : "s"}`);
    clashPrompt(p, ids);
    return;
  }
  if (f.id === "mfrForm") {
    const p = cur(), h = p && houseById(p.houseId), name = (f.elements.name.value || "").trim();
    if (!h) return;
    if (!name) { f.elements.name.focus(); return; }
    const n = name === f.dataset.b ? 0 : renameBrandInGroup(h, f.dataset.k, f.dataset.b, name);
    closeModal(); rerenderKeepScroll();
    if (n) toast(`${n} item${n === 1 ? "" : "s"} now under ${name}`);
    return;
  }
  if (f.id === "folderForm") {
    const p = cur(), h = p && houseById(p.houseId), name = (f.elements.name.value || "").trim();
    if (!h) return;
    if (!name) { f.elements.name.focus(); return; }
    const parent = f.dataset.parent, key = addFolder(h, parent, name, f.elements.section ? f.elements.section.value : undefined);
    if (!key) return;
    if (parent.includes("/")) { app.open.add(splitKey(parent)[0]); app.open.add(parent); app.open.add(key); }
    else { app.open.add(parent); app.open.add(key); }
    closeModal(); rerenderKeepScroll(); toast(`Added folder ${name}. Drag items into it.`);
    return;
  }
  if (f.id === "noteForm") {
    setNote(f.dataset.id, f.elements.note.value);
    closeModal();
    if (app.tab === "add" && !app.q.trim()) refreshRows(cur(), [f.dataset.id]); else rerenderKeepScroll();
    return;
  }
  if (f.id === "headForm") {
    const p = cur();
    const name = (f.elements.name.value || "").trim();
    if (!name) { f.elements.name.focus(); return; }
    setHead(f.dataset.scope, p ? houseById(p.houseId) : null, f.dataset.k, name);
    if (f.elements.color && p) { const c = houseById(p.houseId).categories.find(x => x.id === f.dataset.k); if (c) setCatColor(c, pickedColor(f)); }
    if (f.elements.split && p) setBrandSplit(houseById(p.houseId), f.dataset.k, f.elements.split.checked);
    if (f.elements.flat && p) setFlat(houseById(p.houseId), f.dataset.k, f.elements.flat.checked);
    closeModal(); rerenderKeepScroll();
    return;
  }
  if (f.id === "prodForm") {
    const v = Object.fromEntries(new FormData(f).entries());
    const json = t => { try { return JSON.parse(t || "{}") || {}; } catch (err) { return {}; } };
    const fields = { name: v.name.trim(), company: v.company.trim(), dp: v.dp.trim(), ac: v.ac.trim(), acPhone: v.acPhone.trim(),
      prep: v.prep, shootStart: v.shootStart, shootEnd: v.shootEnd && v.shootEnd >= v.shootStart ? v.shootEnd : v.shootStart,
      shootDays: v.shootDays ? String(Math.max(0, parseInt(v.shootDays, 10) || 0)) : "", days: json(v.days), notes: v.notes.trim(),
      notesBold: !!v.notesBold, notesSize: ["s", "m", "l"].includes(v.notesSize) ? v.notesSize : "m",
      houseId: document.getElementById("housePick").dataset.value };
    if (!fields.name) { document.getElementById("f-name").focus(); return; }
    if (!houseById(fields.houseId)) { const err = document.getElementById("houseErr"); if (err) err.hidden = false; document.querySelector("#housePick .house-opt")?.focus(); return; }
    let p = app.formFor ? mainOf(findProd(app.formFor)) : null;
    const src = !p && app.dupFrom && findProd(app.dupFrom);
    const u2on = !!v.u2on, oldQ = p ? unit2Of(p) : null;
    // switching the 2nd Unit off takes its list away: ask first when it has items
    if (!u2on && oldQ && totals(oldQ).lines && f.dataset.u2drop !== "1") {
      f.dataset.u2drop = "1"; const err = document.getElementById("u2Err");
      if (err) { err.textContent = `Tap Save again to remove the 2nd Unit and its ${totals(oldQ).lines} items.`; err.hidden = false; document.getElementById("u2Body").hidden = false; }
      return;
    }
    const was = app.pid;
    if (p) { Object.assign(p, fields); toast("Details saved"); }
    else if (src) { p = copyProduction(src, fields); delete p.unit2; app.productions.push(p); app.tab = "list"; toast(`Made ${p.name} with ${totals(p).lines} items`); }
    else { p = newProduction(fields); app.productions.push(p); app.tab = "add"; }
    // the 2nd Unit: the same production and house; its own camera crew, and the main dates or its own
    let ask = false;
    if (u2on) {
      const same = !!v.u2_same, sd = json(v.u2_days);
      const qf = { name: p.name, company: p.company, houseId: p.houseId, dp: (v.u2_dp || "").trim(), ac: (v.u2_ac || "").trim(), acPhone: (v.u2_acPhone || "").trim(),
        unit: "2nd Unit", mainOf: p.id, sameDates: same, notes: p.notes, notesBold: p.notesBold, notesSize: p.notesSize,  // the notes are the production's, on both lists
        ...(same ? { prep: p.prep, shootStart: p.shootStart, shootEnd: p.shootEnd, days: clone(p.days), shootDays: p.shootDays }
          : { prep: v.u2_prep || "", shootStart: v.u2_shootStart || "", shootEnd: v.u2_shootEnd && v.u2_shootEnd >= v.u2_shootStart ? v.u2_shootEnd : v.u2_shootStart || "", days: sd, shootDays: "" }) };
      let q = oldQ;
      const srcQ = src ? unit2Of(src) : null;
      if (q) Object.assign(q, qf);
      else { q = srcQ ? copyProduction(srcQ, qf) : newProduction(qf); app.productions.push(q); ask = !srcQ && totals(p).lines > 0; }
      p.unit2 = q.id; p.unit = "Main Unit"; touch(q);
    } else if (oldQ) {
      const unitWas = p.unit; deleteProductions([oldQ.id]); delete p.unit2; p.unit = "";
      undoable("Removed", "the 2nd Unit", () => { if (!findProd(oldQ.id)) app.productions.push(oldQ); p.unit2 = oldQ.id; p.unit = unitWas || "Main Unit"; touch(oldQ); touch(p); render(); });
    }
    else if (p.unit && !p.mainOf) p.unit = "";
    app.dupFrom = null;
    touch(p);
    const stay = was && findProd(was) && mainOf(findProd(was)) === p ? was : p.id;
    app.pid = stay; app.view = "production"; app.q = ""; app.lq = ""; app.cat = "all"; render(); window.scrollTo(0, 0);
    if (ask) unit2StartDialog(p);
    return;
  }
  if (f.id === "sendForm") { const p = cur(); if (p) sendNow(p, f); return; }
  if (f.id === "clashForm") {
    const err = document.getElementById("rdErr"), say = m => { err.textContent = m; err.hidden = false; };
    if (!cx.a.length) return say("Choose the item.");
    if (!cx.b.length) return say("Choose what it doesn't work with.");
    if (cx.a.some(x => cx.b.includes(x))) return say("An item can't be on both sides.");
    const swap = (dd.cc && dd.cc.id) || "";
    if (swap && (cx.b.includes(swap) || cx.a.includes(swap))) return say("Choose a different item to use instead.");
    const why = (f.elements.why.value || "").trim().slice(0, 120), list = clashRules(), r = cx.id && list.find(x => x.id === cx.id);
    const v = { house: dd.house, a: [...cx.a], b: [...cx.b], swap, why };
    if (r) Object.assign(r, v); else list.push({ id: uid("x-"), ...v });
    touchSettings(); closeModal(); rerenderKeepScroll(); toast("Rule saved");
    return;
  }
  if (f.id === "ruleForm") {
    const err = document.getElementById("rdErr"), say = m => { err.textContent = m; err.hidden = false; };
    const when = dd.when.id;
    if (!when) return say("Choose the item you add.");
    const items = [];
    for (const m of Object.values(dd.media || {})) if (m.on && m.id) items.push([m.id, m.qty]);
    for (const k of dd.adds) if (dd[k] && dd[k].id) items.push([dd[k].id, dd.q[k] || 1]);
    if (!items.length) return say("Choose what comes with it.");
    if (items.some(([id]) => id === when)) return say("Choose a different item to come with it.");
    for (const [add, qty] of items) {
      const ex = app.settings.rules.find(r => r.kind === "item" && r.when === when && r.add === add);
      if (ex) ex.qty = qty; else app.settings.rules.push({ id: uid("r-"), kind: "item", house: dd.house, when, add, qty });
    }
    touchSettings(); closeModal(); rerenderKeepScroll(); toast(dd.fixed ? "Added to the package" : "Package saved");
    return;
  }
  const p = cur();
  if (!p) return;
  if (f.dataset.custom) {
    const name = (f.elements.name.value || "").trim().slice(0, 120), sec = f.dataset.custom, h = houseById(p.houseId);
    if (!name) return;
    const g = h ? catalogGuess(h, name, sec) : { none: true };
    if (g.match) {  // it's already in the catalog: add that item
      const had = p.items[g.match];
      setQty(p, g.match, (had ? lineQty(had) : 0) + 1);
      if (!had && p.items[g.match]) p.items[g.match].section = sec;
      touch(p); rerenderKeepScroll(); toast(`Added ${ITEM.get(g.match).it.name} from ${h.name}'s catalog`);
    } else if (g.sub && g.sure) {  // a clear home in the catalog: save it there and add it
      const id = createOwnItem(h, { name, brand: g.brand || "", s: g.sub.key, g: g.group, section: sec });
      if (!id) return;
      setQty(p, id, 1); if (p.items[id]) p.items[id].section = sec;
      touch(p); rerenderKeepScroll();
      const e2 = ITEM.get(id); toast(`Added, and saved in ${h.name}'s catalog › ${e2 ? e2.c.name + (e2.s.direct ? "" : " › " + e2.s.name) : g.sub.name}`);
    } else if (g.sub || (!g.none && h)) {  // not sure where it goes in the catalog: ask, with a best guess picked
      catEditDialog(h, null, g.sub ? g.sub.key + (g.group ? "/" + g.group : "") : null, { name, addTo: sec, brand: g.brand });
      return;
    } else {  // nothing like it in the catalog (AKS…): just a line on this list
      addCustomLine(p, name, sec); rerenderKeepScroll();
    }
    document.querySelector(`form[data-custom="${CSS.escape(sec)}"] input`)?.focus();
    return;
  }
  if (f.dataset.kadd) {
    const name = (f.elements.name.value || "").trim(), l = p.items[f.dataset.kadd];
    if (!name || !l) return;
    (l.children = l.children || []).push({ id: uid("k"), name: name.slice(0, 120), qty: 1 });
    touch(p); rerenderKeepScroll();
    document.querySelector(`form[data-kadd="${CSS.escape(f.dataset.kadd)}"] input`)?.focus();
  }
});

/* ---------- drag to move: catalog items onto headings, gear list lines within and between sections ---------- */
function moveLine(p, id, sec, ref, after) {
  const l = p.items[id];
  if (!l || !allSections().some(s => s.id === sec)) return false;
  const from = l.section;
  const rows = (linesBySection(p)[sec] || []).map(([i]) => i).filter(i => i !== id);
  let at = ref ? rows.indexOf(ref) : -1;
  at = at < 0 ? rows.length : at + (after ? 1 : 0);
  rows.splice(at, 0, id);
  l.section = sec;
  rows.forEach((i, n) => { p.items[i].pos = n; });
  touch(p);
  return from !== sec;
}
const drag = { pending: false, on: false };
function dragTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  if (drag.kind === "cat") {
    const t = el.closest("#tree [data-drop]"); if (!t) return null;
    if (t.matches("li[data-row]")) {  // over another item: land before or after it
      if (t.dataset.row === drag.id) return { el: t, self: true };
      const r = t.getBoundingClientRect();
      return { el: t, key: t.dataset.drop, ref: t.dataset.row, after: y > r.top + r.height / 2, brand: t.dataset.brand };
    }
    return { el: t, key: t.dataset.drop, brand: t.dataset.brand };
  }
  if (drag.kind === "cmfr") {
    const mh = el.closest("#tree .mfr-head[data-list]");
    if (mh) {
      if (mh.dataset.list === drag.id && mh.dataset.brand === drag.brand) return { el: mh, self: true };
      const r = mh.getBoundingClientRect();
      return { el: mh, list: mh.dataset.list, ref: mh.dataset.brand, after: y > r.top + r.height / 2 };
    }
    const gd = el.closest("#tree details.brand");
    if (gd) return gd.dataset.k === drag.id ? null : { el: gd.querySelector(":scope > summary"), list: gd.dataset.k, ref: null };
    const sd = el.closest("#tree details.sub");
    if (sd) return sd.dataset.k === drag.id ? null : { el: sd.querySelector(":scope > summary"), list: sd.dataset.k, ref: null };
    return null;
  }
  if (drag.kind === "cgrp") {
    const d = el.closest("#tree details.brand");
    if (d) {
      if (d.dataset.k === drag.id) return { el: d, self: true };
      const r = d.querySelector(":scope > summary").getBoundingClientRect();
      return { el: d, sub: d.closest("details.sub").dataset.k, ref: splitKey(d.dataset.k)[2], after: y > r.top + r.height / 2 };
    }
    const sd = el.closest("#tree details.sub");
    return sd ? { el: sd.querySelector(":scope > summary"), sub: sd.dataset.k, ref: null } : null;
  }
  if (drag.kind === "ccat") {
    const d = el.closest("#tree details.cat"); if (!d) return null;
    if (d.dataset.k === drag.id) return { el: d, self: true };
    const r = d.querySelector(":scope > summary").getBoundingClientRect();
    return { el: d, ref: d.dataset.k, after: y > r.top + r.height / 2 };
  }
  if (drag.kind === "csub") {
    const d = el.closest("#tree details.sub");
    if (d) {
      if (d.dataset.k === drag.id) return { el: d, self: true };
      const r = d.querySelector(":scope > summary").getBoundingClientRect();
      return { el: d, cat: d.closest("details.cat").dataset.k, ref: d.dataset.k, after: y > r.top + r.height / 2 };
    }
    const c = el.closest("#tree details.cat");
    return c ? { el: c.querySelector(":scope > summary"), cat: c.dataset.k, ref: null } : null;
  }
  const line = el.closest("[data-line]");
  if (line) {
    if (line.dataset.line === drag.id) return { el: line, self: true };
    const r = line.getBoundingClientRect();
    return { el: line, sec: line.closest("[data-sec]").dataset.sec, ref: line.dataset.line, after: y > r.top + r.height / 2 };
  }
  const sec = el.closest("[data-sec]");
  return sec ? { el: sec, sec: sec.dataset.sec, ref: null } : null;
}
/* where a drop would land, in words, for the label that follows the finger */
function dropLabel(t) {
  const p = cur(), h = p && houseById(p.houseId);
  if (!h) return "";
  if (drag.kind === "cat" && t.key) {
    const [c, s, g] = splitKey(t.key), sub = subOf(h, c, s);
    if (!sub) return "";
    if (sub.direct) return catOfSub(h, sub)?.name || "";
    return sub.name + (g && g !== NOFOLDER ? " › " + headLabel(h, sub.key + "/" + g, g) : "") + (t.brand ? " › " + t.brand : "");
  }
  if (drag.kind === "csub" && t.cat) return h.categories.find(c => c.id === t.cat)?.name || "";
  if (drag.kind === "cgrp" && t.sub) return subByKey(h, t.sub)?.name || "";
  if (drag.kind === "cmfr") {
    if (t.list === drag.id && t.ref) return (t.after ? "after " : "before ") + t.ref;
    const [c, sId, g] = splitKey(t.list || ""), sub = subOf(h, c, sId);
    return sub ? sub.name + (g ? " › " + headLabel(h, t.list, g) : "") : "";
  }
  if (drag.kind === "line" && t.sec) return secName(t.sec);
  return "";
}
function paintTarget(t) {
  document.querySelectorAll(".drop-on, .drop-before, .drop-after").forEach(n => n.classList.remove("drop-on", "drop-before", "drop-after"));
  if (t && !t.self) t.el.classList.add(t.ref ? (t.after ? "drop-after" : "drop-before") : "drop-on");
}
function moveDrag() {
  drag.ghost.style.transform = `translate(${Math.round(drag.x + 14)}px, ${Math.round(drag.y - 20)}px)`;
  const chip = drag.kind !== "line" ? document.elementFromPoint(drag.x, drag.y)?.closest(".chip[data-cat]") : null;
  if (chip) {
    paintTarget(null); drag.target = null;
    const name = chip.dataset.cat === "all" ? "all categories" : chip.textContent.replace(/\d+/g, "").trim();
    drag.ghost.textContent = drag.label0 + "  →  show " + name;
    if (drag.chip !== chip.dataset.cat) {
      clearTimeout(drag.ct); drag.chip = chip.dataset.cat;
      drag.ct = setTimeout(() => { if (drag.on && drag.chip === chip.dataset.cat) showCategoryWhileDragging(chip.dataset.cat); }, 450);
    }
    return;
  }
  clearTimeout(drag.ct); drag.chip = null;
  drag.target = dragTarget(drag.x, drag.y);
  paintTarget(drag.target);
  drag.ghost.textContent = drag.label0 + (drag.target && !drag.target.self ? "  →  " + dropLabel(drag.target) : "");
  // hovering a closed heading opens it, so an item can travel into a collapsed group
  const sum = drag.kind === "ccat" ? null : document.elementFromPoint(drag.x, drag.y)?.closest(drag.kind === "csub" ? "#tree details.cat > summary" : drag.kind === "cgrp" || drag.kind === "cmfr" ? "#tree details.cat > summary, #tree details.sub > summary" : "#tree summary");
  const d = sum && sum.parentElement;
  if (d && !d.open) {
    const moved = drag.hx === undefined || Math.hypot(drag.x - drag.hx, drag.y - drag.hy) > 24;
    if (drag.hover !== d || moved) {
      clearTimeout(drag.ht); drag.hover = d; drag.hx = drag.x; drag.hy = drag.y;
      drag.ht = setTimeout(() => { if (drag.on && drag.hover === d) { d.open = true; moveDrag(); } }, d.classList.contains("cat") ? 600 : 800);
    }
  } else { clearTimeout(drag.ht); drag.hover = null; drag.hx = undefined; }
}
function showCategoryWhileDragging(cat) {
  const p = cur(), h = p && houseById(p.houseId);
  if (!h || app.cat === cat) return;
  app.cat = cat;
  if (cat !== "all") app.open.add(cat);
  // keep the element the finger started on in the page, or a phone stops sending the drag and scrolls instead
  const tree = document.getElementById("tree");
  if (drag.origin && tree.contains(drag.origin)) {
    let hold = document.getElementById("dragHold");
    if (!hold) { hold = document.createElement("div"); hold.id = "dragHold"; hold.setAttribute("aria-hidden", "true"); hold.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden;"; document.body.appendChild(hold); }
    hold.appendChild(drag.origin);
  }
  tree.innerHTML = treeHtml(p, h);
  document.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.cat === cat)));
  const bar = document.querySelector(".bar");
  window.scrollTo(0, Math.max(0, tree.getBoundingClientRect().top + window.scrollY - (bar ? bar.getBoundingClientRect().height : 0) - 8));
  drag.row = document.querySelector(`[data-row="${CSS.escape(drag.id)}"]`) || drag.row;
}
function startDrag() {
  drag.on = true;
  const g = document.createElement("div");
  drag.label0 = drag.label || drag.row?.querySelector(".nm")?.textContent.trim() || "";
  g.className = "drag-ghost"; g.textContent = drag.label0;
  document.body.appendChild(g); drag.ghost = g;
  drag.row?.classList.add("dragging"); document.body.classList.add("is-dragging");
  const loop = () => {
    if (!drag.on) return;
    const bar = document.querySelector(".bar"), top = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
    const m = 72, H = window.innerHeight, y = drag.y;
    // nothing above the catalog takes a drop, so once its top is in view, stop scrolling up
    const tree = drag.kind !== "line" && document.getElementById("tree");
    const atTop = tree && tree.getBoundingClientRect().top >= top;
    const v = y < top ? 0 : y < top + m ? (atTop ? 0 : -Math.min(18, Math.ceil((top + m - y) / 5))) : y > H - m ? Math.min(18, Math.ceil((y - (H - m)) / 5)) : 0;
    if (v) { window.scrollBy(0, v); moveDrag(); }
    drag.raf = requestAnimationFrame(loop);
  };
  drag.raf = requestAnimationFrame(loop);
}
function endDrag(drop) {
  const { on, target: t, kind, id, brand: dragBrand } = drag;
  cancelAnimationFrame(drag.raf); clearTimeout(drag.ht); clearTimeout(drag.ct); drag.chip = null; drag.origin = null;
  document.getElementById("dragHold")?.remove();
  drag.ghost?.remove(); drag.row?.classList.remove("dragging"); document.body.classList.remove("is-dragging"); paintTarget(null);
  Object.assign(drag, { pending: false, on: false, ghost: null, target: null, hover: null, row: null });
  if (!on) {
    if (drop && kind === "cat" && cur()) catEditDialog(houseById(cur().houseId), id);
    return;
  }
  drag.until = Date.now() + 400; drag.ux = drag.x; drag.uy = drag.y;  // swallow the click that follows the drop, at the drop point
  const p = cur();
  if (!drop || !t || t.self || !p) return;
  if (kind === "cat") {
    const h = houseById(p.houseId);
    const before = ITEM.get(id)?.s;
    let moved = moveCatItem(h, id, t.key);
    if (t.ref) moved = reorderItem(h, id, t.ref, t.after) || moved;
    if (t.brand && t.brand !== ITEM.get(id)?.it.brand) moved = setItemBrand(h, id, t.brand) || moved;
    if (moved) {
      const e = ITEM.get(id), g = grpOf(e.it, e.s);
      app.open.add(e.c.id); app.open.add(e.s.key); app.open.add(e.s.key + "/" + g);
      rerenderKeepScroll();
      if (t.brand) toast(`Moved to ${t.brand}`);
      else if (before !== e.s || !t.ref) toast(e.s.direct ? `Moved to ${e.c.name}` : `Moved to ${e.s.name}${g ? " › " + headLabel(h, e.s.key + "/" + g, g) : ""}`);
    }
  } else if (kind === "cmfr") {
    const h = houseById(p.houseId);
    if (moveBrand(h, id, dragBrand, t.list, t.ref, t.after)) {
      const [c, sId, g] = splitKey(t.list), sub = subOf(h, c, sId);
      if (sub) { app.open.add(catOfSub(h, sub)?.id); app.open.add(sub.key); if (g) app.open.add(t.list); }
      rerenderKeepScroll();
      if (t.list !== id && sub) toast(`${dragBrand} moved to ${sub.name}${g ? " › " + headLabel(h, t.list, g) : ""}`);
    }
  } else if (kind === "cgrp") {
    const h = houseById(p.houseId);
    if (moveGroup(h, id, t.sub, t.ref, t.after)) {
      const to = subByKey(h, t.sub);
      app.open.add(t.sub); if (to) app.open.add(catOfSub(h, to).id);
      rerenderKeepScroll();
      if (splitKey(id)[0] + "/" + splitKey(id)[1] !== t.sub && to) toast(`Moved to ${to.name}`);
    }
  } else if (kind === "ccat") {
    if (moveCat(houseById(p.houseId), id, t.ref, t.after)) rerenderKeepScroll();
  } else if (kind === "csub") {
    const h = houseById(p.houseId);
    if (moveSub(h, id, t.cat, t.ref, t.after)) { app.open.add(t.cat); rerenderKeepScroll(); toast(`Moved to ${h.categories.find(c => c.id === t.cat)?.name || ""}`); }
  } else {
    const moved = moveLine(p, id, t.sec, t.ref, t.after);
    rerenderKeepScroll();
    if (moved) toast(`Moved to ${secName(t.sec)}`);
  }
}
const press = { t: 0 };
function cancelPress() { clearTimeout(press.t); press.t = 0; }
document.addEventListener("pointerdown", e => {
  const row = !e.target.closest("[data-drag], button:not(.nm-btn), a, input, select, textarea, summary") && e.target.closest("#tree li.item[data-row]");
  if (row && e.button <= 0) {
    cancelPress();
    Object.assign(press, { x: e.clientX, y: e.clientY, row });
    press.t = setTimeout(() => {
      press.t = 0;
      if (!row.isConnected) return;
      press.fired = Date.now();  // the click that ends this press must not open the note
      if (!row.classList.contains("edit")) { toast("To move items, tap ✎ Edit catalog first"); return; }
      Object.assign(drag, { kind: "cat", id: row.dataset.row, brand: undefined, label: "", row, origin: row, x0: press.x, y0: press.y, x: press.x, y: press.y, pending: true, on: false, target: null });
      startDrag(); moveDrag();
      if (navigator.vibrate) try { navigator.vibrate(15); } catch (err) {}
    }, 420);
  }
  const hd = e.target.closest("[data-drag]");
  if (!hd || e.button > 0) return;
  e.preventDefault();
  const k = hd.dataset.drag;
  Object.assign(drag, { kind: k, id: hd.dataset.id, brand: hd.dataset.b, label: hd.dataset.label || "", origin: hd.closest("li, details") || hd, row: ["ccat", "csub", "cgrp"].includes(k) ? hd.closest("details") : hd.closest("li"), x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, pending: true, on: false, target: null });
  try { hd.setPointerCapture(e.pointerId); } catch (err) {}
});
document.addEventListener("pointermove", e => {
  if (press.t && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) cancelPress();  // it's a scroll, not a long press
  if (!drag.pending) return;
  drag.x = e.clientX; drag.y = e.clientY;
  if (!drag.on) { if (Math.hypot(drag.x - drag.x0, drag.y - drag.y0) < 6) return; startDrag(); }
  e.preventDefault();
  moveDrag();
}, { passive: false });
document.addEventListener("pointerup", () => { cancelPress(); if (drag.pending) endDrag(true); });
// once a long-press drag is on, the finger moves the item, not the page
document.addEventListener("touchmove", e => { if (drag.on) e.preventDefault(); }, { passive: false });
document.addEventListener("contextmenu", e => { if (drag.on || (press.t && e.target.closest && e.target.closest("#tree li.item"))) e.preventDefault(); });
document.addEventListener("click", e => { if (e.target.closest && e.target.closest("summary [data-drag]")) e.preventDefault(); }, true);
document.addEventListener("pointercancel", () => { cancelPress(); if (drag.pending) endDrag(false); });
document.addEventListener("click", e => { if (press.fired && Date.now() - press.fired < 1500) { press.fired = 0; e.stopPropagation(); e.preventDefault(); } }, true);
document.addEventListener("click", e => { if (drag.until && Date.now() < drag.until && Math.hypot(e.clientX - drag.ux, e.clientY - drag.uy) < 16) { e.stopPropagation(); e.preventDefault(); } }, true);
document.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches('span[role="button"][data-act]')) { e.preventDefault(); e.target.click(); }
});
/* keyboard: arrow keys on a category's or subcategory's handle move it */
document.addEventListener("keydown", e => {
  const hd = e.target.closest && e.target.closest('[data-drag="ccat"], [data-drag="csub"], [data-drag="cgrp"], [data-drag="cmfr"]');
  if (!hd || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
  e.preventDefault();
  const p = cur(), h = p && houseById(p.houseId), id = hd.dataset.id, up = e.key === "ArrowUp";
  if (!h) return;
  if (hd.dataset.drag === "cmfr") {
    const names = brandsIn(h, id), i = names.indexOf(hd.dataset.b);
    if (up && i > 0) moveBrand(h, id, hd.dataset.b, id, names[i - 1], false); else if (!up && i < names.length - 1) moveBrand(h, id, hd.dataset.b, id, names[i + 1], true); else return;
    rerenderKeepScroll();
    document.querySelector(`[data-drag="cmfr"][data-id="${CSS.escape(id)}"][data-b="${CSS.escape(hd.dataset.b)}"]`)?.focus();
    return;
  } else if (hd.dataset.drag === "cgrp") {
    const [c, sId, g] = splitKey(id), sub = subOf(h, c, sId); if (!sub) return;
    const gs = subGroupNames(h, sub), i = gs.indexOf(g);
    if (up && i > 0) moveGroup(h, id, sub.key, gs[i - 1], false); else if (!up && i < gs.length - 1) moveGroup(h, id, sub.key, gs[i + 1], true); else return;
  } else if (hd.dataset.drag === "ccat") {
    const ids = h.categories.map(c => c.id), i = ids.indexOf(id);
    if (up && i > 0) moveCat(h, id, ids[i - 1], false); else if (!up && i < ids.length - 1) moveCat(h, id, ids[i + 1], true); else return;
  } else {
    const sub = subByKey(h, id), c = sub && catOfSub(h, sub); if (!c) return;
    const keys = c.subcategories.map(x => x.key), i = keys.indexOf(id), ci = h.categories.indexOf(c);
    if (up && i > 0) moveSub(h, id, c.id, keys[i - 1], false);
    else if (!up && i < keys.length - 1) moveSub(h, id, c.id, keys[i + 1], true);
    else if (up && ci > 0) { const pc = h.categories[ci - 1]; moveSub(h, id, pc.id, null); app.open.add(pc.id); }
    else if (!up && ci < h.categories.length - 1) { const nc = h.categories[ci + 1]; moveSub(h, id, nc.id, nc.subcategories[0]?.key || null, false); app.open.add(nc.id); }
    else return;
  }
  rerenderKeepScroll();
  document.querySelector(`[data-drag="${hd.dataset.drag}"][data-id="${CSS.escape(id)}"]`)?.focus();
});
/* keyboard: arrow keys on a line's handle move it up or down, across sections at the ends */
document.addEventListener("keydown", e => {
  const hd = e.target.closest && e.target.closest('[data-drag="line"]');
  if (!hd || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
  e.preventDefault();
  const p = cur(), id = hd.dataset.id, l = p && p.items[id];
  if (!l) return;
  const by = linesBySection(p), ids = by[l.section].map(([i]) => i), i = ids.indexOf(id), up = e.key === "ArrowUp";
  const AS = allSections(), si = AS.findIndex(s => s.id === l.section);
  if (up && i > 0) moveLine(p, id, l.section, ids[i - 1], false);
  else if (!up && i < ids.length - 1) moveLine(p, id, l.section, ids[i + 1], true);
  else if (up && si > 0) moveLine(p, id, AS[si - 1].id, null);
  else if (!up && si < AS.length - 1) { const nx = AS[si + 1].id, first = by[nx][0]; moveLine(p, id, nx, first ? first[0] : null, false); }
  else return;
  rerenderKeepScroll();
  document.querySelector(`[data-drag="line"][data-id="${CSS.escape(id)}"]`)?.focus();
});

/* ---------- start ---------- */
app.productions = lsGet(LS_KEY, []);
if (!Array.isArray(app.productions)) app.productions = [];
{
  const s = lsGet(LS_SET, null);
  if (s && typeof s === "object") app.settings = { favorites: {}, rules: [], ...s };
  else Object.assign(app.settings, { catalog: clone(STARTER.catalog), closedBrands: clone(STARTER.closedBrands), catColors: clone(STARTER.catColors) });  // first open: the starting catalog
  if (!app.settings.mediaSeeded) { app.settings.mediaSeeded = true; lsPut(LS_SET, app.settings); }
  applyCatalog();
  const ui = lsGet(LS_UI, {}), recent = ui.at && Date.now() - ui.at < RESUME_MS;
  if (recent && ui.view === "production" && app.productions.some(p => p.id === ui.pid)) { app.view = "production"; app.pid = ui.pid; app.tab = ["add", "fav", "list", "media"].includes(ui.tab) ? ui.tab : "add"; }
  else if (needsWelcome()) app.view = "welcome";
  sendAppBack(false);
}
/* back from a Send the helper app didn't pick up (Chrome opens #send-app instead): it isn't installed here, so Settings shows where to get it */
function sendAppBack(draw) {
  if (typeof location === "undefined" || location.hash !== "#send-app") return;
  setHelper(false); app.helperMissing = true; closeModal(); app.setFrom = app.view === "production" ? app.pid : null; app.view = "settings";
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  if (draw) render();
  setTimeout(() => document.getElementById("sendAppGroup")?.scrollIntoView({ block: "center" }), 150);
}
if (typeof window !== "undefined" && window.addEventListener) window.addEventListener("hashchange", () => sendAppBack(true));
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") uiSave(); });
render();
initAccount();
