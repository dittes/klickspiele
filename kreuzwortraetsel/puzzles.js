/**
 * puzzles.js — Kreuzworträtsel Puzzle Library v1.0
 * Enthält: Wortdatenbank · Generator · Tagesrätsel · Kategorie-Filter
 * Muss VOR game.js geladen werden.
 */

const PuzzleDB = (() => {
  'use strict';

  /* ─────────────────────────────────────────────
     SEEDED PRNG  (LCG — reproduzierbar per Seed)
  ───────────────────────────────────────────── */
  function mkRng(seed) {
    let s = (seed ^ 0xDEADBEEF) >>> 0;
    return () => {
      s = Math.imul(1664525, s) + 1013904223 >>> 0;
      return s / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ─────────────────────────────────────────────
     WORTDATENBANK  (8 Kategorien · ~30 Wörter je)
     Format: [ANTWORT, Hinweis]
  ───────────────────────────────────────────── */
  const CATEGORIES = {

    tiere: {
      label: 'Tiere', icon: '🐾',
      words: [
        ['ADLER',    'Majestätischer Greifvogel, deutsches Wappentier'],
        ['BIBER',    'Nager, der Staudämme baut'],
        ['DACHS',    'Schwarzweißer Waldbewohner'],
        ['ELCH',     'Größte Hirschart Europas'],
        ['FALKE',    'Schneller Greifvogel mit spitzen Flügeln'],
        ['FUCHS',    'Schlaues Raubtier mit rotem Fell'],
        ['GEIER',    'Aasfressender Greifvogel der Tropen'],
        ['HAMSTER',  'Kleines Nagetier mit Backentaschen'],
        ['IGEL',     'Stachliges Säugetier der Nacht'],
        ['JAGUAR',   'Gefleckte Großkatze Südamerikas'],
        ['KAMEL',    'Wüstentier mit Höcker'],
        ['LUCHS',    'Scheue Raubkatze mit Pinselohren'],
        ['MARDER',   'Schlankes Raubtier des Waldes'],
        ['OTTER',    'Wassermarder an Flüssen und Seen'],
        ['PANDA',    'Schwarz-weißer Bambusfresser'],
        ['RABE',     'Intelligenter schwarzer Vogel'],
        ['SCHWAN',   'Eleganter weißer Wasservogel'],
        ['TIGER',    'Gestreifter Großkatze Asiens'],
        ['WOLF',     'Wildlebender Vorfahre des Hundes'],
        ['ZEBRA',    'Gestreiftes Tier der afrikanischen Savanne'],
        ['AMEISE',   'Kleine fleißige Insektenkolonie'],
        ['BIENE',    'Fliegende Honigproduzentin'],
        ['ELEFANT',  'Größtes Landsäugetier mit Rüssel'],
        ['GIRAFFE',  'Langhalsiges Tier der Savanne'],
        ['HASE',     'Langohriges schnelles Fluchttier'],
        ['KATZE',    'Schnurrendes Haustier mit Schnurrhaaren'],
        ['MAUS',     'Kleines Nagetier mit langem Schwanz'],
        ['PFERD',    'Reittier mit Hufen und Mähne'],
        ['STORCH',   'Zugvogel, der in Dächern nistet'],
        ['WESPE',    'Gestreifte stechende Insektin'],
      ]
    },

    natur: {
      label: 'Natur', icon: '🌿',
      words: [
        ['BACH',     'Kleines fließendes Gewässer'],
        ['BUCHE',    'Heimischer Laubbaum mit glatter grauer Rinde'],
        ['DELTA',    'Fächerförmiges Flussmündungsgebiet'],
        ['EICHE',    'Majestätischer Laubbaum mit Eicheln'],
        ['FELS',     'Massives Gesteinsgebilde in der Natur'],
        ['FICHTE',   'Immergrüner Nadelbaum mit hängenden Zapfen'],
        ['GLUT',     'Heiße glimmende Reste eines Feuers'],
        ['HEIDE',    'Offene Landschaft mit Heidekraut'],
        ['INSEL',    'Von Wasser umgebenes Landstück'],
        ['KIEFER',   'Nadelbaum mit langen Nadeln in Paaren'],
        ['LAUB',     'Blätter der Laubbäume im Herbst'],
        ['MOOR',     'Feuchtes Torfgebiet mit typischen Pflanzen'],
        ['NEBEL',    'Dichter Wasserdampf nahe der Erde'],
        ['OASE',     'Wasserstelle mit Vegetation in der Wüste'],
        ['QUELLE',   'Ursprungsort eines Flusses'],
        ['REGEN',    'Niederschlag in Wassertropfenform'],
        ['SCHNEE',   'Gefrorener Niederschlag in Flockenform'],
        ['SUMPF',    'Nasses morastiges Gelände mit Schilf'],
        ['TANNE',    'Nadelbaum ohne hängende Zapfen'],
        ['WALD',     'Ausgedehntes Gebiet mit Bäumen'],
        ['WELLE',    'Erhebung auf der Wasseroberfläche'],
        ['WIESE',    'Offene blumenreiche Grasfläche'],
        ['BIRKE',    'Laubbaum mit weißer Rinde'],
        ['GRANIT',   'Hartes kristallines Tiefengestein'],
        ['STURM',    'Starker Wind mit Böen'],
        ['FROST',    'Temperaturen unter dem Gefrierpunkt'],
        ['HUMUS',    'Organischer nährstoffreicher Bodenteil'],
        ['LAVA',     'Geschmolzenes Gestein aus Vulkanen'],
        ['SAND',     'Feinkörniges Gesteinsgemisch am Strand'],
        ['STEIN',    'Hartes mineralisches Gebilde'],
      ]
    },

    essen: {
      label: 'Essen & Trinken', icon: '🍽️',
      words: [
        ['APFEL',    'Rundes rotes oder grünes Kernobst'],
        ['BIRNE',    'Bauchiges gelbes Kernobst'],
        ['BROT',     'Gebackenes Grundnahrungsmittel aus Mehl'],
        ['BUTTER',   'Fettreiches Streichprodukt aus Milch'],
        ['HAFER',    'Getreideart für Müsli und Porridge'],
        ['HONIG',    'Süßes Bienenprodukt aus Nektar'],
        ['JOGHURT',  'Dickflüssiges fermentiertes Milcherzeugnis'],
        ['KAFFEE',   'Heißes koffeinreiches Aufgussgetränk'],
        ['LINSE',    'Kleine runde braune Hülsenfrucht'],
        ['MEHL',     'Gemahlenes Getreide zum Backen'],
        ['NUDEL',    'Aus Teig geformte Beilage'],
        ['PFEFFER',  'Scharfes Gewürz aus getrockneten Beeren'],
        ['QUARK',    'Frischer weißer Weichkäse'],
        ['SAHNE',    'Fettreicher Rahm der Milch'],
        ['SALZ',     'Wichtigstes Würzmittel der Küche'],
        ['SENF',     'Würzige scharfe gelbe Paste'],
        ['TOMATE',   'Rote saftige Frucht für Salat und Sauce'],
        ['WEIN',     'Alkoholisches Getränk aus fermentierten Trauben'],
        ['ZUCKER',   'Süßendes weißes Kristallpulver'],
        ['PILZ',     'Waldfund für die Pfanne oder Suppe'],
        ['LACHS',    'Rosa Speisefisch aus kalten Gewässern'],
        ['THUNFISCH','Großer Meeresfisch in der Dose'],
        ['BASILIKUM','Aromatisches Gewürzkraut für Pizza'],
        ['KNOBLAUCH','Scharfe Knolle als Würzmittel'],
        ['ROSMARIN', 'Aromatisches mediterranes Nadelkraut'],
        ['ESSIG',    'Saure Würzflüssigkeit aus Vergärung'],
        ['SIRUP',    'Dickflüssige zuckersüße Flüssigkeit'],
        ['VANILLE',  'Aromatische Gewürzschote für Desserts'],
        ['ZIMT',     'Süßes braunes Gewürz aus Baumrinde'],
        ['INGWER',   'Scharfe aromatische Wurzel als Gewürz'],
      ]
    },

    sport: {
      label: 'Sport', icon: '⚽',
      words: [
        ['BOXEN',    'Kampfsport mit Fäusten und Handschuhen'],
        ['FECHTEN',  'Eleganter Kampfsport mit Klingen'],
        ['GOLF',     'Präzisionssport mit Schläger und kleinem Loch'],
        ['JUDO',     'Japanische Kampfkunst mit Würfen'],
        ['KARATE',   'Japanische Kampfkunst mit Schlägen'],
        ['KLETTERN', 'Aufsteigen an Fels oder Kletterwand'],
        ['POLO',     'Eleganter Reitsport mit Schlägern'],
        ['RADELN',   'Sportliche Fortbewegung auf dem Fahrrad'],
        ['RUDERN',   'Wassersport mit Riemen im Boot'],
        ['SEGELN',   'Fahren mit Windkraft auf dem Wasser'],
        ['SURFEN',   'Reiten auf Wellen mit einem Brett'],
        ['TAUCHEN',  'Unterwassersport mit Ausrüstung'],
        ['TENNIS',   'Rückschlagsport mit Racket und Netz'],
        ['TURNEN',   'Geräteakrobatik und Bodenturnen'],
        ['ANGELN',   'Entspanntes Fischfangen mit der Rute'],
        ['LAUFEN',   'Ausdauersportliche Fortbewegung'],
        ['SPURT',    'Kurze maximale Beschleunigung'],
        ['WETTKAMPF','Sportlicher Vergleich zwischen Teilnehmern'],
        ['ATHLET',   'Sportler mit körperlicher Hochleistung'],
        ['POKAL',    'Siegertrophäe in Schalenform'],
        ['SPRINT',   'Kurze schnelle Laufdistanz'],
        ['TRAINER',  'Coach und Betreuer von Sportlern'],
        ['AUSDAUER', 'Fähigkeit, körperliche Belastung lange zu ertragen'],
        ['DRIBBLE',  'Individuelles Führen des Balls'],
        ['FLANKE',   'Flacher Pass von der Seite ins Zentrum'],
      ]
    },

    geografie: {
      label: 'Geografie', icon: '🌍',
      words: [
        ['BERLIN',   'Hauptstadt und größte Stadt Deutschlands'],
        ['CHINA',    'Bevölkerungsreichstes Land der Erde'],
        ['DONAU',    'Zweitlängster Fluss Europas'],
        ['ELBE',     'Fluss durch Hamburg in die Nordsee'],
        ['GENF',     'Schweizer Stadt am gleichnamigen See'],
        ['INDIEN',   'Subkontinent in Südasien'],
        ['JAPAN',    'Inselstaat im westlichen Pazifik'],
        ['KENIA',    'Ostafrikanischer Staat am Äquator'],
        ['LONDON',   'Hauptstadt des Vereinigten Königreichs'],
        ['MADRID',   'Hauptstadt und größte Stadt Spaniens'],
        ['NIL',      'Längster Fluss Afrikas'],
        ['OSLO',     'Hauptstadt und größte Stadt Norwegens'],
        ['PARIS',    'Hauptstadt Frankreichs an der Seine'],
        ['RHEIN',    'Wichtigster Schifffahrtsweg Deutschlands'],
        ['ROM',      'Ewige Stadt, Hauptstadt Italiens'],
        ['SAHARA',   'Größte Hitzewüste der Welt in Nordafrika'],
        ['TOKIO',    'Hauptstadt und Megastadt Japans'],
        ['WIEN',     'Hauptstadt Österreichs an der Donau'],
        ['KAIRO',    'Hauptstadt Ägyptens am Nil'],
        ['MEXIKO',   'Lateinamerikanisches Land südlich der USA'],
        ['THAMES',   'Fluss durch London'],
        ['ALPEN',    'Höchstes Gebirge Mitteleuropas'],
        ['AMAZON',   'Längster und wasserreichster Fluss der Welt'],
        ['KOREA',    'Geteilte Halbinsel in Ostasien'],
        ['KUBA',     'Karibische Insel vor Florida'],
        ['TIBER',    'Fluss durch Rom'],
        ['VOLGA',    'Längster Fluss Europas in Russland'],
        ['LIMA',     'Hauptstadt Perus an der Pazifikküste'],
        ['OSLO',     'Hauptstadt Norwegens am Oslofjord'],
        ['NEPAL',    'Himalaya-Staat mit dem Mount Everest'],
      ]
    },

    alltag: {
      label: 'Alltag', icon: '🏠',
      words: [
        ['AMPEL',    'Verkehrsregelnde Lichtanlage'],
        ['BESEN',    'Reinigungsgerät mit Borsten und langem Stiel'],
        ['BRIEF',    'Schriftstück in einem Briefumschlag'],
        ['DECKE',    'Oberer Raumabschluss oder Wolldecke'],
        ['FENSTER',  'Glasöffnung in der Hauswand'],
        ['GABEL',    'Besteck zum Aufspießen und Essen'],
        ['HAMMER',   'Werkzeug zum Einschlagen von Nägeln'],
        ['JACKE',    'Kurzes Oberbekleidungsstück'],
        ['KISSEN',   'Weiches Polster zum Schlafen'],
        ['KOFFER',   'Hartschalenbehälter für Reisegepäck'],
        ['LAMPE',    'Elektrisches Leuchtgerät'],
        ['MESSER',   'Schneidewerkzeug mit Klinge und Griff'],
        ['NADEL',    'Spitzes dünnes Nähinstrument'],
        ['OFEN',     'Heiz- oder Backgerät'],
        ['SPIEGEL',  'Reflektierende Glasoberfläche'],
        ['STECKER',  'Elektrischer Verbindungsstecker'],
        ['TISCH',    'Möbelstück mit flacher Oberfläche'],
        ['TREPPE',   'Stufenförmige Verbindung zwischen Etagen'],
        ['VASE',     'Elegantes Gefäß für Schnittblumen'],
        ['WECKER',   'Uhr mit einstellbarem Alarmsignal'],
        ['PFLASTER', 'Wundverband aus Klebeband'],
        ['SCHRANK',  'Möbelstück zur Aufbewahrung von Kleidung'],
        ['SCHLOSS',  'Sicherungsvorrichtung an Türen oder Burg'],
        ['BETT',     'Schlafmöbel mit Matratze'],
        ['STUHL',    'Sitzmöbel mit Lehne für eine Person'],
        ['SOFA',     'Gepolstertes Sitzsofa im Wohnzimmer'],
        ['TEPPICH',  'Bodenbelag aus textilem Material'],
        ['GARDINE',  'Leichter Vorhang aus Stoff'],
        ['KÜCHE',    'Raum zum Kochen und Zubereiten von Speisen'],
        ['KELLER',   'Unterirdischer Raum eines Hauses'],
      ]
    },

    musik: {
      label: 'Musik', icon: '🎵',
      words: [
        ['BASS',     'Tiefste Stimmlage oder tiefes Instrument'],
        ['CHOR',     'Gruppe mehrerer gemeinsam singender Personen'],
        ['GEIGE',    'Klassisches Streichinstrument mit vier Saiten'],
        ['HARFE',    'Großes Zupfinstrument mit vielen Saiten'],
        ['JAZZ',     'Aus Amerika stammende Improvisa­tionsmusik'],
        ['KLANG',    'Wahrgenommener Ton oder Geräusch'],
        ['LAUTE',    'Historisches birnenförmiges Zupfinstrument'],
        ['MELODIE',  'Folge von Tönen zu einer musikalischen Linie'],
        ['NOTE',     'Schriftliches Symbol für musikalischen Ton'],
        ['PAUSE',    'Stille zwischen Tönen in der Musik'],
        ['TAKT',     'Rhythmische Grundeinheit der Musik'],
        ['WALZER',   'Dreivierteltakt-Gesellschaftstanz'],
        ['GITARRE',  'Populäres Saiteninstrument mit Korpus'],
        ['ORGEL',    'Großes Tasteninstrument mit Pfeifen'],
        ['FLÖTE',    'Holzblasinstrument durch Anblasen'],
        ['TROMPETE', 'Blechblasinstrument mit Ventilen'],
        ['SONATE',   'Mehrsätziges Instrumentalwerk'],
        ['OKTAVE',   'Acht-Ton-Abstand in der Tonleiter'],
        ['RHYTHMUS', 'Zeitliche Gliederung musikalischer Töne'],
        ['TENOR',    'Hohe männliche Gesangsstimme'],
        ['SOPRAN',   'Höchste weibliche Singstimme'],
        ['OPER',     'Musiktheater mit gesungenem Dialog'],
        ['KLAVIER',  'Tasteninstrument mit Hämmern und Saiten'],
        ['CELLO',    'Großes tiefes Streichinstrument'],
        ['OBOE',     'Hohes Holzblasinstrument mit Doppelrohrblatt'],
        ['FAGOTT',   'Tiefes Holzblasinstrument'],
        ['MARSCH',   'Im Gleichschritt spielbares Musikstück'],
        ['FUGE',     'Polyphone Kompositionsform mit Thema'],
        ['BALLADE',  'Erzählendes Lied oder Instrumentalstück'],
        ['KONZERT',  'Öffentliche musikalische Aufführung'],
      ]
    },

    wissenschaft: {
      label: 'Wissenschaft', icon: '🔬',
      words: [
        ['ATOM',     'Kleinste Einheit eines chemischen Elements'],
        ['CHEMIE',   'Wissenschaft der Stoffe und Reaktionen'],
        ['DICHTE',   'Masse pro Volumeneinheit eines Stoffs'],
        ['ELEKTRON', 'Negativ geladenes Elementarteilchen'],
        ['FOSSIL',   'Versteinertes Überbleibsel eines Lebewesens'],
        ['GALAXIE',  'Riesiges System aus Milliarden Sternen'],
        ['HYPOTHESE','Vorläufige wissenschaftliche Annahme'],
        ['ISOTOP',   'Atom gleichen Elements mit anderer Masse'],
        ['KERN',     'Zentraler Teil einer Zelle oder eines Atoms'],
        ['LASER',    'Gebündelter kohärenter Lichtstrahl'],
        ['MAGNET',   'Körper mit magnetischem Anziehungsfeld'],
        ['NEURON',   'Elektrisch aktive Nervenzelle'],
        ['OSMOSE',   'Bewegung von Lösungsmitteln durch Membran'],
        ['PLASMA',   'Ionisiertes Gas als vierter Aggregatzustand'],
        ['PROTON',   'Positiv geladenes Teilchen im Atomkern'],
        ['NEUTRON',  'Ungeladenes Kernteilchen im Atomkern'],
        ['THEORIE',  'Systematische wissenschaftliche Erklärung'],
        ['VAKUUM',   'Raum ohne Materie oder Luftleere'],
        ['WELLE',    'Räumliche und zeitliche Schwingungsform'],
        ['ZELLE',    'Kleinste strukturelle Einheit des Lebens'],
        ['ENZYM',    'Biologischer Katalysator aus Eiweiß'],
        ['PROTEIN',  'Lebenswichtiger Eiweißbaustein'],
        ['VIRUS',    'Kleinstes infektiöses Partikel'],
        ['BAKTERIE', 'Einzelliges Prokaryot ohne Zellkern'],
        ['MITOSE',   'Zellteilung zur Vermehrung'],
        ['MEIOSE',   'Zellteilung zur Keimzellbildung'],
        ['SPEKTRUM', 'Bereich von Wellenlängen des Lichts'],
        ['BREMSE',   'Vorrichtung zur Verlangsamung einer Bewegung'],
        ['HEBEL',    'Einfache Maschine zum Kraftverstärken'],
        ['IMPULS',   'Produkt aus Masse und Geschwindigkeit'],
      ]
    },

  };

  /* ─────────────────────────────────────────────
     CROSSWORD GENERATOR
  ───────────────────────────────────────────── */
  const Generator = (() => {
    const GRID_SIZE = 13; // 13×13 Zellen

    /** Prüft, ob Wort an (row, col, dir) ohne Konflikte platziert werden kann.
     *  Gibt Anzahl der Kreuzungen zurück, oder -1 bei Konflikt. */
    function canPlace(grid, wordStr, row, col, dir) {
      const len  = wordStr.length;
      const ROWS = GRID_SIZE, COLS = GRID_SIZE;

      // Grenzprüfung
      if (dir === 'H') {
        if (row < 0 || row >= ROWS) return -1;
        if (col < 0 || col + len > COLS) return -1;
        // Wort darf nicht verlängert werden
        if (col > 0          && grid[row][col - 1]     !== null) return -1;
        if (col + len < COLS && grid[row][col + len]   !== null) return -1;
      } else {
        if (col < 0 || col >= COLS) return -1;
        if (row < 0 || row + len > ROWS) return -1;
        if (row > 0          && grid[row - 1][col]     !== null) return -1;
        if (row + len < ROWS && grid[row + len][col]   !== null) return -1;
      }

      let intersections = 0;

      for (let i = 0; i < len; i++) {
        const r = dir === 'H' ? row       : row + i;
        const c = dir === 'H' ? col + i   : col;
        const letter = wordStr[i];

        if (grid[r][c] !== null) {
          if (grid[r][c] !== letter) return -1; // Buchstaben-Konflikt
          intersections++;
        } else {
          // Parallele Berührung prüfen (würde unbeabsichtigtes Wort erzeugen)
          if (dir === 'H') {
            if (r > 0       && grid[r - 1][c] !== null) return -1;
            if (r < ROWS-1  && grid[r + 1][c] !== null) return -1;
          } else {
            if (c > 0       && grid[r][c - 1] !== null) return -1;
            if (c < COLS-1  && grid[r][c + 1] !== null) return -1;
          }
        }
      }

      return intersections;
    }

    function placeOnGrid(grid, wordStr, row, col, dir) {
      for (let i = 0; i < wordStr.length; i++) {
        const r = dir === 'H' ? row     : row + i;
        const c = dir === 'H' ? col + i : col;
        grid[r][c] = wordStr[i];
      }
    }

    function findPlacements(grid, wordStr, placed) {
      const placements = [];
      // Suche alle möglichen Platzierungen über Buchstaben-Überschneidungen
      for (const p of placed) {
        const crossDir = p.dir === 'H' ? 'V' : 'H';
        for (let pi = 0; pi < p.word.length; pi++) {
          const existingLetter = p.word[pi];
          for (let wi = 0; wi < wordStr.length; wi++) {
            if (wordStr[wi] !== existingLetter) continue;
            // Berechne Startposition
            let row, col;
            if (crossDir === 'H') {
              row = p.dir === 'H' ? p.row       : p.row + pi;
              col = (p.dir === 'H' ? p.col + pi : p.col) - wi;
            } else {
              col = p.dir === 'V' ? p.col       : p.col + pi;
              row = (p.dir === 'V' ? p.row + pi : p.row) - wi;
            }
            const score = canPlace(grid, wordStr, row, col, crossDir);
            if (score >= 1) {
              placements.push({ row, col, dir: crossDir, score });
            }
          }
        }
      }
      return placements;
    }

    function buildPuzzle(grid, placed, seed, categoryLabel) {
      // Bounding box bestimmen
      let minR = GRID_SIZE, maxR = 0, minC = GRID_SIZE, maxC = 0;
      for (const p of placed) {
        const endR = p.dir === 'H' ? p.row           : p.row + p.word.length - 1;
        const endC = p.dir === 'H' ? p.col + p.word.length - 1 : p.col;
        minR = Math.min(minR, p.row);  maxR = Math.max(maxR, endR);
        minC = Math.min(minC, p.col);  maxC = Math.max(maxC, endC);
      }
      // 1 Zelle Rand
      minR = Math.max(0, minR - 1);
      minC = Math.max(0, minC - 1);
      maxR = Math.min(GRID_SIZE - 1, maxR + 1);
      maxC = Math.min(GRID_SIZE - 1, maxC + 1);

      const rows = maxR - minR + 1;
      const cols = maxC - minC + 1;

      // Grid-Array aufbauen (schwarze Felder = '■', Buchstaben = Buchstabe)
      const gridArr = [];
      for (let r = 0; r < rows; r++) {
        gridArr[r] = [];
        for (let c = 0; c < cols; c++) {
          const letter = grid[minR + r][minC + c];
          gridArr[r][c] = letter === null ? '■' : letter;
        }
      }

      // Wort-Objekte mit angepassten Koordinaten
      const words = placed.map((p, idx) => ({
        id:     idx + 1,
        number: 0,      // wird unten nummeriert
        dir:    p.dir,
        row:    p.row - minR,
        col:    p.col - minC,
        answer: p.word,
        clue:   p.clue,
      }));

      // Felder nummerieren (Standard-Kreuzworträtsel-Nummerierung)
      // Startzelle = links-oben innerhalb des Gitters
      const startCells = {};
      words.forEach(w => {
        const key = `${w.row}_${w.col}`;
        if (!startCells[key]) startCells[key] = [];
        startCells[key].push(w);
      });

      let counter = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const key = `${r}_${c}`;
          if (startCells[key]) {
            startCells[key].sort(a => a.dir === 'H' ? -1 : 1);
            startCells[key].forEach(w => { w.number = counter; });
            counter++;
          }
        }
      }

      return {
        id:    `gen-${seed}`,
        title: `Kreuzworträtsel: ${categoryLabel}`,
        rows, cols, grid: gridArr, words,
      };
    }

    return {
      generate(wordEntries, seed, categoryLabel) {
        const rng = mkRng(seed);
        const shuffled = shuffle(wordEntries, rng);

        // Grid initialisieren
        const grid = Array.from({ length: GRID_SIZE },
          () => Array(GRID_SIZE).fill(null));

        const placed = []; // { word, clue, row, col, dir }

        // Erstes Wort horizontal in der Mitte
        const first = shuffled[0];
        const fRow  = Math.floor(GRID_SIZE / 2);
        const fCol  = Math.floor((GRID_SIZE - first[0].length) / 2);
        placeOnGrid(grid, first[0], fRow, fCol, 'H');
        placed.push({ word: first[0], clue: first[1], row: fRow, col: fCol, dir: 'H' });

        // Restliche Wörter platzieren
        for (let i = 1; i < shuffled.length; i++) {
          const [wordStr, clue] = shuffled[i];
          // Bereits platziert?
          if (placed.find(p => p.word === wordStr)) continue;

          const placements = findPlacements(grid, wordStr, placed);
          if (!placements.length) continue;

          // Beste Platzierung: höchster Score, bei Gleichstand zufällig
          placements.sort((a, b) => b.score - a.score || rng() - 0.5);
          const best = placements[0];

          placeOnGrid(grid, wordStr, best.row, best.col, best.dir);
          placed.push({ word: wordStr, clue, row: best.row, col: best.col, dir: best.dir });

          if (placed.length >= 16) break; // 16 Wörter = gutes Rätsel
        }

        if (placed.length < 6) return null; // zu wenige Wörter
        return buildPuzzle(grid, placed, seed, categoryLabel);
      },
    };
  })();

  /* ─────────────────────────────────────────────
     HAND-CRAFTED FEATURED PUZZLES (sofort spielbar)
  ───────────────────────────────────────────── */
  const FEATURED = [
    // Puzzle #1 — Tiere (11×11, bereits verifiziert)
    {
      id: 'featured-1',
      title: 'Kreuzworträtsel: Tiere & Natur #1',
      rows: 11, cols: 11,
      grid: [
        ['■','B','R','O','T','■','■','K','U','H','■'],
        ['■','■','■','■','E','U','R','O','P','A','■'],
        ['■','■','■','■','N','■','■','■','■','H','■'],
        ['■','■','■','■','N','E','H','M','E','N','■'],
        ['■','■','■','■','E','S','S','E','N','■','■'],
        ['■','■','■','■','■','■','■','■','■','■','■'],
        ['S','O','N','N','E','■','■','W','I','N','D'],
        ['■','■','■','■','■','■','■','■','■','■','■'],
        ['■','K','A','T','Z','E','■','■','■','■','■'],
        ['■','■','■','■','■','■','■','■','■','■','■'],
        ['■','■','■','■','■','■','■','■','■','■','■'],
      ],
      words: [
        { id:1, number:1, dir:'H', row:0, col:1, answer:'BROT',   clue:'Deutsches Grundnahrungsmittel aus Mehl' },
        { id:2, number:3, dir:'H', row:0, col:7, answer:'KUH',    clue:'Milchgebendes Nutztier auf der Weide' },
        { id:3, number:5, dir:'H', row:1, col:4, answer:'EUROPA', clue:'Kontinent mit Deutschland, Frankreich und Italien' },
        { id:4, number:6, dir:'H', row:3, col:4, answer:'NEHMEN', clue:'Etwas ergreifen oder wegnehmen' },
        { id:5, number:7, dir:'H', row:4, col:4, answer:'ESSEN',  clue:'Nahrung aufnehmen; Großstadt im Ruhrgebiet' },
        { id:6, number:8, dir:'H', row:6, col:0, answer:'SONNE',  clue:'Unser Tagesstern, der Licht und Wärme spendet' },
        { id:7, number:9, dir:'H', row:6, col:7, answer:'WIND',   clue:'Horizontale Bewegung der Luft' },
        { id:8, number:10,dir:'H', row:8, col:1, answer:'KATZE',  clue:'Schnurrendes Haustier mit Schnurrhaaren' },
        { id:9, number:2, dir:'V', row:0, col:4, answer:'TENNE',  clue:'Dreschboden in der Scheune' },
        { id:10,number:4, dir:'V', row:0, col:9, answer:'HAHN',   clue:'Männliches Huhn; Vorrichtung für Wasser' },
      ],
    },
  ];

  /* ─────────────────────────────────────────────
     TAGESRÄTSEL  (basiert auf Datum)
  ───────────────────────────────────────────── */
  function dailySeed() {
    const now = new Date();
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  }

  function dailyCategoryKey() {
    const keys = Object.keys(CATEGORIES);
    const idx  = dailySeed() % keys.length;
    return keys[idx];
  }

  /* ─────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────── */
  return {
    /** Alle Kategorie-Infos */
    get categories() {
      return Object.entries(CATEGORIES).map(([key, v]) => ({
        key, label: v.label, icon: v.icon,
      }));
    },

    /** Featured-Rätsel nach Index */
    getFeatured(idx) {
      return FEATURED[idx % FEATURED.length];
    },

    /** Anzahl Featured-Rätsel */
    get featuredCount() { return FEATURED.length; },

    /** Generiertes Rätsel nach Seed + Kategorie */
    generate(seed, categoryKey) {
      const cat = CATEGORIES[categoryKey];
      if (!cat) return null;
      return Generator.generate(cat.words, seed, cat.label);
    },

    /** Tagesrätsel */
    daily() {
      const catKey = dailyCategoryKey();
      return this.generate(dailySeed(), catKey);
    },

    /** Rätsel-Index für das UI — kombiniert Featured + generierte Rätsel */
    getList(categoryKey) {
      const list = [];
      // Featured zuerst
      FEATURED.forEach((p, i) => list.push({ type: 'featured', idx: i, title: p.title, id: p.id }));
      // 50 generierte Rätsel pro Kategorie
      const keys = categoryKey ? [categoryKey] : Object.keys(CATEGORIES);
      keys.forEach(catKey => {
        const cat = CATEGORIES[catKey];
        for (let s = 1; s <= 50; s++) {
          list.push({
            type:  'generated',
            seed:  s * 137 + catKey.charCodeAt(0),
            catKey,
            title: `${cat.icon} ${cat.label} #${s}`,
            id:    `gen-${catKey}-${s}`,
          });
        }
      });
      return list;
    },

    /** Lade ein spezifisches Rätsel aus der Liste */
    loadFromEntry(entry) {
      if (entry.type === 'featured') return this.getFeatured(entry.idx);
      return this.generate(entry.seed, entry.catKey);
    },
  };

})();
