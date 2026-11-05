import json, csv, re

HOUSE = {
    "id": "fitussi",
    "name": "Fitussi Camera Services",
    "website": "https://fitussi.co.il/",
    "scraped_at": "2026-11-01",
}

# (category_id, category_name, [(sub_id, sub_name, [items])])
# Items: plain string, or (display_name, site_name) where the site spelling differs.
CATALOG = [
    ("camera", "מצלמות", [
        ("cinema", "Cinema Camera", [
            "ARRI ALEXA 35", "ARRI ALEXA MINI LF", "ARRI ALEXA MINI",
            "Sony VENICE 6K", "Sony Rialto Camera Extension System for Sony VENICE",
            "SONY PXW-FX9", "SONY PXW FX6", "SONY FX3", "DJI Ronin 4D",
        ]),
        ("hd_eng", "HD/ENG", [
            "SONY PXW-X70", "PANASONIC TM900",
            "GoPro HERO10 Black", "GoPro Hero black 7", "GoPro Hero black 5",
        ]),
    ]),
    ("lenses", "עדשות", [
        ("pl", "PL Mount", [
            "Leitz Summilux C Set", "ARRI SIGNATURE PRIME SET", "COOKE S4i PRIME LENSES",
            "ULTRA PRIME SET", "ZEISS High Speed MKIII + S.S TLS", "Atlas Orion ANAMORPHIC 7 lens set",
            "Sigma FF High-Speed Prime T1.5 SET", "NiSi ATHENA PRIME T2.4/1.9 FF 8 Lens Set PL",
            "ZEISS STANDARD SPEED SET", "ZEISS Super16 ArriFlex Set T1.3", "Cooke S4 14mm T2",
            "Angenieux 22-60 mm Full-Frame PL", "Angenieux 45-135 mm Full-Frame PL",
            "ARRI ALURA ZOOM 15.5-45/T2.8", "ARRI ALURA ZOOM 30-80/T2.8", "ARRI ALURA 45-250MM T2.6",
            "Angenieux 15-40mm Super35 PL", "Angenieux 30-90mm Super35", "FUJINON ZK19-90MM T2.9 CABRIO",
            "Laowa Ranger FF 3 Lens Kit 16-30mm/28-75mm/75-180mm/T2.9",
            "Canon 10.6-180mm T2.7 Super 16 Zoom PL Mount", "P+S TECHNIK SKATER Scope",
            "DZOFilm 18-28mm T8 FF Probe Zoom Macro Lens | 0° Direct View PL",
            "LAOWA 24mm T14-40 FF 2x PeriProbe PL", "LAOWA Pro2be 24mm T8 Probe Direct View PL",
            "Laowa 12mm T2.9 Zero-D Cine PL Mount", "TOKINA CINEMA AT-X 100MM T2.9 MACRO LENS",
            "ZEISS STANDARD SPEED 100MM T2.1", "ZEISS STANDARD SPEED 135MM T2.1",
            "ZEISS STANDARD SPEED 180MM T3", "TOKINA CINEMA 11-20MM T/2.9",
        ]),
        ("e_ef", "E/EF Mount", [
            "Cooke SP3 FF 6 Lens Set",
            "Sony FE 14mm f/1.8 GM", "Sony FE 20mm f/1.8 G", "Sony FE 24mm f/1.4 GM",
            "Sony FE 35mm f/1.4 GM", "Sony 50mm F/1.2 GM", "Sony FE 85mm f/1.4 GM",
            "Sony FE 90mm f/2.8 Macro G", "SONY FE 16-35MM F/2.8", "Sony FE 24-70mm f/2.8 GM",
            "SONY E 70-200MM F/2.8 GM OSS", "Sony FE 24-105mm f/4 G OSS Lens",
            "CANON ZOOM 24-70MM II F/2.8L", "CANON ZOOM 16-35MM F/2.8L", "CANON ZOOM LENS EF24-105MM F/4L",
        ]),
        ("b4", "2/3 Mount", [
            "FUJINON XA16X8AXB8", "CANON J11EX4.5B4", "FUJINON A10X4.8BERM-28",
            "FUJINON A17X7.8BERM-M28C", "FUJINON A18X7.6BERM", "FUJINON A22X7.8BERM-G28",
        ]),
        ("adapters", "מתאמי עדשות", [
            "METABONES PL TO SONY E MOUNT", "Canon EF Lens to Sony NEX Speed Booster ULTRA",
            "Canon EF Lens to Sony NEX Smart Adapter",
            "Canon EF Lens to Micro Four Thirds T Speed Booster ULTRA 0.71x",
        ]),
    ]),
    ("camera_accessories", "אביזרים למצלמה", [
        ("tripods", "חצובות וראשים", [
            "Ronford Atlas 50", "RONFORD BAKER FLUID-7", "CARTONI MASTER MK2", "CARTONI MASTER 25",
            "CARTONI C 20 DUTCH HEAD", "SACHTLER 20P", "SACHTLER 18P", "SACHTLER 15", "SACHTLER 8",
            "SACHTLER ACE",
        ]),
        ("monitors", "מוניטורים", [
            "SmallHD Cine 13 UHD 4K High-Bright", "SmallHD CINE 5", "SmallHD 703 UltraBright Directors Kit",
            "SmallHD 703 UltraBright", "SmallHD 702 Touch", 'SmallHD 7" Cine', "Blackmagic video assist 7",
            'Sony 18.4" Full HD Monitor', 'SONY LMD-A240 24"', 'SONY LMD-A170 17"',
            'Atomos Sumo 19" HDR/High Brightness', "ATOMOS SHOGUN Flame 7", "ATOMOS SHOGUN 7 HDR Pro",
            'PANASONIC BT-LH1710 17"', 'PANASONIC HDBT-LH910G 9"',
            'HOLLYLAND Cosmo M7 7" monitor with built-in receiver', "PIX 240i",
            'PORTKEYS BM7 7" Super Bright', 'PORTKEYS BM5 5.2"', 'BON 5.5" 3G-SDI FULL HD',
            "ASTRO WM-3014", "Wooden Camera Director's Monitor Cage",
        ]),
        ("mattebox_filters", "מט בוקס ופילטרים", [
            "ARRI MATTE BOX MB-18", "ARRI LIGHTWEIGHT MATTE BOX LMB 4X5", "ARRI Lightweight Matte Boxes LMB-25",
            "Chewa Clip-On 6.6x6.6 Matte Box", "SmallRig Lightweight Carbon Fiber Matte Box",
            "CHROSZIEL SWING AWAY MATTEBOX", "CHROSZIEL CLIP ON MATTEBOX", "CHROSZIEL MATTEBOX 4X5.6",
            "CHROSZIEL MATTEBOX 4X4", "TILTA mirage VND kit",
            'Clear 4X5.65" Filter', 'NDF 4X5.65" Filter', 'NDF IR 4X5.65" Filter',
            'NDG H.Edge 4X5.65" Filter', 'NDG S.Edge 4X5.65" Filter', 'Pola 4X5.65" Filter',
            'Rota Pola 4X5.65"', 'Soft FX 4X5.65" Filter', 'Black Pro Mist 4X5.65" Filter',
            'White Pro Mist 4X5.65" Filter', "Circular Pola 138mm Filter",
            "Proxar 138mm (Close-up) Filters Set", "Schneider 138mm Diopter SPLIT Gen2 Set",
        ]),
        ("follow_focus", "פולו פוקוס ובקרת עדשות", [
            "ARRI WCU-4", "ARRI Hi-5 Hand Unit", "ARRI SXU-1 Single Axis Unit",
            "ARRI OPERATOR CONTROL UNIT OCU-1", "ARRI CFORCE", "ARRI CFORCE mini", "ARRI CFORCE MINI RF",
            "ARRI cmotion steady zoom (Black Edition)", "cmotion pan-bar zoom", "ARRI FF-4",
            "CHROSZIEL DOUBLE SIDE FOLLOW FOCUS", "CHROSZIEL ONE SIDE FOLLOW FOCUS",
            "DJI Focus Pro", "RT Motion LENS CONTROL SYSTEM", "NUCLEUS-M", "Nucleus-Nano",
            "NUCLEUS-M MICROFORCE ZOOM CONTROL",
        ]),
        ("wireless_video", "וידאו אלחוטי", [
            "TERADEK Bolt 4K LT 750", "TERADEK Serv Pro",
            "SmallHD 702 Directors Kit + Bolt 750", "SmallHD 703 UltraBright Directors Kit + Bolt 750",
            "HOLLYLAND COSMO 400 Wireless Transmission System", "HOLLYLAND COSMO 600 WIRELESS",
            "HOLLYLAND COSMO 1000 Wireless Video Set", "HOLLYLAND COSMO 1500 Wireless Video Set",
        ]),
        ("video_distribution", "ממירים, מפצלים וכבלי וידאו", [
            "DECIMATOR MD-QUAD", "HS-2200 6 INPUT HD BROADCAST QUALITY MOBILE", "SPLIT SDI SIGNAL",
            "SPLIT SIGNAL HD/SDI", "BNC DRUM 50M", "HD/SDI DRUM CABLE", "MULTI CAM BNC DRUM",
        ]),
        ("rigs_stabilizers", "מכתופים ומייצבים", [
            "ARRI Vertical Adapter Set For Alexa Mini LF / Mini", "Tilta Lightweight Shoulder Rig",
            "RED ROCK FIELD CINEMA STANDARD DSLR RIG V2", "ARRI S-4", "Cinesaddle",
            "Easyrig Vario 5 with STABIL", "Easyrig 3 SERENE", "EASY RIG 2.5", "EASYRIG MINIMAX",
            "EASYRIG MINI", "READY RIG", "MANTIS-I, HAND HELD KIT",
            "DJI RONIN 2", "DJI RS 3 Pro", "DJI RS 2 Combo", "DJI RONIN-S",
            "STEADICAM FLYER", "STEADICAM ABC",
        ]),
        ("media_other", "מדיה ואחר", [
            "Codex compact drive 960GB", "ProGrade 160GB CFexpress Type A", "CFast Card", "XQD Card",
            "SXS CARD", "P2 EXPRESS CARD 512G,256G", "SD Memory Card", "v90 SD Memory Card",
            "Samsung 1TB T5 SSD", "Butt-Dolly",
            ("HOLLYLAND Solidcom 8-User Wireless Intercom System", "מערכת אינטרקום 8 משתמשים עם מרכזיה אלחוטית HOLLYLAND Solidcom"),
        ]),
    ]),
    ("sound", "סאונד", [
        ("recorders_mixers", "מקליטים ומיקסרים", [
            "SOUND DEVICES 633", "SOUND DEVICES 664", "SOUND DEVICES 788T",
            "442 SOUND DEVICES MIXER", "552 SOUND DEVICES MIXER", "BEHRINGER XENYX 2442FX",
            ("SOUNDCRAFT EFX12", "SUNDCRAFT EFX12"),
        ]),
        ("wireless_audio", "אלחוטי", [
            "LECTROSONICS 195", "LECTROSONICS 210", "LECTROSONICS 211 DIGITAL",
            "LECTROSONICS 411 DIGITAL", "LECTROSONICS SMQV",
            "SENNHEISER G2 WIRELESS", "SENNHEISER G3 WIRELESS", "SENNHEISER EZT SYSTEM",
            "SENNHEISER IFB 300 G2/G3", "SENNHEISER SKP 100", "SENNHEISER SKP 2000",
            "SONY WRR-855A", "PROTECH WT 480 SYSTEM",
        ]),
        ("mics_boom", "מיקרופונים ובום", [
            "SENNHEISER MKH 416", "SENNHEISER MKH 60", "SENNHEISER MKH-66", "SENNHEISER E835",
            "SENNHEISER MZH TABLE SYSTEM", "SANKEN COS-11S", "SONY ECM-77B", "RODE NT4", "VIDEOMIC RODE",
            "PZM AUDIO-TECHNICA",
            ("SHURE BETA-58A", "SUHRE BETA-58A"), ("SHURE SM-57", "SUHRE SM-57"),
            ("SHURE SM-58", "SUHRE SM-58"), ("SHURE SM-7", "SUHRE SM-7"),
            "K-TEK BOOM 5.80M", "K-TEK BOOM 6M", "K-TEK BOOM 7M",
        ]),
        ("audio_accessories", "אביזרי סאונד", [
            "TENTACLE SYNC TIMECODE GENERATOR", "DCODE TS-3", "SOUND DEVICES MM-1", "SOUND DEVICES MP-1",
            "SOUND DEVICES HX-3", "AKG MPA III L", "SENNHEISER MZFS 80", "SENNHEISER MZH 3042",
            "12 WAY XLR MULTICORE/STAGEBOX", "FOSTEX SPA11", "SAMSON AURO D412", "SOUNDKING FP215A-1",
            "POWER TEC SPK-200 INTERCOM SYSTEM + BELT PACKS", "SOUND BLANKET",
        ]),
    ]),
    ("logistics", "לוגיסטיקה", [
        ("generators", "גנרטורים", ["6.5KW HONDA GENERATOR", "3KW HONDA GENERATOR"]),
        ("camp", "מחנה", [
            "כסא במאי", "כיסא הפקה", "שולחן הפקה מתקפל", "גזיבו", "שמשיה", "רשת צל", "פרגוד", "מחצלת",
            "מאוורר תעשייתי", "תנור", "מיחם", "תרמוקן", "צידנית", "מגש כוסות", "מגהץ", "קרש גיהוץ",
            "מראת איפור", "מראת הלבשה", "סטנד הלבשה", "מתקן שטיפת ידיים", "מתקן לניגוב ידיים",
            "ערכת עזרה ראשונה", "פח אשפה", "מטאטא כביש", "פנס מחנה", "גרילנדה", "מגפון", "קונוס",
            "מעבר כבל כביש",
        ]),
    ]),
]



import json as _json, os as _os
_SKU_FILE = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "utopia_skus.json")
SKUS = _json.load(open(_SKU_FILE)) if _os.path.exists(_SKU_FILE) else {}
_LINK_FILE = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "item_links.json")
LINKS = _json.load(open(_LINK_FILE, encoding="utf-8")) if _os.path.exists(_LINK_FILE) else {}
_STOPS_FILE = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "set_stops.json")
SET_STOPS = _json.load(open(_STOPS_FILE, encoding="utf-8")) if _os.path.exists(_STOPS_FILE) else {}  # lens sets: stop of each lens

def slug(s):
    s = s.lower()
    s = re.sub(r"[^\w֐-׿]+", "-", s)
    return s.strip("-")


import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from brands import brand_of
from meta import (title_case, filter_sub, filter_group, filter_sort_key, FILTER_SUBS, FILTER_GROUP_BY, SIZE_ORDER, FILTER_WORDS,
                  is_txrx, camera_meta, lens_meta, MEDIA_SUBS, MEDIA_ORDER, media_kind, media_group, FF_ORDER, ff_group, POWER_ORDER, power_group,
                  FUNC_GROUPS, func_group)

EXCLUDE = {"sound", "logistics"}  # user asked for camera dept only: no lighting, grip, sound, logistics

# App UI is English: category and subcategory display names
EN = {
    "מצלמות": "Cameras", "עדשות": "Lenses", "אביזרים למצלמה": "Camera Accessories",
    # Fitussi
    "מתאמי עדשות": "Lens Adapters", "חצובות וראשים": "Tripods & Heads", "מוניטורים": "Monitors",
    "מט בוקס ופילטרים": "Matte Boxes", "פולו פוקוס ובקרת עדשות": "Follow Focus & Lens Control",
    "וידאו אלחוטי": "Wireless Video", "אינטרקום": "Intercoms", "ממירים, מפצלים וכבלי וידאו": "Converters, Splitters & Video Cables",
    "מכתופים ומייצבים": "Rigs & Stabilizers", "מדיה ואחר": "Media & Other",
    # Utopia cameras
    "פילם": "Film", "קומפקטיות": "Compact Camcorders", "PTZ / רובוטיות": "PTZ / Robotic",
    "אקשן / 360 / תלת־ממד": "Action / 360 / 3D", "מיני ומוסתרות": "Mini & Hidden",
    # Utopia lenses
    "סטים - פריים קולנוע": "Cine Prime Sets", "פריים קולנוע בודדות": "Cine Primes", "זום קולנוע": "Cine Zooms",
    "אנמורפיות": "Anamorphic", "פרוב, מאקרו ומיוחדות": "Probe, Macro & Specialty",
    "E Mount (סטילס)": "E Mount (Stills)", "EF Mount (סטילס)": "EF Mount (Stills)", "MFT (סטילס)": "MFT (Stills)",
    "L / G / DL Mount (סטילס)": "L / G / DL Mount (Stills)", "2/3 B4 (ברודקאסט)": '2/3" B4 (Broadcast)',
    "מתאמים ואקסטנדרים": "Adapters & Extenders",
    # Utopia accessories
    "חצובות, ראשים ופדסטלים": "Tripods, Heads & Pedestals", "מוניטורים ו־EVF": "Monitors & EVFs",
    "מט בוקס": "Matte Boxes", "פילטרים": "Filters", "ממירים, מתגים והפצת וידאו": "Converters, Switchers & Distribution",
    "מתקני רכב ומגנטים": "Car Mounts & Magnets", "סוללות, מטענים וחשמל": "Batteries, Chargers & Power",
    "מדיה, מקליטים וקוראי כרטיסים": "Media, Recorders & Card Readers", "תת־ימי": "Underwater",
    "אביזרים כלליים": "General Accessories",
}


# Equipment-list sections, taken from the user's own Word list layout
SECTIONS = [
    ("camera", "Camera", "L"), ("lens", "Lens", "L"), ("support", "Support", "L"),
    ("display", "Display", "L"), ("filters", "Filters", "L"),
    ("media", "Media", "R"), ("accessories", "Camera Accessories", "R"), ("power", "Power", "R"),
    ("grip", "Grip", "R"), ("aks", "AKS", "R"),
]
SUB_SECTION = {
    "camera": "camera", "lenses": "lens",
    "tripods": "support", "rigs_stabilizers": "support", "car_mounts": "support",
    "monitors": "display", "wireless_video": "display", "intercoms": "accessories", "video_distribution": "display",
    "filters": "filters", "mattebox": "accessories", "mattebox_filters": "accessories", "follow_focus": "accessories",
    "underwater": "accessories", "general": "accessories",
    "power": "power", "media_recorders": "media", "media_other": "media",
    "media": "media", "card_readers": "media", "recorders": "media", "other": "accessories",
}


def section_of(cat_id, sub_id, name):
    if cat_id in ("camera", "lenses", "filters"):
        return {"camera": "camera", "lenses": "lens", "filters": "filters"}[cat_id]
    if re.match(r"(APPLE|DELL)\b", name):
        return "media"
    if re.search(r"Magliner|Camera Cart", name):
        return "aks"
    if name.startswith("Butt-Dolly"):
        return "support"
    if name.startswith("HOLLYLAND Solidcom"):
        return "accessories"
    return SUB_SECTION[sub_id]


def regroup_filters(catalog):
    """Pull every filter out of its original subcategory into a Filters category with the user's subcategories."""
    buckets = {k: [] for k, _ in FILTER_SUBS}
    out = []
    for cat_id, cat_name, subs in catalog:
        new_subs = []
        for sub_id, sub_name, items in subs:
            keep = []
            for it in items:
                nm = it[0] if isinstance(it, tuple) else it
                if sub_id == "filters" or (sub_id == "mattebox_filters" and FILTER_WORDS.search(nm)):
                    buckets[filter_sub(nm)].append(it)
                else:
                    keep.append(it)
            new_subs.append((sub_id, sub_name, keep))
        out.append((cat_id, cat_name, new_subs))
        if cat_id == "camera_accessories":
            out.append(("filters", "Filters", [(k, n, buckets[k]) for k, n in FILTER_SUBS]))
    return out


def regroup_media(catalog):
    """Split the media subcategories into Media / Card Readers / Recorders & Decks / Other."""
    out = []
    for cat_id, cat_name, subs in catalog:
        new_subs = []
        for sub_id, sub_name, items in subs:
            if sub_id not in ("media_recorders", "media_other"):
                new_subs.append((sub_id, sub_name, items))
                continue
            buckets = {k: [] for k, _ in MEDIA_SUBS}
            for it in items:
                nm = it[0] if isinstance(it, tuple) else it
                buckets[media_kind(nm)].append(it)
            new_subs += [(k, n, buckets[k]) for k, n in MEDIA_SUBS]
        out.append((cat_id, cat_name, new_subs))
    return out


def en(name):
    out = EN.get(name, name)
    # English names already (Filters category from meta.FILTER_SUBS)
    assert not re.search(r"[֐-׿]", out), f"untranslated: {name}"
    return out


# items the rental house rents in two versions: listed twice, one per version, so the list says which one.
# The first version keeps the item's id (lists that already have it keep it); the second gets its own.
def _ez(n, s35, s35_stop, ff, ff_stop):
    return [{"name": f"Angenieux EZ-{n} {s35} {s35_stop} Super35 PL/E/EF Mount", "lens": {"focals": s35.replace("-", "\u2013"), "stop": s35_stop, "coverage": "S35"}},
            {"id": "-ff", "name": f"Angenieux EZ-{n} {ff} {ff_stop} Full-Frame PL/E/EF Mount", "lens": {"focals": ff.replace("-", "\u2013"), "stop": ff_stop, "coverage": "FF"}}]
VARIANTS = {
    "utopia:angenieux-ez-1-30-90mm-t2-super35-45-135mm-t3-full-frame-pl-e-ef-mount": _ez(1, "30-90mm", "T2", "45-135mm", "T3"),
    "utopia:angenieux-ez-2-15-40mm-t2-super35-22-60mm-t3-full-frame-pl-e-ef-mount": _ez(2, "15-40mm", "T2", "22-60mm", "T3"),
    "utopia:angenieux-ez-3-45-165mm-t2-3-super35-68-250mm-t3-5-full-frame-pl-e-ef-mount": _ez(3, "45-165mm", "T2.3", "68-250mm", "T3.5"),
    "utopia:cartoni-focus-22-fluid-head-150-100mm": [{"name": "Cartoni Focus 22 Fluid Head 100mm"}, {"id": "-150mm", "name": "Cartoni Focus 22 Fluid Head 150mm"}],
}
def with_variants(item):
    vs = VARIANTS.get(item["id"])
    if not vs:
        return [item]
    out = []
    for v in vs:
        x = json.loads(json.dumps(item))
        x["id"] = item["id"] + v.get("id", "")
        x["name"] = v["name"]
        x.setdefault("site_name", item["name"])
        if "lens" in v:
            x["lens"] = {**{k: val for k, val in (x.get("lens") or {}).items() if k != "note"}, **v["lens"]}
        out.append(x)
    return out


def build(houses):
    data = {"app": "AC Cam List", "schema_version": 4,
            "sections": [{"id": i, "name": n, "column": c} for i, n, c in SECTIONS],
            "rental_houses": []}
    rows = []
    for house, catalog in houses:
        h = {**{k: v for k, v in house.items() if k != "manual"}, "categories": []}
        seen = set()
        for cat_id, cat_name, subs in catalog:
            if cat_id in EXCLUDE:
                continue
            cat_name = en(cat_name)
            cat = {"id": cat_id, "name": cat_name, "subcategories": []}
            for sub_id, sub_name, items in subs:
                if not items:
                    continue
                sub_name = en(sub_name)
                sub = {"id": sub_id, "name": sub_name, "items": []}
                names = []
                for it in items:
                    name, site_name = (it if isinstance(it, tuple) else (it, it))
                    iid = f"{house['id']}:{slug(name)}"
                    if iid in seen:  # site cross-lists items; keep the first placement
                        print(f"  dup skipped [{house['id']}]: {name}")
                        continue
                    seen.add(iid)
                    display = title_case(name)
                    item = {"id": iid, "name": display, "brand": brand_of(name), "section": section_of(cat_id, sub_id, name)}
                    if site_name != display:
                        item["site_name"] = site_name
                    lm = lens_meta(house["id"], cat_id, sub_id, name)
                    if lm:
                        item["lens"] = lm
                        if lm.get("sku"):
                            item["sku"] = lm.pop("sku")
                        if SET_STOPS.get(iid):
                            lm["stops"] = SET_STOPS[iid]
                    if LINKS.get(iid):  # product page on the rental house's site
                        item["url"] = LINKS[iid]
                    if SKUS.get(iid):  # SKU from the rental house's store
                        item["sku"] = SKUS[iid]
                    cm = camera_meta(cat_id, sub_id, name)
                    if cm:
                        item["camera"] = cm
                    if name in house.get("manual", []):
                        item["manual"] = True
                    if is_txrx(sub_id, name):
                        item["txrx"] = True
                    for x in with_variants(item):
                        sub["items"].append(x)
                        names.append(name)
                    rows.append([house["name"], cat_name, sub_name, item["brand"], display, dict((a, b) for a, b, _ in SECTIONS)[item["section"]], item.get("sku", ""), (item.get("lens") or {}).get("coverage", "") or (item.get("camera") or {}).get("sensor", ""), (item.get("lens") or {}).get("focals", ""), (item.get("lens") or {}).get("stop", ""), item.get("site_name", ""), item.get("url", "")])
                # third level: filters by size or type, cards and readers by card type, the rest by brand
                if cat_id == "filters":
                    for item, nm in zip(sub["items"], names):
                        item["group"] = filter_group(sub_id, nm)
                    order = {id(i): filter_sort_key(sub_id, nm) for i, nm in zip(sub["items"], names)}
                    sub["items"].sort(key=lambda i: order[id(i)])
                    sub["groupBy"] = FILTER_GROUP_BY.get(sub_id, "type")
                    present = {i["group"] for i in sub["items"]}
                    sub["groups"] = [g for g in SIZE_ORDER if g in present] if sub["groupBy"] == "size" else sorted(present)
                elif sub_id in ("media", "card_readers"):
                    for item, nm in zip(sub["items"], names):
                        item["group"] = media_group(nm)
                    sub["groupBy"] = "type"
                    present = {i["group"] for i in sub["items"]}
                    sub["groups"] = [g for g in MEDIA_ORDER if g in present] + sorted(present - set(MEDIA_ORDER))
                elif sub_id == "follow_focus":
                    for item, nm in zip(sub["items"], names):
                        item["group"] = ff_group(nm)
                    sub["groupBy"] = "type"
                    present = {i["group"] for i in sub["items"]}
                    sub["groups"] = [g for g in FF_ORDER if g in present]
                    sub["brandSplit"] = ["Wireless Follow Focus"]  # inside this group, list items under their manufacturer
                elif sub_id == "power":
                    for item, nm in zip(sub["items"], names):
                        item["group"] = power_group(nm)
                    sub["groupBy"] = "type"
                    present = {i["group"] for i in sub["items"]}
                    sub["groups"] = [g for g in POWER_ORDER if g in present]
                    sub["brandSplit"] = list(sub["groups"])  # each type is divided by manufacturer
                elif cat_id == "camera_accessories" and sub_id in FUNC_GROUPS:  # by what it's for: Laptops & Tablets, Gimbals, Fluid Heads...
                    for item, nm in zip(sub["items"], names):
                        item["group"] = func_group(sub_id, nm)
                    present = {i["group"] for i in sub["items"]}
                    if len(present) > 1:
                        sub["groupBy"] = "type"
                        sub["groups"] = [g for g in FUNC_GROUPS[sub_id][0] if g in present]
                        sub["groupDefault"] = FUNC_GROUPS[sub_id][2]  # where an item moved in from elsewhere lands
                        # a big group with several makers is divided by manufacturer inside (Fluid Heads: Cartoni, O'Connor, Sachtler...)
                        sub["brandSplit"] = [g for g in sub["groups"] if sum(1 for i in sub["items"] if i["group"] == g) >= 7 and len({i["brand"] for i in sub["items"] if i["group"] == g}) >= 3]
                    else:
                        for item in sub["items"]: item.pop("group", None)
                cat["subcategories"].append(sub)
            if cat["subcategories"]:
                h["categories"].append(cat)
        data["rental_houses"].append(h)
    return data, rows


if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import utopia_data
    out = sys.argv[1]
    data, rows = build([(HOUSE, regroup_media(regroup_filters(CATALOG))), (utopia_data.HOUSE, regroup_media(regroup_filters(utopia_data.CATALOG)))])
    with open(f"{out}/ac_cam_list_inventory.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    with open(f"{out}/ac_cam_list_inventory.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Rental house", "Category", "Subcategory", "Brand", "Item", "List section", "SKU", "Coverage / sensor", "Focal lengths", "Stop", "Name on site (if different)", "Product page"])
        w.writerows(rows)
    for h in data["rental_houses"]:
        tot = 0
        for cat in h["categories"]:
            n = sum(len(s["items"]) for s in cat["subcategories"])
            tot += n
            print(h["id"], cat["name"], n, {s["name"]: len(s["items"]) for s in cat["subcategories"]})
        print(h["id"], "TOTAL", tot)
