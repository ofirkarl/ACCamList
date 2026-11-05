"""Display-name casing, filter subcategories, lens/camera specs and TX/RX flags."""
import re
from brands import CANON

# ---------------------------------------------------------------- title case
ACRONYMS = set("""
PL LPL EF EF-S RF FE GM OSS ND NDF NDG IRND IR VND CPL HT UV FX VFX HD UHD SDI HDMI BNC LCD OLED EVF TX RX XQD SSD SD SDXC
USB UPS DSLR PTZ ENG CCU MFT LF FF VV S35 OIS WR AF MF DC AC II III IV MKII MKIII XD CP TLS SE LT XT TB IP DMX LDS
PXW PMW PDW DVW DSR HVR BRC NEX ILME FS AU AG AJ HC AW BT LMD PVM DMW VW VM NP BP BC LC CA DE RM RCU MCX HVS DVK RMC UMC SMC
SXU WCU OCU RIA ZMU UDM CLM LMB MB MMB CBP LS ZSD ERD HDX UMS XLR DA VS SFP VGA DVI CF UHS AXS TC CU ARRI RED DJI JVC AJA
IBE MTF SWIT BOXX BLKBRD DVTEC RBI TV QLED HDR LED RGB CTRL USB-C GPS POV PD MD HX RDA DUCC TS GR SB EX ENG APO XF ATX AT-X
DL DG CN CN-E HSM DX ZE CF B4 LT DS WRSD IASE IRSE BERM BERD ERM BEVM DIY TB3 EOS PZ ASPH GF LM RS RT FD HFR DECT HUB
""".split())
SPECIAL = {k: v for k, v in CANON.items() if v and v.lower() == k}  # casing only, never a different label
SPECIAL.update({
    "smallhd": "SmallHD", "dzofilm": "DZOFilm", "fxlion": "FXLion", "gopro": "GoPro", "insta360": "Insta360",
    "varicam": "VariCam", "macbook": "MacBook", "ipad": "iPad", "polarpro": "PolarPro", "prograde": "ProGrade",
    "sandisk": "SanDisk", "o'connor": "O'Connor", "o'cell": "O'Cell", "smallrig": "SmallRig", "ttartisan": "TTArtisan",
    "fotodiox": "FotodioX", "kippertie": "KipperTie", "abonair": "ABonAir", "avmatrix": "AVMatrix", "ultrabright": "UltraBright",
    "hyperdeck": "HyperDeck", "ultrastudio": "UltraStudio", "easytilt": "EasyTilt", "megagrip": "MegaGrip",
    "periprobe": "PeriProbe", "pro2be": "Pro2be", "cfast": "CFast", "cfexpress": "CFexpress", "sxs": "SxS",
    "prossd": "PROSSD", "redmag": "REDMAG", "cforce": "cforce", "cmotion": "cmotion", "cinealta": "CineAlta",
    "skypanel": "SkyPanel", "videohub": "Videohub", "atem": "ATEM", "nucleus-m": "Nucleus-M", "mimic": "MIMIC",
    "movi": "MoVI", "vidiu": "Vidiu", "minimax": "Minimax", "scubacam": "SCUBACAM", "seafrogs": "SeaFrogs",
    "expressp2": "expressP2", "lumix": "Lumix", "otus": "Otus", "s4i": "S4i", "s4\\i": "S4i", "cineview": "CineView",
    "ronin-s": "Ronin-S", "ronin-m": "Ronin-M", "ronin-mx": "Ronin-MX", "pixelbrick": "PixelBrick", "zip": "Zip",
    "ezt": "EZT", "i/o": "I/O", "at-x": "AT-X", "ll": "II",
})
LOWER_KEEP = {"mm"}


def _chunk(c):
    if not c:
        return c
    low = c.lower()
    if low in SPECIAL:
        return SPECIAL[low]
    if c.upper() in ACRONYMS:
        return c.upper()
    if len(c) == 1:
        return c.upper()
    if "." in c:  # H.Edge, S.E, B.Pro
        return c if c.isupper() else c[0].upper() + c[1:]
    if c[1:] != c[1:].lower() and c[1:] != c[1:].upper():  # already mixed case: SmallHD-style
        return c[0].upper() + c[1:]
    return c[0].upper() + c[1:].lower()


def title_case(name):
    out = []
    for word in name.split(" "):
        m = re.match(r"^([\"'(\[“]*)(.*?)([\"')\],:;”″]*)$", word)
        pre, core, post = m.groups()
        if not core:
            out.append(word)
            continue
        low = core.lower()
        if low in SPECIAL:
            out.append(pre + SPECIAL[low] + post)
            continue
        if re.search(r"\d", core) or re.match(r"^f/", core, re.I):
            out.append(re.sub(r"(\d)MM\b", r"\1mm", word))  # model codes, sizes, focal lengths, stops: keep as written
            continue
        parts = re.split(r"([-/&\\+])", core)
        out.append(pre + "".join(p if p in "-/&\\+" else _chunk(p) for p in parts) + post)
    return " ".join(out)


# ---------------------------------------------------------------- filters
FILTER_SUBS = [
    ("nd", "ND"), ("ndg", "ND Grad"), ("polarizers", "Polarizers"), ("diffusers", "Diffusers"),
    ("diopters", "Diopters"), ("effects", "Effects"), ("clear", "Clear & Protectors"),
]
FILTER_GROUP_BY = {"nd": "size", "ndg": "size"}  # the rest group by filter type
SIZE_ORDER = ["4x4", "4x5.6", "6x6", "Round & Variable"]
FILTER_WORDS = re.compile(r"filter|\bnd[fg]?\b|pola|pro mist|diopter|proxar", re.I)


def _size(n):
    if re.search(r"4\s*[x×]\s*5\.6", n, re.I):
        return "4x5.6"
    if re.search(r"4\s*[x×]\s*4(?![.\d])", n, re.I):
        return "4x4"
    if re.search(r"6(\.6)?\s*[x×]\s*6", n, re.I):
        return "6x6"
    return "Round & Variable"


def filter_sub(n):
    if re.search(r"clear|protector|explosion", n, re.I):
        return "clear"
    if re.search(r"close-?up|diopter|proxar", n, re.I):
        return "diopters"
    if re.search(r"pola|polariz", n, re.I):
        return "polarizers"
    if re.search(r"\bndg\b|grad", n, re.I):
        return "ndg"
    if re.search(r"\bndf\b|\birnd\b|\bnd\b|\bvnd\b|variable nd|solid nd|nd\d", n, re.I):
        return "nd"
    if re.search(r"mist|glimmer|soft fx|pearlescent|satin|diffusion|low contrast|allure", n, re.I):
        return "diffusers"
    return "effects"


def filter_group(sub, n):
    if sub in ("nd", "ndg"):
        return _size(n)
    if sub == "diffusers":
        for pat, g in [(r"warm pro-?mist", "Warm Pro-Mist"), (r"b\.?\s?pro-?mist|black pro[- ]?mist", "Black Pro-Mist"),
                       (r"pro[- ]?mist", "Pro-Mist"), (r"glimmer", "Glimmerglass"), (r"soft fx", "Soft FX"),
                       (r"pearlescent", "Pearlescent"), (r"satin", "Black Satin"), (r"g\.?\s?diffusion", "Gold Diffusion FX"),
                       (r"b\.?\s?diffusion", "Black Diffusion FX"), (r"low contrast", "Low Contrast"),
                       (r"allure mist black", "Allure Mist Black"), (r"allure mist white", "Allure Mist White"),
                       (r"black mist", "Black Mist"), (r"pure mist", "Pure Mist")]:
            if re.search(pat, n, re.I):
                return g
        return "Other Diffusion"
    if sub == "polarizers":
        if re.search(r"ultra pola", n, re.I): return "Ultra Pola"
        if re.search(r"rota", n, re.I): return "Rota Pola"
        if re.search(r"circular|\bht\b", n, re.I): return "Circular Polarizer"
        return "Pola"
    if sub == "diopters":
        if re.search(r"split", n, re.I): return "Split Diopter"
        if re.search(r"proxar", n, re.I): return "Proxar"
        m = re.search(r"(\d+)mm", n)
        return f"{m.group(1)}mm Close-Up" if m else "Close-Up"
    if sub == "effects":
        if re.search(r"suede", n, re.I): return "Antique Suede"
        if re.search(r"streak", n, re.I): return "Streak"
        if re.search(r"blocker", n, re.I): return "Light Blocker"
        return "Other Effects"
    if sub == "clear":
        return "Clear" if re.search(r"clear", n, re.I) else "Protectors"
    return None


def strength(n):
    """Density or strength for sorting: '– 09' -> 0.9, '-1/4' -> 0.25."""
    s = re.sub(r"\d+(\.\d+)?\s*[x×]\s*\d+(\.\d+)?|\d+mm|\b4\.5\b|\d+\.?\d*\s*Wh|ND\d+-\d+", " ", n, flags=re.I)
    toks = re.findall(r"\d+/\d+|\d+(?:\.\d+)?", s)
    if not toks:
        return 99.0
    t = toks[-1]
    if "/" in t:
        a, b = t.split("/"); return int(a) / int(b)
    if re.fullmatch(r"0\d", t):
        return int(t) / 10
    return float(t)


def filter_sort_key(sub, n):
    kind = 0 if re.search(r"\bndf\b|nd filter", n, re.I) else 1 if re.search(r"irnd", n, re.I) else 2
    size = SIZE_ORDER.index(_size(n))
    return (kind, strength(n), n) if sub in ("nd", "ndg") else (size, strength(n), n)


# ---------------------------------------------------------------- media and card readers
MEDIA_SUBS = [("media", "Media"), ("card_readers", "Card Readers"), ("recorders", "Recorders & Decks"), ("other", "Other")]
MEDIA_ORDER = ["Codex Compact Drive", "AXS", "CFexpress Type B", "CFexpress Type A", "CFast 2.0", "SxS", "XQD", "P2 / expressP2",
               "RED Mini-Mag", "DJI PROSSD", "SSD", "SD", "microSD", "CF", "Multi-card"]


def media_kind(n):
    if re.search(r"reader|dock|station", n, re.I):
        return "card_readers"
    if re.search(r"recorder|player|hvr-m|br-hd50|hyperdeck", n, re.I):
        return "recorders"
    if re.search(r"card|drive|ssd|mag|cfast|cfexpress|sxs|xqd|\bsd\b|p2|\baxs-", n, re.I):
        return "media"
    return "other"


def media_group(n):
    types = []
    for pat, g in [(r"codex", "Codex Compact Drive"), (r"\baxs\b|axs-", "AXS"), (r"cfexpress.*type a|type a", "CFexpress Type A"),
                   (r"cfexpress", "CFexpress Type B"), (r"cfast", "CFast 2.0"), (r"sxs", "SxS"), (r"xqd", "XQD"),
                   (r"p2", "P2 / expressP2"), (r"mini-?mag|redmag", "RED Mini-Mag"), (r"prossd", "DJI PROSSD"),
                   (r"micro\s?sd", "microSD"), (r"\bssd\b|\bt5\b", "SSD"), (r"\bsd\b|sdxc|sd card|sd memory|v90", "SD"), (r"\bcf\b", "CF")]:
        if re.search(pat, n, re.I) and g not in types:
            if g == "CFexpress Type B" and "CFexpress Type A" in types:
                continue
            types.append(g)
    if re.search(r"reader", n, re.I) and len(types) > 1:
        return "Multi-card"
    return types[0] if types else "Other"


# ---------------------------------------------------------------- follow focus and lens control, by product type
FF_ORDER = ["Wireless Follow Focus", "Motors", "Motor Controllers", "Zoom Controls", "Mechanical Follow Focus",
            "Ultrasonic Distance Measurement"]


def ff_group(n):
    for pat, g in [(r"ultrasonic|\budm\b|udm-|cine ?tape|distance meas", "Ultrasonic Distance Measurement"),
                   (r"zoom", "Zoom Controls"),
                   (r"hand unit|hi-5|\bwcu|wireless compact unit|\bocu\b|ocu-|operator control|ctrl\.[15]|\bsxu", "Wireless Follow Focus"),  # hand units live with the wireless kits
                   (r"motor controller|\bumc|\bsmc|ria-1|radio interface", "Motor Controllers"),
                   (r"\bmotor\b|cforce|\bclm", "Motors"),
                   (r"\bff-4\b|follow focus (double|one) side|(double|one) side follow focus", "Mechanical Follow Focus")]:
        if re.search(pat, n, re.I):
            return g
    return "Wireless Follow Focus"


# ---------------------------------------------------------------- batteries, chargers and power, by product type
POWER_ORDER = ["V-Mount Batteries", "B-Mount Batteries", "Gold Mount Batteries", "26V & 48V Batteries", "Camera Batteries",
               "NP-F Batteries", "Action Cam & Gimbal Batteries", "Small Battery Packs", "Lead & Gel Batteries",
               "V-Mount Chargers", "B-Mount Chargers", "26V & 48V Chargers", "Camera Battery Chargers", "Action Cam & Gimbal Chargers",
               "Lead & Gel Chargers", "Battery Plates & Adaptors", "AC Power & Power Stations"]


def charger_group(n):
    """Chargers by the battery they charge."""
    for pat, g in [(r"v[- ]?mount|\bd-3004s\b", "V-Mount Chargers"), (r"b-mount", "B-Mount Chargers"),
                   (r"\b(26|48)v\b", "26V & 48V Chargers"), (r"gopro|aadbd|osmo|\bdji\b", "Action Cam & Gimbal Chargers"),
                   (r"\bgel\b|\b(12|24)v\b|mean well", "Lead & Gel Chargers")]:
        if re.search(pat, n, re.I):
            return g
    return "Camera Battery Chargers"


def power_group(n):
    for pat, g in [(r"charger|charging|\bbc-u1\b|\bbc-qm1\b|\bac-vl1\b|\bd-3004s\b|\bsc-302s\b|\bca-930\b|\blc-e6\b|\bvw-ad20\b|\bde-a20\b|aadbd", "Chargers"),
                   (r"ac power pack|power station|\bups\b|vertex", "AC Power & Power Stations"),
                   (r"\b(26|48)v\b|mega battery", "26V & 48V Batteries"),
                   (r"plate|adaptor|adapter", "Battery Plates & Adaptors"),
                   (r"b-mount|\bbm-hv", "B-Mount Batteries"),
                   (r"gold mount", "Gold Mount Batteries"),
                   (r"v-mount", "V-Mount Batteries"),
                   (r"\bnp-f\d|l-series", "NP-F Batteries"),
                   (r"gopro|insta360|\btb50\b|\bwb37\b|osmo", "Action Cam & Gimbal Batteries"),
                   (r"\b12v\b|\b24v\b|\bgel\b", "Lead & Gel Batteries"),
                   (r"\batto\b|li-ion 11\.1v|\bpack\b", "Small Battery Packs")]:
        if re.search(pat, n, re.I):
            return charger_group(n) if g == "Chargers" else g
    return "Camera Batteries"


# ---------------------------------------------------------------- wireless video
def is_txrx(sub_id, n):
    if sub_id != "wireless_video":
        return False
    if re.search(r"director|serv|vidiu|link|antenna|ab4000|pyro 7", n, re.I):
        return False
    return bool(re.search(r"bolt|cosmo|mars|pyro|syscom|cineview|wireless video|transmitter|transmission|connex|meridian|vrriis|ab512", n, re.I))


# ---------------------------------------------------------------- cameras
SENSOR_LABEL = {"FF": "Full frame", "LF": "Large format", "S35": "Super 35", "S16": "Super 16", "MFT": "Micro Four Thirds",
                "MF": "Medium format", "2/3": '2/3" (B4)', "fixed": "Fixed lens", "APS-C": "APS-C / Super 35"}
CAMERAS = [  # (pattern, sensor, film)
    (r"ALEXA MINI LF", "LF"), (r"ALEXA 35", "S35"), (r"ALEXA MINI", "S35"), (r"AMIRA|ALEXA PLUS|ALEXA EV", "S35"),
    (r"ARRIFLEX 416", "S16"), (r"VENICE|BURANO|Rialto", "FF"), (r"FX30", "S35"), (r"FX9|FX6|FX3|ILME-FX2|FR7", "FF"),
    (r"FS7|FS5|PMW-F55|PMW-F5\b|PMW-F3|FS700", "S35"), (r"HELIUM|KOMODO|DRAGON", "S35"), (r"VARICAM|EVA1", "S35"),
    (r"C500 Mark II|C400|EOS C80", "FF"), (r"C300|C70\b", "S35"), (r"URSA MINI PRO", "S35"), (r"PYXIS (12K|6K)", "FF"),
    (r"Pocket Cinema Camera 4K", "MFT"), (r"Pocket Cinema Camera 6K", "S35"), (r"Micro Cinema Camera|Micro Studio Camera", "S16"),
    (r"GFX", "MF"), (r"Ronin 4D", "FF"), (r"BGH1|GH5S", "MFT"), (r"BS1H|S1H", "FF"), (r"A7S|A7 |A7$|ALPHA A7", "FF"),
    (r"5D MARK", "FF"), (r"CANON D7", "APS-C"), (r"PHANTOM FLEX|MIRO M320", "S35"),
    (r"PXW-X400|PMW-400|PDW-[78]00|DVW-970|HSC-300|AG-HPX500|DSR-450", "2/3"),
    (r"PXW-X70|Z90|Z150|CX350|PX270|UX180|DVX-200|AC160|HMC154|X180|PMW-100|TM900|HC-|Osmo|GOPRO|GoPro|INSTA360|OZO|360RIZE|"
     r"3DA1|BRC-|AW-UE|MARSHALL|LAWMATE|ZV-1|MISSION 1", "fixed"),
]


CAMERA_MEDIA = [  # (pattern, preferred card types in order)
    (r"ALEXA MINI LF|ALEXA 35", ["Codex Compact Drive"]), (r"ALEXA MINI|AMIRA", ["CFast 2.0"]), (r"ALEXA PLUS|ALEXA EV", ["SxS"]),
    (r"VENICE|Rialto", ["AXS", "SxS"]), (r"BURANO", ["CFexpress Type B"]), (r"FX9", ["XQD", "CFexpress Type B"]),
    (r"FX6|FX3|FX30|ILME-FX2|A7S MARK III|A7 IV", ["CFexpress Type A", "SD"]), (r"FS7", ["XQD"]), (r"FS5|FS700|EVA1|C70|EOS C80|BGH1|BS1H|S1H|GH5S|ALPHA A7|A7S|ZV-1", ["SD"]),
    (r"PMW-F55|PMW-F5\b|PMW-F3", ["SxS", "AXS"]), (r"HELIUM|DRAGON", ["RED Mini-Mag"]), (r"KOMODO", ["CFast 2.0"]),
    (r"VARICAM|AG-HPX500", ["P2 / expressP2"]), (r"C300 Mark II", ["CFast 2.0"]), (r"EOS C300", ["CF"]),
    (r"C500 Mark II|C400", ["CFexpress Type B"]), (r"URSA MINI PRO|Pocket Cinema", ["CFast 2.0", "SD"]), (r"Micro Cinema", ["SD"]),
    (r"PYXIS|GFX", ["CFexpress Type B"]), (r"Ronin 4D", ["DJI PROSSD", "SSD"]), (r"5D MARK|CANON D7", ["CF"]),
    (r"PXW-X400|PMW-400", ["SxS"]), (r"PMW-100", ["SxS", "SD"]),
    (r"PXW-X180|PXW-X70|Z90|Z150|CX350|PX270|UX180|DVX-200|AC160|HMC154|TM900|HC-", ["SD"]),
    (r"GOPRO|GoPro|INSTA360|Osmo|MISSION 1", ["microSD"]),
]


def camera_meta(cat_id, sub_id, n):
    if cat_id != "camera" or re.search(r"controller", n, re.I):
        return None
    for pat, sensor in CAMERAS:
        if re.search(pat, n, re.I):
            media = next((m for p2, m in CAMERA_MEDIA if re.search(p2, n, re.I)), [])
            return {"sensor": sensor, "label": SENSOR_LABEL[sensor], "lensCheck": sensor != "fixed",
                    "film": bool(re.search(r"ARRIFLEX|416", n)), "media": media,
                    "wireless": sub_id not in ("action_360", "ptz", "mini", "compact") and not re.search(r"gopro|insta360|osmo|mission 1", n, re.I)}
    return None


# ---------------------------------------------------------------- lenses
def _norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


S = lambda *f: [str(x) for x in f]
SETS = {  # normalized original name -> focal lengths, stop, coverage, squeeze, sku, note  (from each product page)
    "utopia": {
        "COOKE S6i ANAMORPHIC T2.3 Lens set": dict(f=S(32, 40, 50, 75, 100), t="T2.3", c="S35", sq="2x", sku="LNS-CAS"),
        "Atlas Orion ANAMORPHIC T2 Lens set": dict(f=S(32, 40, 50, 65, 80, 100), t="T2", c="S35", sq="2x", sku="LNS-OAS"),
        "Atlas Orion Silver Edition SE ANAMORPHIC T2 Lens set": dict(f=S(32, 40, 50, 65, 80, 100), t="T2", c="S35", sq="2x", sku="LNS-SES"),
        "BLAZAR CATO Full-Frame 2x Anamorphic 4-Lens Set PL-Mount": dict(f=S(40, 55, 85, 125), t="T2–T4", c="FF", sq="2x", sku="LNS-CTS"),
        "Viltrox EPIC T2 1.33x Full-Frame Anamorphic 7-Lens Set PL-Mount": dict(f=S(25, 35, 50, 75, 100), t="T2", c="FF", sq="1.33x", sku="LNS-VLS", note="65 and 135mm are listed separately"),
        "BLAZER LENS Remus Full-Frame 1.5x Anamorphic Full Lens Set PL-Mount": dict(f=S(33, 45, 50, 65, 85, 100, 125), t="T2–T4", c="FF", sq="1.5x", sku="LNS-RMS"),
        "ZEISS Supreme Prime Radiance Diamond 5-Lens Set PL-Mount": dict(f=S(21, 29, 40, 65, 100), t="T1.5", c="FF", sku="LNS-SSU"),
        "ZEISS Supreme Prime Radiance Diamond 6-Lens Set PL-Mount": dict(f=S(18, 25, 35, 50, 85, 135), t="T1.5", c="FF", sku="LNS-BSU"),
        "SIRUI Anamorphic Prime LENSES 1.33X - 24, 35, 50, 75mm T1.8/2.8 E-Mount": dict(f=S(24, 35, 50, 75), t="T1.8–T2.8", c="APS-C", sq="1.33x"),
        "NISI ATHENA PRIME T2.4/1.9 Full-Frame 8-Lens Set PL-Mount": dict(f=S(14, 18, 25, 35, 40, 50, 85, 135), t="T1.9–T2.4", c="FF", sku="LNS-ATS"),
        "NISI AUREUS PRIME T1.4 Full-Frame 5-Lens Set PL-Mount": dict(f=S(18, 24, 35, 50, 85), t="T1.4", c="FF", sku="LNS-ARS"),
        "Schneider ISCO4all Lens Set - 43, 58, 85mm & 54mm CU-1 X1.5 T/2.4 EF-Mount": dict(f=S(43, 58, 85), t="T2.4", c=None, sq="1.5x", note="plus 54mm CU-1 close-up"),
        "LAOWA Nanomorph S35 Anamorphic Prime 5-Lens Kit": dict(f=S(27, 35, 50, 65, 80), t="T2.4–T2.8", c="S35", sq="1.5x", sku="LNS-LAS"),
        "COOKE S4\\i T2 Prime Lens Set": dict(f=["18", "25", "32", "35/40", "50", "75", "100"], t="T2", c="S35", sku="LNS-S4i"),
        "CINESCOPE LEICA R Prime FF PL-Mount Lens Set of 10": dict(f=S(19, 24, 28, 35, 50, 60, 80, 90, 100, 135), t="T1.5–T2.9", c="FF", sku="LNS-LR"),
        "LEICA Summicron-C T2 Prime Lens Set": dict(f=S(18, 25, 35, 50, 75, 100), t="T2", c="S35", sku="LNS-LEI"),
        "LEICA Summilux-C T1.4 Prime Lens Set": dict(f=S(18, 21, 25, 29, 35, 40, 50, 65, 75, 100), t="T1.4", c="S35", sku="LNS-LLUX"),
        "TRIBE7 BLACKWING7 T1.9 Lens Set": dict(f=S(20.7, 27, 37, 47, 57, 77, 107, 137), t="T1.9", c="FF", sku="LNS-BWS"),
        "SONY CineAlta 4K Lens Set": dict(f=S(20, 25, 35, 50, 85, 135), t="T2", c="S35", sku="LNS-SON"),
        "ARRI Master Prime T1.3 Lens Set": dict(f=S(14, 18, 25, 35, 50, 75, 100), t="T1.3", c="S35", sku="LNS-MPS"),
        "ZEISS Ultra Prime T1.9 Lens Set": dict(f=S(16, 20, 24, 28, 32, 40, 50, 85, 100, 135), t="T1.9", c="S35", sku="LNS-UPK"),
        "ZEISS High Speed Prime T1.3 Lens Set": dict(f=S(18, 25, 35, 50, 85), t="T1.3", c="S35", sku="LNS-PS", note="135mm can be added"),
        "ZEISS Super16 ArriFlex and Ultra Primes Mix Set T1.3": dict(f=S(6, 9.5, 12, 16, 25, 50), t="T1.3", c="S16", sku="LNS-SU16"),
        "ELITE Super16 OPTAR Primes Set T1.3": dict(f=S(8, 9.5, 12, 16, 25, 50), t="T1.3", c="S16", sku="LNS-PS16"),
        "ZEISS Compact Prime Super Speed T1.5 Lens set PL/ EF/E Mount": dict(f=S(35, 50, 85), t="T1.5", c="FF", sku="LNS-SPR", note="15mm optional"),
        "ZEISS Compact Prime CP.3 Lens Set PL/EF/E Mount": dict(f=S(18, 25, 35, 50, 85), t="T2.1–T2.9", c="FF", sku="LNS-CP3B", note="15, 21, 28, 100, 135mm optional"),
        "ZEISS Compact Prime CP.3 XD Lens Set PL-Mount": dict(f=S(18, 25, 35, 50, 85), t="T2.1–T2.9", c="FF", sku="LNS-CP3X"),
        "CANON FD Prime 9 Lens Set": dict(f=S(14, 20, 24, 28, 35, 55, 85, 100, 135), t="T1.3–T2.9", c="FF", sku="LNS-FDLS"),
        "ZEISS Nano Prime Lens Set E-Mount": dict(f=S(18, 24, 35, 50, 75, 100), t="T1.5", c="FF", sku="LNS-NPS"),
        "CANON V35 Prime 7 Lens Set": dict(f=S(14, 20, 24, 35, 50, 85, 135), t="T1.3–T3.1", c="FF", sku="LNS-V35S"),
        "ZEISS Compact Prime CP.2 Lens Set PL Mount": dict(f=S(18, 25, 35, 50, 85), t="T2.1–T3.6", c="FF", sku="LNS-CPS", note="18mm covers APS-H only"),
        "ZEISS Standard Prime T2.1 Lens Set": dict(f=S(16, 20, 24, 32, 40, 50, 85, 100), t="T2.1", c="S35", sku="LNS-SPS"),
        "COOKE Panchro Prime Lens Set": dict(f=S(18, 25, 32, 40, 50, 75, 100), t="T2.2–T2.8", c="FF", sku="LNS-PCR"),
        "CENTURY Swing&Shift Lens set PL Mount": dict(f=S(24, 35, 55, 75, 105), t=None, c=None, sku="LNS-SSL"),
        "IRON GLASS MKII FF 8-Lens Prime Set": dict(f=S(16, 20, 28, 37, 50, 58, 85, 135), t="T2.1–T3.6", c="FF", sku="LNS-IGM2"),
        "COOKE SP3 Full-Frame 6-Lens Prime Set": dict(f=S(18, 25, 32, 50, 75, 100), t="T2.4", c="FF", sku="LNS-CSS"),
        "DZOFilm Thypoch Simera-C T1.5 Cine 5-Lens Kit": dict(f=S(21, 28, 35, 50, 75), t="T1.5", c="FF", sku="LNS-TSS"),
        "ARRI Signature Prime LPL-Mount Lens Set OF 8": dict(f=S(18, 25, 35, 47, 58, 75, 95, 125), t="T1.8", c="LF", sku="LNS-SGN8"),
        "Sigma CINE FF High Speed Prime PL-Mount Lens set": dict(f=S(14, 20, 24, 28, 35, 40, 50, 85, 105, 135), t="T1.5–T2", c="FF", sku="LNS-SGPL"),
        "DZOFilm Set of 8 VESPID FF PL-Mount Prime Lenses": dict(f=["16", "25", "35", "50", "75", "90 macro", "100", "125"], t="T2.1–T2.8", c="FF", sku="LNS-VSET"),
        "LEICA Cine M 0.8 7-Lens Set M-Mount": dict(f=S(21, 24, 28, 35, 50, 75, 90), t="f/1.4–f/2", c="FF", sku="LNS-M8S"),
        "Dulens APO Mini Prime T2.4/T2.6 SET": dict(f=S(21, 31, 43, 58, 85), t="T2.4–T2.6", c="FF"),
        "TOKINA SET OF 7 Prime Vista - 18, 25, 35, 50, 85, 105, 135mm/ All T1.5 FF PL-Mount": dict(f=S(18, 25, 35, 50, 85, 105, 135), t="T1.5", c="FF"),
        "TOKINA SET OF 4 Prime Vista - 21, 29, 40, 65mm/ All T1.5 FF PL-Mount": dict(f=S(21, 29, 40, 65), t="T1.5", c="FF"),
        "LAOWA Venus Optics Ranger Full Frame Cine PL SET": dict(f=["16-30", "28-75", "75-180"], t="T2.9", c="FF"),
    },
    "fitussi": {
        "Leitz Summilux C Set": dict(f=S(18, 21, 25, 35, 40, 50, 75, 100, 135), t="T1.4", c="S35"),
        "ARRI SIGNATURE PRIME SET": dict(f=S(18, 25, 35, 47, 75, 125), t="T1.8", c="LF"),
        "COOKE S4i PRIME LENSES": dict(f=S(18, 25, 32, 40, 50, 75, 100), t="T2", c="S35"),
        "ULTRA PRIME SET": dict(f=S(16, 20, 24, 28, 32, 40, 50, 65, 85), t="T1.9", c="S35"),
        "ZEISS High Speed MKIII + S.S TLS": dict(f=S(18, 25, 28, 35, 40, 50, 85, 100), t="T1.3–T2.1", c="S35", note="28, 40, 100mm are Standard Speed T2.1"),
        "Atlas Orion ANAMORPHIC 7 lens set": dict(f=S(25, 32, 40, 50, 65, 80, 100), t="T2", c="S35", sq="2x"),
        "Sigma FF High-Speed Prime T1.5 SET": dict(f=S(14, 20, 24, 35, 50, 65, 85, 105, 135), t="T1.5–T2", c="FF"),
        "NiSi ATHENA PRIME T2.4/1.9 FF 8 Lens Set PL": dict(f=S(14, 18, 25, 35, 40, 50, 85, 135), t="T1.9–T2.4", c="FF"),
        "ZEISS STANDARD SPEED SET": dict(f=S(20, 28, 40), t="T2.1", c="S35"),
        "ZEISS Super16 ArriFlex Set T1.3": dict(f=S(9.5, 12, 16, 25, 50), t="T1.3", c="S16"),
        "Cooke SP3 FF 6 Lens Set": dict(f=S(18, 25, 32, 50, 75, 100), t="T2.4", c="FF"),
        "Laowa Ranger FF 3 Lens Kit 16-30mm/28-75mm/75-180mm/T2.9": dict(f=["16-30", "28-75", "75-180"], t="T2.9", c="FF"),
    },
}
SETS_N = {h: {_norm(k): v for k, v in d.items()} for h, d in SETS.items()}

COVERAGE_RULES = [  # (pattern on name, coverage, note)
    (r"EZ-[123]", "S35", "FF with the FF rear group"),
    (r"Super ?16|\bS16\b|10\.6-180", "S16", None),
    (r"MFT|Micro 4/3|Leica DG|Panasonic DG|Lumix G", "MFT", None),
    (r"\bGF\b|GFX|Fujinon GF", "MF", None),
    (r"EF-S|E-Mount 18-105|PZ 18-110|E-Mount 18-200|AF 13mm|Argus 33mm|E-Mount 12mm|EF-Mount 16mm|EF 11-16|MK18-55|MK50-135|Pictor|"
     r"CINEMA 11-16|Cinema 11-16|CINEMA 11-20|Cinema 11-20|SIRUI Anamorphic Prime", "APS-C", None),
    (r"Sigma|SIGMA|NISI|NiSi|Signature|SIGNATURE|Supreme|Vista|VESPID|Dulens|Zero-D|Ranger|PeriProbe|Pro2be|Probe|X-Tract|IRON GLASS|"
     r"SP3|Panchro|Simera|BLACKWING|LEICA R|Cine M|Compact Prime|CP\.[23]|Nano Prime|CANON FD|V35|Batis|Loxia|Samyang|SAMYANG|"
     r"Sony FE|SONY FE|SONY Sony|SONY Zoom|SONY Prime|SONY E-Mount|SONY E 70|Sony 50mm|CANON EF|CANON ZOOM|CANON Tele Prime|Sigma EF|"
     r"ZEISS EF|Milvus|Otus|Lumix S|LUMIX S|DJI 17-28|Full-Frame|Full Frame|\bFF\b|CZ\.2|LWZ|Catta|AT-X 100|Laowa EF|LAOWA EF|"
     r"Venus 8-15|Gnosis|Tilt-Shift|Super Telephoto|BLAZAR|BLAZER|Viltrox|SIRUI 50mm|LAOWA 9mm", "FF", None),
    (r"Ultra Prime|ULTRA PRIME|Master Prime|Master Zoom|Standard Prime|STANDARD SPEED|Standard 180|ZEISS High Speed|High Speed Prime|"
     r"COOKE S4|S4i|Summilux|Summicron|CineAlta|Alura|ALURA|Optimo|Cabrio|CABRIO|Cine Zoom 17-120|25-250|Nanomorph|Atlas Orion|S6i|"
     r"Angenieux 15-40|Angenieux 30-90|Master Macro|Cooke S4 ", "S35", None),
]
STOP_RE = re.compile(r"\bT\s?/?\s?(\d+(?:\.\d+)?(?:\s?[-–]\s?\d+(?:\.\d+)?)?)(?![\d.]*mm)", re.I)


def lens_meta(house, cat_id, sub_id, n):
    if cat_id != "lenses" or sub_id == "adapters":
        return None
    s = SETS_N.get(house, {}).get(_norm(n))
    m = {}
    if s:
        f = s["f"]
        m["set"] = True
        m["focals"] = ", ".join(f) + ("mm" if not any("-" in x for x in f) else "mm zooms")
        m["count"] = len(f)
        if s.get("t"): m["stop"] = s["t"]
        if s.get("c"): m["coverage"] = s["c"]
        if s.get("sq"): m["squeeze"] = s["sq"]
        if s.get("note"): m["note"] = s["note"]
        if s.get("sku"): m["sku"] = s["sku"]
        return m
    if sub_id == "b4":
        m["coverage"] = "2/3"
        z = re.search(r"(\d+)\s*[a-z]*\s*x\s*(\d+(?:\.\d+)?)", n, re.I)
        if z:
            ratio, wide = int(z.group(1)), float(z.group(2))
            m["focals"] = f"{wide:g}–{ratio * wide:.0f}mm"
        return m
    z = re.search(r"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*mm", n, re.I) or re.search(r"(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\s*/\s*T", n)
    p = re.search(r"(?<![\d.])(\d+(?:\.\d+)?)\s*mm", n, re.I)
    if z:
        m["focals"] = f"{z.group(1)}–{z.group(2)}mm"
    elif p:
        m["focals"] = f"{p.group(1)}mm"
    t = STOP_RE.search(n)
    fs = re.search(r"\bf\s?/\s?(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?)", n, re.I) or re.search(r"\b1:(\d+(?:\.\d+)?)", n)
    if t:
        m["stop"] = "T" + t.group(1).replace(" ", "").replace("-", "–")
    elif fs:
        m["stop"] = "f/" + fs.group(1)
    for pat, cov, note in COVERAGE_RULES:
        if re.search(pat, n, re.I):
            m["coverage"] = cov
            if note: m["note"] = note
            break
    sq = re.search(r"(1\.33|1\.5|1\.6|2)\s*x\b", n, re.I) if re.search(r"anamorph", n, re.I) else None
    if sq: m["squeeze"] = sq.group(1) + "x"
    elif re.search(r"Atlas Orion|S6i Anamorphic|Optimo Anamorphic", n, re.I): m["squeeze"] = "2x"
    return m or None
