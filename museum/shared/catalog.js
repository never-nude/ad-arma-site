function link(label, url) {
  return { label, url };
}

function source(summary, links = [], note = "") {
  return { summary, links, note };
}

function smkSource({ summary, recordUrl, fullUrl, fallbackUrl, note = "" }) {
  const links = [];
  if (recordUrl) links.push(link("Record", recordUrl));
  if (fullUrl) links.push(link("Full STL", fullUrl));
  if (fallbackUrl && fallbackUrl !== fullUrl) links.push(link("Optimized STL", fallbackUrl));
  return source(summary, links, note);
}

function normalizePath(pathname) {
  if (!pathname) return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

const MICHELANGELO_SUBTITLE = "Artist: Michelangelo Buonarroti (1475-1564)";

export const museumSections = [
  {
    id: "antiquity",
    title: "Antiquity",
    subtitle: "Ancient sculpture, copies, and canonical casts"
  },
  {
    id: "early-renaissance",
    title: "Early Renaissance",
    subtitle: "Donatello and the turn toward naturalism"
  },
  {
    id: "michelangelo",
    title: "Michelangelo",
    subtitle: "Michelangelo Buonarroti (1475-1564)"
  },
  {
    id: "bouchardon",
    title: "Bouchardon",
    subtitle: "Edme Bouchardon (1698-1762)"
  },
  {
    id: "rodin",
    title: "Rodin",
    subtitle: "Auguste Rodin (1840-1917)"
  }
];

export const museumPieces = {
  "sphinx": {
    kind: "stl",
    path: "/sphinx/",
    sectionId: "antiquity",
    sortOrder: 10,
    viewerTitle: "Great Sphinx of Giza (c. 2558-2532 BCE)",
    subtitle: "Artist: Unknown Egyptian workshop (lifespan unknown)",
    lobbyMeta: "Source: Internet Archive / Thingiverse mirror",
    source: source(
      "Local STL mirrored from an Internet Archive Thingiverse mirror scan.",
      [
        link("Archive item", "https://archive.org/details/thingiverse-4940233"),
        link("Source ZIP", "https://archive.org/download/thingiverse-4940233/Great_Sphinx_of_Gizagenerated_by_Revopoint_POP_4940233.zip")
      ],
      "License listed on the source item: CC BY-NC-SA 4.0."
    ),
    model: {
      primaryUrl: "./sphinx_source.stl",
      fallbackUrl: "./sphinx_source.stl"
    }
  },
  "charioteer-of-delphi": {
    kind: "sketchfab",
    path: "/charioteer-of-delphi/",
    sectionId: "antiquity",
    sortOrder: 20,
    hiddenFromLobby: true,
    viewerTitle: "Charioteer of Delphi (c. 478-474 BCE)",
    subtitle: "Artist: Unknown Ancient Greek sculptor (lifespan unknown)",
    lobbyMeta: "Source: Sketchfab / Virtual Museums of Malopolska",
    source: source(
      "Sketchfab model published by Virtual Museums of Malopolska.",
      [
        link("Sketchfab model", "https://sketchfab.com/3d-models/charioteer-of-delphi-a-plaster-cast-0d55b629f1334200ab8efa7195e1450f"),
        link("Museum record", "https://muzea.malopolska.pl/en/objects-list/2234")
      ],
      "The source model is listed as CC0 Public Domain."
    ),
    model: {
      uid: "0d55b629f1334200ab8efa7195e1450f",
      triangles: 508203,
      sourceBytes: 66185275
    }
  },
  "venus-de-milo": {
    kind: "stl",
    path: "/venus-de-milo/",
    sectionId: "antiquity",
    sortOrder: 25,
    viewerTitle: "Venus de Milo (late 2nd century BCE)",
    subtitle: "Traditional attribution: Alexandros of Antioch (debated)",
    lobbyMeta: "Source: SMK Open plaster-cast scan (KAS434)",
    source: source(
      "Rendered from SMK's public-domain plaster-cast scan of the Louvre's Venus de Milo.",
      [
        link("SMK API", "https://api.smk.dk/api/v1/art?object_number=KAS434"),
        link("SMK Open record", "https://open.smk.dk/artwork/image/KAS434"),
        link("Full STL", "https://api.smk.dk/api/v1/download-3d/w0892g669_smk-venus-de-milo.stl"),
        link("Optimized STL", "https://api.smk.dk/api/v1/download-3d/h128nk52f_KAS434_small.stl")
      ],
      "Artist attribution follows the traditional Alexandros identification and remains debated."
    ),
    defaults: {
      zoom: 3.35
    },
    model: {
      primaryUrl: "./venus_de_milo_source_small.stl",
      fallbackUrl: "./venus_de_milo_source_small.stl"
    }
  },
  "discobolus": {
    kind: "stl",
    path: "/discobolus/",
    sectionId: "antiquity",
    sortOrder: 27,
    viewerTitle: "Discobolus (Roman copy after Myron, c. 460-450 BCE)",
    subtitle: "Artist: Unknown Roman workshop after Myron of Eleutherae",
    lobbyMeta: "Source: SMK Open plaster-cast scan (KAS1549)",
    source: source(
      "Rendered from SMK's public-domain plaster-cast scan of the Discobolus type with a modern restored head.",
      [
        link("SMK API", "https://api.smk.dk/api/v1/art?object_number=KAS1549"),
        link("SMK Open record", "https://open.smk.dk/artwork/image/KAS1549"),
        link("Full STL", "https://api.smk.dk/api/v1/download-3d/n583z0576_smk-discobolus.stl"),
        link("Optimized STL", "https://api.smk.dk/api/v1/download-3d/ww72bg964_KAS1549_small.stl")
      ],
      "This SMK cast record is the Discobolus variant with a modern restored head."
    ),
    defaults: {
      zoom: 2.95
    },
    model: {
      primaryUrl: "./discobolus_source_small.stl",
      fallbackUrl: "./discobolus_source_small.stl"
    }
  },
  "belvedere-torso": {
    kind: "stl",
    path: "/belvedere-torso/",
    sectionId: "antiquity",
    sortOrder: 28,
    viewerTitle: "Belvedere Torso (1st century BCE)",
    subtitle: "Artist: Unknown Hellenistic sculptor",
    lobbyMeta: "Source: SMK Open plaster-cast scan (KAS402)",
    source: source(
      "Rendered from SMK's public-domain plaster-cast scan of the Belvedere Torso in the Vatican collections.",
      [
        link("SMK API", "https://api.smk.dk/api/v1/art?object_number=KAS402"),
        link("SMK Open record", "https://open.smk.dk/artwork/image/KAS402"),
        link("Full STL", "https://api.smk.dk/api/v1/download-3d/gq67jw94x_smk1-kas402-belvedere-torso.stl"),
        link("Optimized STL", "https://api.smk.dk/api/v1/download-3d/zs25xf26x_KAS402_small.stl")
      ],
      "SMK's cast record identifies the figure as Ajax(?) and notes the missing lower base with signature."
    ),
    defaults: {
      zoom: 2.85
    },
    model: {
      primaryUrl: "./belvedere_torso_source_small.stl",
      fallbackUrl: "./belvedere_torso_source_small.stl"
    }
  },
  "apollo-belvedere": {
    kind: "stl",
    path: "/apollo-belvedere/",
    sectionId: "antiquity",
    sortOrder: 29,
    viewerTitle: "Apollo Belvedere (Roman copy after a Greek original, c. 330 BCE)",
    subtitle: "Artist: Unknown Roman workshop after a classical Greek original",
    lobbyMeta: "Source: SMK Open plaster-cast scan (KAS353)",
    source: source(
      "Rendered from SMK's public-domain plaster-cast scan of the Apollo Belvedere in the Vatican collections.",
      [
        link("SMK API", "https://api.smk.dk/api/v1/art?object_number=KAS353"),
        link("SMK Open record", "https://open.smk.dk/artwork/image/KAS353"),
        link("Full STL", "https://api.smk.dk/api/v1/download-3d/wm117v118_smk-apollo-belvedere.stl"),
        link("Optimized STL", "https://api.smk.dk/api/v1/download-3d/sb397d83g_KAS353_small.stl")
      ],
      "The traditional attribution to Leochares is historical rather than certain."
    ),
    defaults: {
      zoom: 2.9
    },
    model: {
      primaryUrl: "./apollo_belvedere_source_small.stl",
      fallbackUrl: "./apollo_belvedere_source_small.stl"
    }
  },
  "dying-gaul": {
    kind: "stl",
    path: "/dying-gaul/",
    sectionId: "antiquity",
    sortOrder: 30,
    viewerTitle: "Dying Gaul (Roman copy after a Hellenistic original, c. 230-220 BCE)",
    subtitle: "Artist: Unknown Roman workshop after a Hellenistic original",
    lobbyMeta: "Source: SMK Open local mirror (KAS1312)",
    source: source(
      "Viewer uses a local mirrored STL derived from SMK Open's public Dying Gaul / Dying Gladiator scan.",
      [
        link("Record", "https://open.smk.dk/en/artwork/image/KAS1312"),
        link("Full STL", "https://api.smk.dk/api/v1/download-3d/4f16c782s_smk-190-inv-dying-gladiator.stl"),
        link("Optimized STL", "https://api.smk.dk/api/v1/download-3d/5t34sq60f_KAS1312_small.stl")
      ],
      "The ad-arma route now serves a local optimized mirror for reliability."
    ),
    model: {
      primaryUrl: "./dying_gaul_source_small.stl",
      fallbackUrl: "./dying_gaul_source_small.stl"
    },
    view: {
      fallbackLoadingText: "Loading STL sculpture..."
    }
  },
  "ludovisi-gaul": {
    kind: "stl",
    path: "/ludovisi-gaul/",
    sectionId: "antiquity",
    sortOrder: 35,
    viewerTitle: "Ludovisi Gaul (Roman copy after a Hellenistic original, c. 225 BCE)",
    subtitle: "Artist: Unknown Roman workshop after a Hellenistic original",
    lobbyMeta: "Source: SMK Open plaster-cast scan (KAS66)",
    source: source(
      "Rendered from SMK's public-domain plaster-cast scan of the Ludovisi Gaul group, catalogued by SMK as 'Galler draber sin hustru og sig selv, Paetus og Arria'.",
      [
        link("SMK API", "https://api.smk.dk/api/v1/art?object_number=KAS66"),
        link("SMK Open record", "https://open.smk.dk/artwork/image/KAS66"),
        link("Full STL", "https://api.smk.dk/api/v1/download-3d/dn39x612z_105-kas66.stl"),
        link("Optimized STL", "https://api.smk.dk/api/v1/download-3d/d217qv67s_KAS66_small.stl")
      ],
      "The Ludovisi Gaul title is the modern identification; SMK's historical cast record also preserves the older Paetus and Arria naming."
    ),
    defaults: {
      zoom: 3.75
    },
    model: {
      primaryUrl: "./ludovisi_gaul_source_small.stl",
      fallbackUrl: "./ludovisi_gaul_source_small.stl"
    },
    scene: {
      rotateX: 0
    }
  },
  "capitoline-venus": {
    kind: "stl",
    path: "/capitoline-venus/",
    sectionId: "antiquity",
    sortOrder: 36,
    viewerTitle: "Capitoline Venus (Roman copy after a Hellenistic original, c. 2nd century BCE)",
    subtitle: "Artist: Unknown Roman workshop after a Hellenistic original",
    lobbyMeta: "Source: SMK Open plaster-cast scan (KAS493)",
    source: source(
      "Rendered from SMK's public-domain plaster-cast scan of the Capitoline Venus in the Capitoline Museums.",
      [
        link("SMK API", "https://api.smk.dk/api/v1/art?object_number=KAS493"),
        link("SMK Open record", "https://open.smk.dk/artwork/image/KAS493"),
        link("Full STL", "https://api.smk.dk/api/v1/download-3d/ff365988b_smk33-kas493-capitoline-venus-decimated.stl"),
        link("Optimized STL", "https://api.smk.dk/api/v1/download-3d/pz50h153z_KAS493_small.stl")
      ],
      "SMK's cast record identifies this as the Capitoline Venus type, a Roman copy after a Hellenistic Greek original."
    ),
    defaults: {
      zoom: 3.2
    },
    model: {
      primaryUrl: "./capitoline_venus_source_small.stl",
      fallbackUrl: "./capitoline_venus_source_small.stl"
    }
  },
  "laocoon": {
    kind: "stl",
    path: "/laocoon/",
    sectionId: "antiquity",
    sortOrder: 40,
    viewerTitle: "Laocoon and His Sons (c. 40-20 BCE)",
    subtitle: "Traditional attribution: Hagesandros, Polydoros, and Athanodoros of Rhodes",
    lobbyMeta: "Source: SMK Open plaster-cast scan",
    source: source(
      "Rendered from SMK's public-domain plaster-cast scan after the Vatican group.",
      [
        link("SMK API", "https://api.smk.dk/api/v1/art?object_number=KAS385"),
        link("SMK Open record", "https://open.smk.dk/en/artwork/image/KAS385")
      ],
      "Artist attribution is traditional rather than certain."
    ),
    defaults: {
      zoom: 3.9
    },
    model: {
      primaryUrl: "./laocoon_source_small.stl",
      fallbackUrl: "./laocoon_source_small.stl"
    }
  },
  "augustus-of-prima-porta": {
    kind: "stl",
    path: "/augustus-of-prima-porta/",
    sectionId: "antiquity",
    sortOrder: 50,
    viewerTitle: "Augustus of Prima Porta (early 1st century CE)",
    subtitle: "Artist: Unknown Roman workshop (lifespan unknown)",
    lobbyMeta: "Source: Internet Archive / Thingiverse mirror",
    source: source(
      "Local STL mirrored from an Internet Archive Thingiverse mirror.",
      [
        link("Archive item", "https://archive.org/details/thingiverse-4973766"),
        link("Source ZIP", "https://archive.org/download/thingiverse-4973766/Augustus_of_Prima_Porta_4973766.zip")
      ],
      "License listed on the source item: CC BY 4.0."
    ),
    model: {
      primaryUrl: "./augustus_of_prima_porta_source.stl",
      fallbackUrl: "./augustus_of_prima_porta_source.stl"
    },
    scene: {
      rotateX: 0
    }
  },
  "donatello-saint-george": {
    kind: "sketchfab",
    path: "/donatello/saint-george/",
    sectionId: "early-renaissance",
    sortOrder: 10,
    hiddenFromLobby: true,
    viewerTitle: "Saint George (c. 1415-1417)",
    subtitle: "Artist: Donatello (c. 1386-1466)",
    lobbyMeta: "Source: Sketchfab model",
    source: source(
      "Sketchfab model used in the ad-arma museum viewer pipeline.",
      [
        link("Sketchfab model", "https://sketchfab.com/3d-models/saint-george-donatellosan-jorge-b637727d39544f6d998ab996ded86f0c")
      ],
      "Viewer uses the published model UID b637727d39544f6d998ab996ded86f0c."
    ),
    defaults: {
      zoom: 1.95,
      lightPower: 2.55,
      exposure: 0.62,
      rough: 0.64
    },
    model: {
      uid: "b637727d39544f6d998ab996ded86f0c",
      triangles: 2000012,
      sourceBytes: 100000824
    }
  },
  "michelangelo-battle-of-the-centaurs": {
    kind: "stl",
    path: "/michelangelo/battle-of-the-centaurs/",
    sectionId: "michelangelo",
    sortOrder: 10,
    viewerTitle: "Battle of the Centaurs (c. 1490-1492)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "Viewer uses SMK Open's Battle of the Centaurs scan, mirrored locally for reliable loading.",
      recordUrl: "https://open.smk.dk/en/artwork/image/KAS455",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/h415pg24h_smk-kas455-battle-of-the-centaurs.stl",
      note: "This route serves a local mirrored STL in the viewer."
    }),
    model: {
      primaryUrl: "./battle_of_the_centaurs_source.stl"
    }
  },
  "michelangelo-bacchus": {
    kind: "stl",
    path: "/michelangelo/bacchus/",
    sectionId: "michelangelo",
    sortOrder: 20,
    viewerTitle: "Bacchus (1496-1497)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "Viewer uses an SMK Open Bacchus STL mirrored locally in this route.",
      recordUrl: "https://open.smk.dk/en/artwork/image/KAS83",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/r207tt71x_142-inv-83-bacchus.stl"
    }),
    model: {
      primaryUrl: "./bacchus_source.stl",
      fallbackUrl: "./bacchus_source.stl"
    }
  },
  "michelangelo-pieta": {
    kind: "stl",
    path: "/michelangelo/pieta/",
    sectionId: "michelangelo",
    sortOrder: 30,
    viewerTitle: "Pieta (1497-1500)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Michelangelo's Pieta.",
      recordUrl: "https://open.smk.dk/en/artwork/image/KAS115",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/3197xr938_smk16-kas115-pieta-michelangelo.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/4m90f1143_KAS115_small.stl"
    }),
    model: {
      primaryUrl: "./pieta_source.stl",
      fallbackUrl: "./pieta_source_small.stl"
    }
  },
  "michelangelo-david": {
    kind: "stl",
    path: "/michelangelo/david/",
    sectionId: "michelangelo",
    sortOrder: 40,
    viewerTitle: "David (1501-1504)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: local mirrored STL; Accademia reference",
    source: source(
      "This route currently uses a mirrored local STL for the viewer.",
      [
        link("Galleria dell'Accademia reference", "https://www.galleriaaccademiafirenze.it/opere/david-michelangelo/")
      ],
      "The exact public mesh source for the mirrored STL has not yet been reattached in the museum catalog."
    ),
    defaults: {
      zoom: 2.7
    },
    model: {
      primaryUrl: "./david_source.stl",
      fallbackUrl: "./david_source.stl"
    },
    scene: {
      targetHeight: 1.82
    }
  },
  "michelangelo-bruges-madonna": {
    kind: "stl",
    path: "/michelangelo/bruges-madonna/",
    sectionId: "michelangelo",
    sortOrder: 50,
    viewerTitle: "Bruges Madonna (1501-1504)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Bruges Madonna.",
      recordUrl: "https://open.smk.dk/en/artwork/image/KAS225",
      fullUrl: "https://open.smk.dk/artwork/image/st74cw417_smk21-kas225-bruges-madonna.stl",
      fallbackUrl: "https://open.smk.dk/artwork/image/h128nk494_KAS225_small.stl"
    }),
    model: {
      primaryUrl: "./bruges_madonna_source.stl",
      fallbackUrl: "./bruges_madonna_source_small.stl"
    }
  },
  "michelangelo-tondo-pitti": {
    kind: "stl",
    path: "/michelangelo/tondo-pitti/",
    sectionId: "michelangelo",
    sortOrder: 60,
    viewerTitle: "Tondo Pitti (c. 1503-1505)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Tondo Pitti.",
      recordUrl: "https://open.smk.dk/en/artwork/image/KAS2202",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/n296x4001_smk46-kas2202-madonna-pitti.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/zc77sv67x_KAS2202_small.stl",
      note: "This route starts from the optimized local mirror for reliability."
    }),
    model: {
      primaryUrl: "https://api.smk.dk/api/v1/download-3d/n296x4001_smk46-kas2202-madonna-pitti.stl",
      fallbackUrl: "./tondo_pitti_source_small.stl"
    },
    timeouts: {
      primaryMs: 60000,
      fallbackMs: 60000
    },
    scene: {
      rotateX: 0
    }
  },
  "michelangelo-tondo-taddei": {
    kind: "stl",
    path: "/michelangelo/tondo-taddei/",
    sectionId: "michelangelo",
    sortOrder: 70,
    viewerTitle: "Tondo Taddei (c. 1504-1506)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Tondo Taddei.",
      recordUrl: "https://open.smk.dk/en/artwork/image/KAS85",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/th83m3943_smk31-kas85-taddei-tondo.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/h702qc06t_KAS85_small.stl",
      note: "This route starts from the optimized local mirror for reliability."
    }),
    model: {
      primaryUrl: "https://api.smk.dk/api/v1/download-3d/th83m3943_smk31-kas85-taddei-tondo.stl",
      fallbackUrl: "./tondo_taddei_source_small.stl"
    },
    timeouts: {
      primaryMs: 60000,
      fallbackMs: 60000
    },
    scene: {
      rotateX: 0
    }
  },
  "michelangelo-moses": {
    kind: "stl",
    path: "/michelangelo/moses/",
    sectionId: "michelangelo",
    sortOrder: 80,
    viewerTitle: "Moses (1513-1515)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Moses.",
      recordUrl: "https://open.smk.dk/en/artwork/image/KAS243",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/m900p022q_154-smk-inv-243-moses.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/pr76f835r_KAS243_small.stl",
      note: "The current viewer starts from the local optimized STL for reliability."
    }),
    model: {
      primaryUrl: "./moses_source.stl",
      fallbackUrl: "./moses_source_small.stl"
    },
    timeouts: {
      primaryMs: 60000,
      fallbackMs: 60000
    }
  },
  "michelangelo-dying-slave": {
    kind: "stl",
    path: "/michelangelo/dying-slave/",
    sectionId: "michelangelo",
    sortOrder: 90,
    viewerTitle: "Dying Slave (1513-1516)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Dying Slave.",
      recordUrl: "https://open.smk.dk/en/artwork/image/KAS87",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/6969z5201_the-dying-slave.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/dv13zz66c_KAS87_small.stl"
    }),
    model: {
      primaryUrl: "./dying_slave_source.stl",
      fallbackUrl: "./dying_slave_source_small.stl"
    }
  },
  "michelangelo-rebellious-slave": {
    kind: "stl",
    path: "/michelangelo/rebellious-slave/",
    sectionId: "michelangelo",
    sortOrder: 100,
    viewerTitle: "Rebellious Slave (1513-1516)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Rebellious Slave.",
      recordUrl: "https://open.smk.dk/en/artwork/image/KAS86",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/dr26z301p_140-smk-inv-86-den-operprske-slave.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/1544bt98d_KAS86_small.stl"
    }),
    model: {
      primaryUrl: "./rebellious_slave_source.stl",
      fallbackUrl: "./rebellious_slave_source_small.stl"
    }
  },
  "michelangelo-prisoner": {
    kind: "stl",
    path: "/michelangelo/prisoner/",
    sectionId: "michelangelo",
    sortOrder: 110,
    viewerTitle: "Prisoner (c. 1519)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Prisoner / Young Slave.",
      recordUrl: "https://open.smk.dk/en/artwork/image/KAS2360",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/d791sm646_138-michelangelo-young-slave-kas-2360.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/8p58pj78x_KAS2360_small.stl"
    }),
    model: {
      primaryUrl: "./prisoner_source.stl",
      fallbackUrl: "./prisoner_source_small.stl"
    }
  },
  "michelangelo-medici-madonna": {
    kind: "stl",
    path: "/michelangelo/medici-madonna/",
    sectionId: "michelangelo",
    sortOrder: 120,
    viewerTitle: "Medici Madonna (c. 1521-1534)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Medici Madonna.",
      recordUrl: "https://open.smk.dk/en/artwork/image/KAS114",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/x633f5719_smk-kas114-medici-madonna.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/z029p939x_KAS114_small.stl"
    }),
    model: {
      primaryUrl: "https://api.smk.dk/api/v1/download-3d/x633f5719_smk-kas114-medici-madonna.stl",
      fallbackUrl: "./medici_madonna_source_small.stl"
    }
  },
  "michelangelo-dawn": {
    kind: "stl",
    path: "/michelangelo/dawn/",
    sectionId: "michelangelo",
    sortOrder: 130,
    viewerTitle: "Dawn (1524-1531)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Dawn (KAS113/3).",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/k643b617z_smk-kas113-3-allegory-of-dawn.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/rx913v89s_KAS113-3_small.stl"
    }),
    model: {
      primaryUrl: "https://api.smk.dk/api/v1/download-3d/k643b617z_smk-kas113-3-allegory-of-dawn.stl",
      fallbackUrl: "./dawn_source_small.stl"
    },
    scene: {
      rotateX: 0,
      defaultYaw: Math.PI * 0.5
    }
  },
  "michelangelo-dusk": {
    kind: "stl",
    path: "/michelangelo/dusk/",
    sectionId: "michelangelo",
    sortOrder: 140,
    viewerTitle: "Dusk (1524-1531)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Dusk (KAS113/2).",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/3n204405h_smk-kas113-2-allegory-of-dusk.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/8c97kv91g_KAS113-2_small.stl"
    }),
    model: {
      primaryUrl: "https://api.smk.dk/api/v1/download-3d/3n204405h_smk-kas113-2-allegory-of-dusk.stl",
      fallbackUrl: "./dusk_source_small.stl"
    }
  },
  "michelangelo-night": {
    kind: "stl",
    path: "/michelangelo/night/",
    sectionId: "michelangelo",
    sortOrder: 150,
    viewerTitle: "Night (Notte) (1526-1531)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Night (KAS112/2).",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/mg74qr55m_smk-kas112-2-night.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/kw52jd84f_KAS112-2_small.stl"
    }),
    model: {
      primaryUrl: "https://api.smk.dk/api/v1/download-3d/mg74qr55m_smk-kas112-2-night.stl",
      fallbackUrl: "./night_source_small.stl"
    },
    scene: {
      defaultYaw: Math.PI
    }
  },
  "michelangelo-day": {
    kind: "sketchfab",
    path: "/michelangelo/day/",
    sectionId: "michelangelo",
    sortOrder: 160,
    viewerTitle: "Day (1526-1531)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: Sketchfab / Rmn-Grand Palais",
    source: source(
      "Sketchfab model published by Rmn-Grand Palais.",
      [
        link("Sketchfab model", "https://sketchfab.com/3d-models/le-jour-the-day-michelangelo-50a615fd366a463e8449ff942302f6e4")
      ]
    ),
    model: {
      uid: "50a615fd366a463e8449ff942302f6e4",
      triangles: 500000,
      sourceBytes: 3544546
    }
  },
  "michelangelo-giuliano-duke-of-nemours": {
    kind: "stl",
    path: "/michelangelo/giuliano-duke-of-nemours/",
    sectionId: "michelangelo",
    sortOrder: 170,
    viewerTitle: "Giuliano, Duke of Nemours (1526-1534)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Giuliano, Duke of Nemours (KAS112/1).",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/dn39x6162_smk-kas112-1-guiliano-de-medici-decimated.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/td96k687f_KAS112-1_small.stl"
    }),
    model: {
      primaryUrl: "https://api.smk.dk/api/v1/download-3d/dn39x6162_smk-kas112-1-guiliano-de-medici-decimated.stl",
      fallbackUrl: "./giuliano_source_small.stl"
    },
    scene: {
      rotateX: 0
    }
  },
  "michelangelo-lorenzo-duke-of-urbino": {
    kind: "stl",
    path: "/michelangelo/lorenzo-duke-of-urbino/",
    sectionId: "michelangelo",
    sortOrder: 180,
    viewerTitle: "Lorenzo, Duke of Urbino (1526-1534)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Lorenzo, Duke of Urbino (KAS113/1).",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/df65vd372_smk-kas113-1-lorenzo-de-medici-decimated.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/8p58pj77n_KAS113-1_small.stl"
    }),
    model: {
      primaryUrl: "https://api.smk.dk/api/v1/download-3d/df65vd372_smk-kas113-1-lorenzo-de-medici-decimated.stl",
      fallbackUrl: "./lorenzo_source_small.stl"
    },
    scene: {
      rotateX: 0
    }
  },
  "michelangelo-brutus": {
    kind: "stl",
    path: "/michelangelo/brutus/",
    sectionId: "michelangelo",
    sortOrder: 190,
    viewerTitle: "Brutus (c. 1540-1548)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Brutus.",
      recordUrl: "https://open.smk.dk/en/artwork/image/KAS105",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/pz50h1458_smk-kas105-brutus.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/df65vd436_KAS105_small.stl"
    }),
    model: {
      primaryUrl: "https://api.smk.dk/api/v1/download-3d/pz50h1458_smk-kas105-brutus.stl",
      fallbackUrl: "./brutus_source_small.stl"
    }
  },
  "michelangelo-rondanini-pieta": {
    kind: "stl",
    path: "/michelangelo/rondanini-pieta/",
    sectionId: "michelangelo",
    sortOrder: 200,
    viewerTitle: "Rondanini Pieta (c. 1553-1564)",
    subtitle: MICHELANGELO_SUBTITLE,
    lobbyMeta: "Source: SMK Open",
    source: smkSource({
      summary: "SMK Open source mesh for Rondanini Pieta.",
      recordUrl: "https://open.smk.dk/en/artwork/image/KAS2361",
      fullUrl: "https://api.smk.dk/api/v1/download-3d/0z709169b_smk-kas2361-rondanini-pieta.stl",
      fallbackUrl: "https://api.smk.dk/api/v1/download-3d/bn999c493_KAS2361_small.stl"
    }),
    model: {
      primaryUrl: "https://api.smk.dk/api/v1/download-3d/0z709169b_smk-kas2361-rondanini-pieta.stl",
      fallbackUrl: "./rondanini_pieta_source_small.stl"
    }
  },
  "bouchardon-cupid": {
    kind: "stl",
    path: "/bouchardon/cupid/",
    sectionId: "bouchardon",
    sortOrder: 10,
    viewerTitle: "Cupid Cutting His Bow from the Club of Hercules (c. 1747-1750)",
    subtitle: "Artist: Edme Bouchardon (1698-1762)",
    lobbyMeta: "Source: local mirrored STL; Louvre reference",
    source: source(
      "This route currently uses a mirrored local STL of Bouchardon's sculpture.",
      [
        link("Louvre work reference", "https://collections.louvre.fr/en/ark:/53355/cl010091965")
      ],
      "The exact public mesh source for the mirrored STL predates this audit and is still being reconciled."
    ),
    defaults: {
      zoom: 2.7
    },
    model: {
      primaryUrl: "./cupid_source.stl",
      fallbackUrl: "./cupid_source.stl"
    },
    scene: {
      targetHeight: 1.72
    }
  },
  "rodin-the-thinker": {
    kind: "stl",
    path: "/rodin/the-thinker/",
    sectionId: "rodin",
    sortOrder: 10,
    viewerTitle: "The Thinker (1880-1904)",
    subtitle: "Artist: Auguste Rodin (1840-1917)",
    lobbyMeta: "Source: Wikimedia Commons / Scan the World",
    source: source(
      "Local STL mirrored from the Scan the World file published on Wikimedia Commons.",
      [
        link("File page", "https://commons.wikimedia.org/wiki/File:Scan_the_World_-_The_Thinker_(Auguste_Rodin).stl"),
        link("Direct STL", "https://upload.wikimedia.org/wikipedia/commons/e/e2/Scan_the_World_-_The_Thinker_%28Auguste_Rodin%29.stl")
      ],
      "License listed on the source file page: CC BY-SA 4.0."
    ),
    defaults: {
      zoom: 3.15,
      lightAngle: 28,
      lightPower: 2.35,
      exposure: 0.48,
      rough: 0.46
    },
    model: {
      primaryUrl: "./thinker_source.stl",
      fallbackUrl: "./thinker_source.stl"
    },
    timeouts: {
      primaryMs: 60000,
      fallbackMs: 60000
    },
    material: {
      color: "#8c6338",
      metalness: 0.82,
      clearcoat: 0.06,
      clearcoatRoughness: 0.48,
      sheen: 0.0,
      sheenRoughness: 1.0,
      sheenColor: "#000000",
      reflectivity: 0.82
    }
  }
};

function sectionItems(sectionId) {
  return Object.entries(museumPieces)
    .filter(([, piece]) => piece.sectionId === sectionId && !piece.hiddenFromLobby)
    .sort(([, a], [, b]) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return (a.viewerTitle || "").localeCompare(b.viewerTitle || "");
    })
    .map(([pieceId]) => pieceId);
}

export const museumLobby = {
  pageTitle: "Museum Lobby",
  title: "Museum Lobby",
  subtitle: "Sculpture and 3D works from antiquity through the nineteenth century. Each piece page now carries a shared viewer shell plus source and attribution notes.",
  sections: museumSections
    .map((section) => ({
      title: section.title,
      subtitle: section.subtitle,
      items: sectionItems(section.id)
    }))
    .filter((section) => section.items.length > 0)
};

export const museumRouteMap = Object.fromEntries(
  Object.entries(museumPieces).map(([pieceId, piece]) => [normalizePath(piece.path), pieceId])
);
