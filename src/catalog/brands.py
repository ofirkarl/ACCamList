"""Detect the manufacturer of an inventory item from its name."""
import re

GENERIC = "Generic"

# Exact-prefix overrides for names where the first word is not the maker.
OVERRIDES = [
    ("ULTRA PRIME SET", "Zeiss"), ("ZEISS", "Zeiss"),
    ("Atlas DJI", "DJI"), ("Atlas LEICA Zoom DG", "Panasonic"), ("LEICA Panasonic DG", "Panasonic"),
    ("Canon EF Lens to", "Metabones"),
    ("PIX 240i", "Video Devices"), ("HS-2200", "Datavideo"), ("P2 EXPRESS CARD", "Panasonic"),
    ("NUCLEUS", "Tilta"), ("Nucleus", "Tilta"), ("MANTIS-I", "Mantis"),
    ("Lumix", "Panasonic"), ("S4i", "Cooke"),
    ("ARRI / FUJINON", "ARRI"), ("OPTEX / CANON", "Optex"),
    ("Codex", "Codex"), ("ARRI Codex", "ARRI"),
]

# Multi-word makers, matched case-insensitively at the start of the name.
PREFIXES = [
    ("BLACKMAGIC DESIGN", "Blackmagic Design"), ("Blackmagic", "Blackmagic Design"),
    ("VISION RESEARCH", "Phantom"), ("RONFORD-BAKER", "Ronford-Baker"), ("RONFORD BAKER", "Ronford-Baker"),
    ("Ronford", "Ronford-Baker"), ("BLAZER LENS", "Blazar"), ("BLAZAR", "Blazar"),
    ("WOODEN CAMERA", "Wooden Camera"), ("VIDEO DEVICES", "Video Devices"),
    ("CONVERGENT DESIGN", "Convergent Design"), ("DECIMATOR", "Decimator"),
    ("Mark Roberts", "Mark Roberts Motion Control"), ("FILM DEVICES", "Film Devices"),
    ("MEAN WELL", "Mean Well"), ("IBE", "IBE Optics"), ("P+S TECHNIK", "P+S Technik"),
    ("RED ROCK", "Redrock Micro"), ("READY RIG", "Ready Rig"), ("EASY RIG", "Easyrig"),
    ("IRON GLASS", "Iron Glass"), ("Cinematography electronics", "Cinematography Electronics"),
    ("sea frogs", "SeaFrogs"), ("RT MOTION", "RT Motion"), ("RT Motion", "RT Motion"),
    ("Cine RT", "Cine RT"), ("FOR.A", "For.A"), ("HO-LINK", "HO-Link"), ("T-CREATE", "T-Create"),
    ("Mark Roberts", "Mark Roberts Motion Control"), ("O'CONNOR", "O'Connor"), ("O'CELL", "O'Cell"),
]

CANON = {
    "arri": "ARRI", "sony": "Sony", "red": "RED", "canon": "Canon", "panasonic": "Panasonic",
    "dji": "DJI", "gopro": "GoPro", "insta360": "Insta360", "fujinon": "Fujifilm / Fujinon",
    "fujifilm": "Fujifilm / Fujinon", "freefly": "Freefly", "nokia": "Nokia", "360rize": "360Rize",
    "marshall": "Marshall", "lawmate": "Lawmate", "leitz": "Leitz", "cooke": "Cooke", "atlas": "Atlas",
    "sigma": "Sigma", "nisi": "NiSi", "angenieux": "Angenieux", "laowa": "Laowa", "dzofilm": "DZOFilm",
    "tokina": "Tokina", "metabones": "Metabones", "leica": "Leica", "cinescope": "Cinescope",
    "tribe7": "Tribe7", "viltrox": "Viltrox", "sirui": "Sirui", "samyang": "Samyang", "dulens": "Dulens",
    "elite": "Elite", "schneider": "Schneider", "century": "Century", "lensbaby": "Lensbaby",
    "ttartisan": "TTArtisan", "kipon": "Kipon", "tilta": "Tilta", "tls": "TLS", "fotodiox": "FotodioX",
    "urth": "Urth", "simmod": "Simmod", "mtf": "MTF", "kippertie": "KipperTie", "optitek": "Optitek",
    "cartoni": "Cartoni", "sachtler": "Sachtler", "smallhd": "SmallHD", "atomos": "Atomos",
    "hollyland": "Hollyland", "portkeys": "Portkeys", "bon": "Bon", "astro": "Astro", "chewa": "Chewa",
    "smallrig": "SmallRig", "chrosziel": "Chrosziel", "cmotion": "cmotion", "teradek": "Teradek",
    "cinesaddle": "Cinesaddle", "easyrig": "Easyrig", "steadicam": "Steadicam", "prograde": "ProGrade",
    "samsung": "Samsung", "tiffen": "Tiffen", "vaxis": "Vaxis", "ice": "Ice", "manfrotto": "Manfrotto",
    "botai": "Botai", "secced": "Secced", "vinten": "Vinten", "glidecam": "Glidecam", "vocas": "Vocas",
    "shape": "SHAPE", "flowcine": "Flowcine", "blkbrd": "BLKBRD", "matthews": "Matthews", "rbi": "RBI",
    "dvtec": "DVTEC", "digitalfoto": "Digitalfoto", "proaim": "Proaim", "panther": "Panther",
    "filmair": "Filmair", "androokie": "Androokie", "swit": "SWIT", "fxlion": "FXLion",
    "citytek": "Citytek", "cineroid": "Cineroid", "aputure": "Aputure", "advice": "Advice",
    "utopia": "Utopia", "angelbird": "Angelbird", "lexar": "Lexar", "sandisk": "SanDisk",
    "hyper": "Hyper", "jvc": "JVC", "scubacam": "Scubacam", "amphibico": "Amphibico", "meikon": "Meikon",
    "polarpro": "PolarPro", "denecke": "Denecke", "hahnel": "Hähnel", "harrison": "Harrison",
    "apple": "Apple", "dell": "Dell", "transvideo": "Transvideo", "zacuto": "Zacuto", "postium": "Postium",
    "ruige": "Ruige", "feelworld": "Feelworld", "shimbol": "Shimbol", "accsoon": "Accsoon",
    "vrriis": "Vrriis", "amimon": "Amimon", "boxx": "BOXX", "abonair": "ABonAir", "movcam": "Movcam",
    "preston": "Preston", "aja": "AJA", "avmatrix": "AVMatrix", "cobalt": "Cobalt", "kramer": "Kramer",
    "datavideo": "Datavideo", "elgato": "Elgato", "codex": "Codex", "the": None,
}

GENERIC_START = {
    "clear", "ndf", "ndg", "pola", "rota", "soft", "black", "white", "circular", "proxar", "allure",
    "yellow", "digital", "pl", "remote", "sd", "v90", "cfast", "xqd", "sxs", "bnc", "hd/sdi", "multi",
    "split", "butt-dolly", "mb-19",
}


def brand_of(name: str) -> str:
    n = name.strip()
    for pre, b in OVERRIDES:
        if n.startswith(pre):
            return b
    low = n.lower()
    for pre, b in PREFIXES:
        if low.startswith(pre.lower()):
            return b
    first = re.split(r"[\s]+", n)[0]
    key = first.lower().strip(",")
    if key in GENERIC_START:
        return GENERIC
    if key in CANON and CANON[key]:
        return CANON[key]
    return first  # unknown maker: keep as written so it is visible in review
