# Grip and sound items the user picked to add (Gear to add, 26.11.2026): Utopia's and Fitussi's.
# (category id, category name, subcategory id, subcategory name, [items]); an item is a name or (shown name, the site's name).
# Camera support goes in with the camera accessories (tripods, rigs, car mounts), the rest in Grip and Sound.
GRIP = ("grip", "Grip")
SOUND = ("sound", "Sound")
CA = ("camera_accessories", "Camera Accessories")
ADD = {
    "utopia": [
        (*CA, "tripods", "Tripods & Heads", ["DIGITALFOTO HI-HAT 150mm Mitchell Flat Base", "RONFORD-BAKER Atlas 40 Balanced Quick Release Fluid Head", "RONFORD-BAKER Atlas 50 Balanced Fluid Head"]),
        (*CA, "rigs_stabilizers", "Rigs & Stabilizers", [
            "ARRI Bridge Plate BP-8", "ARRI Compact Bridge Plate CBP-5 for ALEXA 35 (19mm)", "ARRI Vertical Format Set for ALEXA 35",
            "ARRI Vertical Format Set for ALEXA Mini", "ARRI Vertical Viewfinder Adapter", "Tilta Hermit POV Camera Support Helmet (M, V-Mount)",
            "DIGITALFOTO ARES Dual-Spring Handle for Ronin-S and Small Cameras", "DIGITALFOTO DH04 Dual-Spring Handle for Ronin-S and Small Camera",
            "DIGITALFOTO Extend Stick for Ronin-S", "DIGITALFOTO L-Bracket for Ronin-S", "DIGITALFOTO Shoulder Strap And Clamp for Ronin-S",
            "Tilta Advanced Ring Grip for DJI RS 2 Gimbal", "Tilta Dual-Handle Power Supply Bracket for RS 2", "Tilta FLOTA Handheld Gimbal Support System",
            "Tilta Rear Operating Control Handle for DJI RS 2 Gimbal", "Tilta Remote Control Kit for DJI RS 2", "ARRI Maxima MX30",
            "FREEFLY MIMIC Controller for MoVI Pro", "FREEFLY MOVI PRO", "DJI Ronin 2", "DJI RONIN RS 4 Pro Gimbal Stabilizer",
            "DJI RONIN RS 5 Gimbal Stabilizer", "DJI RONIN RS3 PRO COMBO", "DJI RONIN RS4 Mini", "DJI RONIN S 2 RS2", "DJI RONIN S 2 RS2 PRO COMBO",
            "DJI Ronin-S", "SMALLRIG Gimbal Control Wheels for DJI RS", "DJI Ronin-M", "DJI Ronin-MX"]),
        (*CA, "car_mounts", "Car Mounts & Magnets", [
            "Tilta Hydra Alien Car Mounting System", "Tilta Hydra Alien Mini Ultimate Kit", "Proaim Hydra Electronic Suction Cup (4.5″)",
            "Proaim Megagrip Suction Cup Camera Car Mount", "Proaim Mitchell-Mount Vibration Isolator 15-50KG", "PANTHER Multi Mount Car Mounting System",
            ("Tilta Hydra x Dan Ming Speed Pan", "Tilta Tilta Hydra x Dan Ming Speed Pan"), "CALIGRI 66mm Magnet /w T-12 Clip", "FILMAIR MOKIT side car mount",
            "FILMAIR MOKIT Front car mount", "Proaim 360° Rotatable Euro Camera Adapter", "MATTHEWS Double Suction Cup with 5/8″ Stud", "GRABO PRO LIFTER",
            "MATTHEWS Suction Pump Cup with Camera Mount – 4.5″", "MATTHEWS 4.5″ Vacuum Cup with 5/8″-Pin", "Androokie 88mm Magnet Kit",
            "FILM DEVICES Camera Magnetic Car Mount Kit", "Androokie LED Bulb Magnet Kit", "Androokie Medium Kit", "Androokie Mini Pro Magnet Combo Kit",
            "Androokie Pro Magnet Kit #1", "Androokie Pro Magnet Kit #2"]),
        (*CA, "monitors", "Monitors", ["HOLLYLAND Monitor Cage V1"]),
        (*CA, "underwater", "Underwater", ["SONY FX3 Underwater camera housing"]),
        (*CA, "general", "General Accessories", ["Tilta Boulder Camera Cart XL", "UTOPIA Magliner Cart"]),
        (*CA, "intercoms", "Intercoms", [
            "HOLLYLAND MARS 1000 Wireless Intercom System", "HOLLYLAND Solidcom C1-4S Full-Duplex Wireless DECT Intercom System (1.9 GHz)",
            "HOLLYLAND Solidcom C1-HUB8S Full-Duplex Wireless DECT Intercom System with 9 Headsets and HUB Base (1.9 GHz)",
            "HOLLYLAND Solidcom M1 Full-Duplex Wireless Intercom Solution (8 Beltpacks)",
            "HOLLYLAND Solidcom M1 Pro Full-Duplex Wireless Intercom System with 4 Beltpacks & Single-Ear Headsets (1.9 GHz)",
            "HOLLYLAND Solidcom M1 Pro Full-Duplex Wireless Intercom System with 8 Beltpacks & Single-Ear Headsets (1.9 GHz)",
            "HOLLYLAND SYSCOM 1000T 6CH Wireless Intercom System"]),
        (*GRIP, "camera_mounting", "Camera Mounting", ["MANFROTTO Magic Arm"]),
        (*GRIP, "camera_movement", "Dollies & Sliders", [
            "MODERN STUDIO HEX PLATE FLOOR DOLLY WITH CASTERS", "That Cat Silent Cat 6000 6-feet Camera Slider", "MOVMAX Slider 60cm 150mm Bowl",
            "MOVMAX Slider 90cm", "MOVMAX Slider 120cm 150mm Bowl", "MOVMAX Slider 150cm", "MOVMAX Slider 180cm", "MOVMAX Slider 210cm",
            "MOVIETECH Arco Dolly", ("DANA DOLLY", "DANA DOLLY Dana Dolly"), "ABC Willi Go Dolly", "MATTHEWS Doorway Dolly", "MATTHEWS Doorway Round Dolly",
            "AMERICA Heavy Duty Slider", "KONOVA Skate Dolly", "iFootage Shark Slider Nano II 660", "EDELKRONE SliderPLUS XL with HeadPLUS",
            "PANTHER U-Bangi", "Green Bull Dolly Slider", "VARAVON SLIDECAM ENG PLUS 1.5m", "VARAVON SLIDECAM EX PLUS",
            "P+S TECHNIK Mini Skater camera dolly", "MATTHEWS Centipede Speed Wheels", "MOVMAX Speedy RICKSHAW", "MATTHEWS Hot Buttons for Doorway Dolly"]),
        (*GRIP, "clamps", "Clamps & Grip Heads", ["MANFROTTO Nano Clamp", "MATTHEWS Matthellini Clamp", "MATTHEWS Mafer Clamp"]),
        (*GRIP, "boxes", "Apple Boxes & Hardware", ["UTOPIA Apple Box 50X30X5", "UTOPIA Apple Box 50X30X10", "UTOPIA Apple Box 50X30X20",
            "UTOPIA Apple Box 50X30X30", "UTOPIA Apple Box 50X30X40", "UTOPIA Sand bag"]),
        (*SOUND, "sound_recorders", "Mixers & Recorders", ["ZOOM F4", "ZOOM H6essential 6", "ZOOM F8"]),
        (*SOUND, "sound_speakers", "Speakers", ["CHIAYO CHALLENGER 1000"]),
    ],
    "different": [
        (*SOUND, "sound_wireless", "Wireless Microphones", [
            'Hollyland LARK MAX Duo 2-Person Wireless Microphone System',
            'Rode Wireless GO II 2-Person',
            'Sony P41D Dual tx wireless neckmic kit',
            'Sony P41D wireless neckmic kit',
            'Sennheiser ew 100 ENG G3 Wireless Microphone Set',
            'Sennheiser EW 112P G4 Wireless Omni Lavalier Microphone Set',
            'Sony URX-P40 UTX-B40 WIRELESS MIC KIT',
            'Sony UTX-B40 Wireless Bodypack Transmitter',
            'Sony Wireless Mic kit',
            'Sennheiser XSW-D Wireless Plug-On Microphone',
            'Sony UWP-D21 Camera-Mount Wireless Omni Lavalier Microphone',
        ]),
    ],
    "fitussi": [
        (*CA, "other", "Other", ["DCODE TS-3", "TENTACLE SYNC TIMECODE GENERATOR"]),
        (*CA, "intercoms", "Intercoms", ["POWER TEC SPK-200 INTERCOM SYSTEM + BELT PACKS"]),
        (*GRIP, "camera_movement", "Dollies & Sliders", [("Heavy Duty Slider 2m", "Heavy Duty סליידר 2 מטר"), "DOORWAY DOLLY MSE", "DANA DOLLY"]),
        (*GRIP, "boxes", "Apple Boxes & Hardware", [("Apple Box 5", "קוב 5"), ("Apple Box 10", "קוב 10"), ("Apple Box 20", "קוב 20"),
            ("Double Apple Box (Jabar)", "קוב ג'אבר"), ("Open Apple Box (Cubico)", "קוב פתוח (קוביקו)")]),
    ],
}


def add_picks(house_id, catalog):
    """The picked items put into a house's catalog: into their category and subcategory, or new ones at the end."""
    cats = [(c, n, [(s, sn, list(items)) for s, sn, items in subs]) for c, n, subs in catalog]
    for cid, cname, sid, sname, items in ADD.get(house_id, []):
        cat = next((c for c in cats if c[0] == cid), None)
        if not cat:
            cat = (cid, cname, []); cats.append(cat)
        sub = next((s for s in cat[2] if s[0] == sid), None)
        if not sub:
            sub = (sid, sname, []); cat[2].append(sub)
        sub[2].extend(items)
    return cats
