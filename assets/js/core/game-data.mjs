export const SITE_URL = "https://www.denksport-logikspiele.de";

export const games = [
  {
    slug: "sudoku",
    name: "Sudoku",
    title: "Sudoku Online kostenlos – tägliche Sudoku-Rätsel (leicht bis schwer)",
    description:
      "Sudoku gratis online spielen – mobil optimiert, mit Notizen, Prüffunktion, Tipps und täglichen Herausforderungen.",
    intro:
      "Sudoku ist der Denksport-Klassiker für Logikfans: Fülle das 9×9-Gitter so, dass jede Zahl 1–9 pro Zeile, Spalte und Block genau einmal vorkommt. Spiele kostenlos auf dem Handy – mit großen Eingabefeldern, Notizenmodus, Fehler-Check, Hinweisen und Zeitmessung. Ideal für kurze Pausen oder lange Knobel-Sessions, inkl. täglicher Rätsel und Streaks.",
    category: "Zahlenrätsel",
    engine: "sudoku",
    related: ["kakuro", "kenken-calcudoku", "futoshiki"],
  },
  {
    slug: "kreuzwortraetsel",
    name: "Kreuzworträtsel",
    title: "Kreuzworträtsel online – täglich neues Schwedenrätsel (kostenlos & mobil)",
    description:
      "Täglich Kreuzworträtsel lösen: Schwedenrätsel online, mobilfreundlich, mit Hinweisen, Autoprüfung und Wortschatz-Boost.",
    intro:
      "Kreuzworträtsel trainieren Wortschatz, Allgemeinwissen und Kombinationsfähigkeit. Löse täglich ein neues Schwedenrätsel direkt im Browser – ohne Download, perfekt fürs Smartphone. Mit großen Feldern, komfortabler Tastatur, Hinweisfunktion, optionaler Buchstabenprüfung und sauberem Layout für kleine Displays. Zusätzlich kannst du Themenrätsel, Schwierigkeitsgrade und eine „Weiter später“-Funktion nutzen.",
    category: "Wortspiele",
    engine: "crossword",
    related: ["wortsuche", "wort-des-tages", "anagramm"],
  },
  {
    slug: "solitaer-klondike",
    name: "Solitär (Klondike)",
    title: "Solitär (Klondike) online spielen – kostenlos, schnell & mobil optimiert",
    description:
      "Solitär Klondike gratis: flüssige Steuerung, Undo, Auto-Move, tägliche Challenges und Statistiken – perfekt fürs Handy.",
    intro:
      "Solitär (Klondike) ist der Kartenklassiker für ruhige Konzentration: Sortiere die Karten nach Farbe absteigend und baue die Stapel sauber auf. Die mobile Version setzt auf große Touch-Zonen, Wischgesten, Auto-Move, Undo und clevere Hinweise. Spiele eine schnelle Runde zwischendurch oder meistere tägliche Herausforderungen mit Streaks und Bestzeiten.",
    category: "Klassiker",
    engine: "solitaire",
    related: ["mahjong-solitaer", "memory", "dame"],
  },
  {
    slug: "mahjong-solitaer",
    name: "Mahjong Solitär",
    title: "Mahjong Solitär kostenlos – klassisches Kachelspiel online (mobil & entspannt)",
    description:
      "Mahjong Solitär online: passende Paare finden, Kacheln abbauen, ruhiger Denksport – mobil optimiert mit Zoom & Tipp-Hilfe.",
    intro:
      "Mahjong Solitär ist Mustererkennung pur: Finde identische, „freie“ Kacheln und räume das Brett ab. Auf dem Smartphone helfen Zoom, klare Kontraste, große Touch-Flächen und eine intelligente Paar-Hervorhebung. Mit Shuffle/Undo, Hinweisen und verschiedenen Layouts bleibt jede Runde frisch – ein perfekter Mix aus Entspannung und Logik.",
    category: "Klassiker",
    engine: "mahjong",
    related: ["solitaer-klondike", "memory", "tangram"],
  },
  {
    slug: "wortsuche",
    name: "Wortsuche",
    title: "Wortsuche Rätsel online – Wörter finden im Buchstabensalat (kostenlos)",
    description:
      "Wortsuche gratis spielen: Begriffe markieren, Themenlisten wählen, mobil optimiert mit Wisch-Markierung und täglichen Rätseln.",
    intro:
      "In der Wortsuche findest du versteckte Wörter horizontal, vertikal oder diagonal – ideal für Fokus und visuelle Aufmerksamkeit. Mobile-first bedeutet: Markieren per Wischgeste, automatische Auswahl, Zoom bei Bedarf und klare Schrift. Wähle Themen (Städte, Natur, Technik), spiele tägliche Rätsel und verbessere deine Zeit mit einer optionalen Stoppuhr.",
    category: "Wortspiele",
    engine: "wordsearch",
    related: ["kreuzwortraetsel", "wort-des-tages", "anagramm"],
  },
  {
    slug: "schach",
    name: "Schach",
    title: "Schach online kostenlos – mobil spielen, lernen & Taktik trainieren",
    description:
      "Schach gratis im Browser: Touch-freundliches Brett, Zugvorschau, Trainingsmodus, Taktik-Aufgaben und verschiedene Schwierigkeitsstufen.",
    intro:
      "Schach ist das Strategie- und Logikspiel schlechthin: Plane Züge, erkenne Taktiken und verbessere dein Positionsverständnis. Für Mobile sind Drag-&-Drop, Tap-to-Move, Zugvorschau und klare Markierungen entscheidend. Ergänze einen Trainingsmodus mit Taktik-Puzzles, Eröffnungsgrundlagen und Analyse (z. B. „Warum war das ein Fehler?“) – ohne die Seite zu überladen.",
    category: "Brettspiele",
    engine: "chess",
    related: ["reversi-othello", "dame", "mastermind"],
  },
  {
    slug: "memory",
    name: "Memory",
    title: "Memory online – Paare finden, Gedächtnis trainieren (mobil & kinderleicht)",
    description:
      "Memory kostenlos: Karten aufdecken, Paare merken, verschiedene Größen & Themen – perfekt für Handy, Tablet und Familie.",
    intro:
      "Memory trainiert Kurzzeitgedächtnis und Konzentration: Decke Karten auf, merke dir Positionen und finde Paare. Mobile Optimierung heißt: große Karten, schnelles Flip-Feedback, ruhige Animationen und ein Einhand-Layout. Wähle Rastergrößen (z. B. 4×4 bis 8×8), Themen (Tiere, Symbole) und spiele gegen die Zeit oder entspannt ohne Druck.",
    category: "Gedächtnis",
    engine: "casual",
    related: ["mahjong-solitaer", "mastermind", "kryptogramm"],
  },
  {
    slug: "minenraeumer",
    name: "Minenräumer",
    title: "Minenräumer online (Minesweeper) – Logikrätsel kostenlos & mobil",
    description:
      "Minesweeper gratis: sichere Felder öffnen, Minen markieren, Zahlenlogik nutzen – Touch-optimiert mit Flag-Modus.",
    intro:
      "Minenräumer ist reine Schlussfolgerung: Zahlen zeigen, wie viele Minen angrenzen – du kombinierst Hinweise, markierst Minen und öffnest sichere Felder. Für Smartphones braucht es einen klaren Flag-Modus (Umschalter), präzise Touch-Ziele, Zoom und Fehlklick-Schutz. Mit Schwierigkeitsgraden, Bestzeiten und einem „sicherer Start“-Modus wird’s fair und motivierend.",
    category: "Rasterlogik",
    engine: "minesweeper",
    related: ["nonogramm", "hitori", "slitherlink"],
  },
  {
    slug: "2048",
    name: "2048",
    title: "2048 Spiel online – Zahlen kombinieren, Rekorde knacken (mobil optimiert)",
    description:
      "2048 gratis: per Swipe Zahlen zusammenführen, Strategie lernen, Highscore jagen – super flüssig auf dem Smartphone.",
    intro:
      "2048 ist ein minimalistisches Logikspiel: Verschiebe Kacheln per Swipe, kombiniere gleiche Zahlen und plane mehrere Züge voraus. Mobile-first ist hier natürlich – mit Swipe-Erkennung, Undo-Option, schnellen Animationen und einem klaren Score-System. Perfekt für kurze Sessions, aber tief genug für Strategen, die 4096+ erreichen wollen.",
    category: "Zahlenpuzzle",
    engine: "casual",
    related: ["10x10", "sudoku", "kakuro"],
  },
  {
    slug: "10x10",
    name: "10x10 Block Puzzle",
    title: "10x10 Block Puzzle online – Blöcke platzieren, Reihen löschen (kostenlos)",
    description:
      "10x10 gratis spielen: Formen ins Raster legen, Reihen löschen, clever planen – mobil optimiert mit Drag & Snap.",
    intro:
      "Beim 10x10-Blockpuzzle platzierst du Formen in ein Raster und löschst volle Reihen/Spalten. Der Reiz ist Planung: Lass Platz für große Teile und vermeide Sackgassen. Mobile Bedienung braucht Drag-&-Drop mit Snap-Feedback, Vorschau und einen ruhigen, klaren Look. Ideal als entspannter Denksport – leicht zu starten, schwer zu meistern.",
    category: "Puzzle",
    engine: "casual",
    related: ["2048", "tangram", "schiebepuzzle-15"],
  },
  {
    slug: "wort-des-tages",
    name: "Wort des Tages",
    title: "Wort des Tages – deutsches Wordle online (kostenlos, täglich neu)",
    description:
      "Deutsches Wordle gratis: 5 Buchstaben raten, farbige Hinweise, tägliches Wort, Streaks – optimiert fürs Handy.",
    intro:
      "Rate ein deutsches Wort in wenigen Versuchen: Jede Eingabe gibt dir farbige Hinweise, welche Buchstaben passen. Das Spiel lebt von Alltagstauglichkeit: große On-Screen-Tastatur, klare Kontraste, schnelle Runden. Mit täglichem Wort, Archiv, Statistik (Streak/Winrate) und optionalem „Freies Spiel“ baust du langfristige Nutzerbindung auf.",
    category: "Wortspiele",
    engine: "casual",
    related: ["kreuzwortraetsel", "wortsuche", "anagramm"],
  },
  {
    slug: "nonogramm",
    name: "Nonogramm",
    title: "Nonogramm online – Picross Rätsel kostenlos (Logik mit Pixeln)",
    description:
      "Nonogramm gratis: Zahlenreihen deuten, Felder füllen, Pixelbild lösen – mobil optimiert mit Markiermodus.",
    intro:
      "Nonogramme sind Logikrätsel mit Zahlenhinweisen: Du füllst Felder, markierst Leerfelder und enthüllst am Ende ein Bild. Für Mobile zählen Markiermodi (Füllen/X), Zoom, Zeilen-Highlighting und Auto-Check optional. Biete verschiedene Größen (5×5 bis 15×15) und tägliche Rätsel – perfekt für langfristigen SEO-Content („Nonogramm leicht/mittel/schwer“).",
    category: "Logikbilder",
    engine: "logicbank",
    related: ["kakuro", "slitherlink", "nurikabe"],
  },
  {
    slug: "kakuro",
    name: "Kakuro",
    title: "Kakuro online kostenlos – Zahlenrätsel wie Kreuzwort (mobil & logisch)",
    description:
      "Kakuro gratis lösen: Summen bilden ohne Wiederholungen – mobil optimiert mit Eingabehilfe und Kandidaten.",
    intro:
      "Kakuro verbindet Kreuzworträtsel-Feeling mit Zahlenlogik: In jedem Block müssen Ziffern eine Summe ergeben, ohne Wiederholungen. Mobile UX: Zellen auswählen, Ziffernblock, Kandidaten/Notizen und Summen-Hilfen. Mit Schwierigkeitsgraden und Erklär-Tipps („Warum passt die 7?“) wird Kakuro zugänglich und extrem bindend für Zahlenfans.",
    category: "Zahlenrätsel",
    engine: "logicbank",
    related: ["sudoku", "kenken-calcudoku", "futoshiki"],
  },
  {
    slug: "kenken-calcudoku",
    name: "KenKen / Calcudoku",
    title: "KenKen (Calcudoku) online – Rechnen & Logik kostenlos (mobil optimiert)",
    description:
      "KenKen gratis: Rechenkäfige lösen, 1–N je Zeile/Spalte – ideal fürs Handy mit Notizen und Prüffunktion.",
    intro:
      "KenKen/Calcudoku kombiniert Sudoku-Regeln mit kleinen Rechenaufgaben in Käfigen. Du setzt Zahlen so, dass Zeilen/Spalten passen und die Käfig-Operationen stimmen. Mobile-first: großer Ziffernblock, Notizen, Käfig-Highlighting, Fehlercheck optional. Das Spiel skaliert perfekt von leicht bis brutal schwer – ideal für SEO („Calcudoku lösen lernen“).",
    category: "Zahlenrätsel",
    engine: "logicbank",
    related: ["sudoku", "kakuro", "futoshiki"],
  },
  {
    slug: "futoshiki",
    name: "Futoshiki",
    title: "Futoshiki online – Ungleich-Rätsel kostenlos (Logik ohne Raten)",
    description:
      "Futoshiki gratis: Zahlen setzen und Ungleichzeichen beachten – mobil optimiert mit Kandidaten und Highlights.",
    intro:
      "Futoshiki ist ein sauberes Logikrätsel: Zahlen dürfen sich nicht wiederholen, zusätzlich gelten Ungleichzeichen zwischen Zellen. Dadurch entsteht starke Deduktion ohne Raten. Für Smartphone: klare Zeichen, Zoom, Kandidaten, und ein „Konflikte anzeigen“-Modus. Biete Größen (4×4 bis 7×7) und kurze Tutorials – extrem SEO-fähig.",
    category: "Zahlenrätsel",
    engine: "logicbank",
    related: ["sudoku", "kenken-calcudoku", "wolkenkratzer"],
  },
  {
    slug: "hashi-brueckenraetsel",
    name: "Hashi",
    title: "Hashi (Brückenrätsel) online – Inseln verbinden, Logik trainieren",
    description:
      "Hashi gratis: Inseln mit 1–2 Brücken verbinden, Regeln beachten – mobil optimiert mit Tap-to-Connect.",
    intro:
      "Beim Brückenrätsel verbindest du Inseln so, dass jede Insel genau die angegebene Anzahl Brücken hat – ohne Kreuzungen. Mobile UX: Insel antippen, Richtung wählen, automatische Brücken-Erhöhung (1→2), Undo und Regel-Warnungen. Hashi ist ideal für kurze, klare Rätsel und erzeugt starken „Noch eins“-Sog.",
    category: "Netzwerkrätsel",
    engine: "logicbank",
    related: ["slitherlink", "nurikabe", "hidato"],
  },
  {
    slug: "slitherlink",
    name: "Slitherlink",
    title: "Slitherlink online – Schleifenrätsel kostenlos (ein Weg, reine Logik)",
    description:
      "Slitherlink gratis: eine geschlossene Linie bilden, Zahlen beachten – mobil optimiert mit Kanten-Tap und X-Markern.",
    intro:
      "Slitherlink ist ein Logikrätsel, bei dem du eine einzige geschlossene Schleife entlang von Gitterkanten zeichnest. Zahlen in Zellen sagen, wie viele Kanten genutzt werden dürfen. Für Mobile: Kanten per Tap aktivieren/deaktivieren, X-Marker, Zoom und Auto-Konfliktanzeige optional. Sehr „clean“, sehr süchtig, sehr SEO-tauglich.",
    category: "Linienrätsel",
    engine: "logicbank",
    related: ["hashi-brueckenraetsel", "nurikabe", "nonogramm"],
  },
  {
    slug: "nurikabe",
    name: "Nurikabe",
    title: "Nurikabe online – Inseln & Wasser logisch trennen (kostenlos)",
    description:
      "Nurikabe gratis: Inseln bauen, Wasser verbinden, keine 2×2-Wasserblöcke – mobil optimiert mit Markiermodus.",
    intro:
      "Nurikabe fordert räumliche Logik: Zahlen geben Inselgrößen vor, das „Wasser“ muss zusammenhängend sein und darf keine 2×2-Blöcke bilden. Mobile-first: Füllen/Markieren umschalten, Insel-Highlighting, Undo und Regelchecks. Mit kleinen Boards (5×5) startet man schnell – ideal für lange Serien und SEO-Cluster („Nurikabe leicht/schwer“).",
    category: "Flächenlogik",
    engine: "logicbank",
    related: ["slitherlink", "hashi-brueckenraetsel", "hitori"],
  },
  {
    slug: "hitori",
    name: "Hitori",
    title: "Hitori online kostenlos – doppelte Zahlen eliminieren (Logik pur)",
    description:
      "Hitori gratis: Duplikate in Reihen/Spalten entfernen, schwarze Felder ohne Berührung – mobil optimiert mit Tap-Markierung.",
    intro:
      "Hitori ist ein elegantes Zahlenrätsel: In jeder Zeile/Spalte dürfen Zahlen nicht doppelt vorkommen – du schwärzt Felder, aber schwarze Felder dürfen sich nicht berühren, und die weißen Felder müssen verbunden bleiben. Für Mobile: Tap-Toggle (weiß/schwarz/markiert), Konfliktanzeige und Zoom. Sehr gute Long-Tail-Keywords, geringe Konkurrenz.",
    category: "Zahlenrätsel",
    engine: "logicbank",
    related: ["nurikabe", "futoshiki", "sudoku"],
  },
  {
    slug: "light-up-akari",
    name: "Light Up (Akari)",
    title: "Light Up (Akari) online – Lampen setzen, Räume erhellen (kostenlos)",
    description:
      "Akari gratis: Lampen platzieren, alle Felder beleuchten, Lampen dürfen sich nicht sehen – mobil optimiert mit Tap-Setzen.",
    intro:
      "Bei Akari beleuchtest du ein Gitter: Setze Lampen so, dass alle freien Felder hell sind, aber Lampen sich nicht gegenseitig „sehen“. Nummerierte Wände begrenzen die Anzahl angrenzender Lampen. Mobile UX: Tap-Setzen, Strahlen-Vorschau, schnelle Undo/Redo und Regelchecks. Ein Top-Spiel für „kurz & knackig“ mit hohem Wiederbesuch.",
    category: "Rasterlogik",
    engine: "logicbank",
    related: ["nurikabe", "slitherlink", "hidato"],
  },
  {
    slug: "wolkenkratzer",
    name: "Skyscrapers",
    title: "Wolkenkratzer-Rätsel (Skyscrapers) online – Sichtlinien logisch lösen",
    description:
      "Skyscrapers gratis: Zahlen 1–N setzen, Sicht-Hinweise beachten – mobil optimiert mit Kandidaten & Highlights.",
    intro:
      "Skyscrapers kombiniert Latein-Quadrat-Regeln (1–N je Reihe/Spalte) mit Sicht-Hinweisen am Rand: Höhere Zahlen verdecken niedrigere. Dadurch entsteht starke Deduktion. Mobile-first: Kandidaten, Sichtlinien-Hilfen, Randhinweise klar lesbar, Zoom. Perfekt für SEO („Wolkenkratzer Rätsel lösen“), weil viele nach dem Namen suchen, aber wenig gute Tools existieren.",
    category: "Zahlenrätsel",
    engine: "logicbank",
    related: ["futoshiki", "kenken-calcudoku", "sudoku"],
  },
  {
    slug: "hidato",
    name: "Hidato",
    title: "Hidato online – Zahlenkette legen, Nachbarn verbinden (kostenlos)",
    description:
      "Hidato gratis: Zahlenfolge korrekt platzieren, Nachbarschaft beachten – mobil optimiert mit Auto-Validierung.",
    intro:
      "In Hidato ordnest du Zahlen so an, dass eine lückenlose Kette entsteht, bei der jede Zahl an die nächste angrenzt (auch diagonal). Das ist simpel zu lernen, aber schwer zu perfektionieren. Mobile UX: große Felder, Kandidaten, Auto-Validierung der Nachbarschaft und ein „zeige mögliche Nachbarn“-Hint. Sehr guter Long-Tail-Traffic.",
    category: "Zahlenpuzzle",
    engine: "logicbank",
    related: ["light-up-akari", "hashi-brueckenraetsel", "mastermind"],
  },
  {
    slug: "einstein-raetsel-logikgitter",
    name: "Einstein-Rätsel",
    title: "Einstein-Rätsel online – Logikgitter kostenlos lösen (wie Detektivarbeit)",
    description:
      "Logikrätsel gratis: Hinweise kombinieren, Tabellen füllen, eindeutige Lösung finden – mobil optimiert mit Grid-UI.",
    intro:
      "Einstein-Rätsel sind klassische „Wer wohnt wo?“-Logikaufgaben: Du kombinierst Hinweise und eliminierst Möglichkeiten im Gitter, bis eine eindeutige Lösung bleibt. Mobile-first braucht ein sehr gutes Grid: Tap-Zellen, Zustände (Ja/Nein/Unsicher), automatische Konsistenzchecks und klare Hinweislisten. Extrem SEO-stark, weil viele nach „Einstein Rätsel online“ suchen.",
    category: "Logikgitter",
    engine: "logicbank",
    related: ["kryptogramm", "mastermind", "hitori"],
  },
  {
    slug: "mastermind",
    name: "Mastermind",
    title: "Mastermind online – Code knacken, Logik trainieren (kostenlos)",
    description:
      "Mastermind gratis: Farb-/Zahlen-Code raten, Feedback nutzen, Strategie lernen – mobil optimiert mit großen Buttons.",
    intro:
      "Mastermind ist Deduktion mit Feedback: Du versuchst einen geheimen Code zu erraten und bekommst Hinweise zu richtigen Positionen/Werten. Perfekt für schnelle Runden auf dem Smartphone: große Auswahlbuttons, klares Feedback, Undo und Statistik. Mit einstellbarer Code-Länge und Duplikaten entsteht Tiefe – ohne komplexe Regeln.",
    category: "Kombinationsspiele",
    engine: "casual",
    related: ["einstein-raetsel-logikgitter", "kryptogramm", "wort-des-tages"],
  },
  {
    slug: "kryptogramm",
    name: "Kryptogramm",
    title: "Kryptogramm online – Geheimschrift lösen (Buchstaben ersetzen, kostenlos)",
    description:
      "Kryptogramm gratis: Substitution entschlüsseln, Muster erkennen – mobil optimiert mit Buchstaben-Zuordnung und Checks.",
    intro:
      "Kryptogramme sind Rätsel für Mustererkenner: Jeder Buchstabe steht konstant für einen anderen. Du knackbarst den Text über Häufigkeiten, Wortformen und Logik. Mobile UX: Zuordnungstabelle, Tippen auf Buchstaben gruppiert alle Vorkommen, Undo/Redo, Wörterbuch-Hinweise optional. Sehr stark für SEO („Geheimschrift Rätsel“).",
    category: "Wortlogik",
    engine: "casual",
    related: ["mastermind", "einstein-raetsel-logikgitter", "anagramm"],
  },
  {
    slug: "anagramm",
    name: "Anagramm",
    title: "Anagramm online – Buchstaben mischen, Wörter finden (kostenlos & mobil)",
    description:
      "Anagramm gratis: Buchstaben ordnen, Wörter bilden, Zeitmodus oder entspannt – mobil optimiert mit Drag-Letters.",
    intro:
      "Beim Anagramm formst du aus Buchstaben sinnvolle Wörter – ideal für Wortschatz und Geschwindigkeit. Für Smartphones: Drag-&-Drop der Buchstaben, „Shuffle“, „Backspace“, Autovervollständigung optional. Ergänze Modi wie „Wortleiter“, „Zeitangriff“ oder „Tägliches Anagramm“. Sehr gute Keyword-Varianten: „Buchstaben mischen“, „Wörter finden“.",
    category: "Wortspiele",
    engine: "casual",
    related: ["wortsuche", "wort-des-tages", "kreuzwortraetsel"],
  },
  {
    slug: "tangram",
    name: "Tangram",
    title: "Tangram online – Figuren legen mit 7 Teilen (Logik & Raumgefühl)",
    description:
      "Tangram gratis: Formen exakt legen, drehen, spiegeln – mobil optimiert mit Snap, Rotation und Vorlagen.",
    intro:
      "Tangram trainiert räumliches Denken: Lege Figuren aus sieben Teilen ohne Überlappung. Mobile-first heißt: präzises Drehen/Spiegeln, Snap-To-Edges, Zoom und eine transparente Zielvorlage. Biete Level-Packs (leicht→schwer), tägliche Figur und ein „Hinweis: Teil markieren“-Feature. Visuell stark, sehr teilbar, gute organische Verbreitung.",
    category: "Raumlogik",
    engine: "casual",
    related: ["10x10", "schiebepuzzle-15", "mahjong-solitaer"],
  },
  {
    slug: "schiebepuzzle-15",
    name: "Schiebepuzzle (15-Puzzle)",
    title: "Schiebepuzzle (15-Puzzle) online – Zahlen ordnen, kostenlos & mobil",
    description:
      "15-Puzzle gratis: Felder verschieben, Reihenfolge herstellen – mobil optimiert, mit Zügen, Timer und Shuffle.",
    intro:
      "Das 15-Puzzle ist ein zeitloser Klassiker: Verschiebe Kacheln in das leere Feld, bis die Reihenfolge stimmt. Auf dem Handy funktioniert das perfekt: Tap-to-Slide, flüssige Animationen, Shuffle mit lösbaren Zuständen, Zugzähler und Bestzeiten. Ergänze Bild-Puzzles (Foto-Modus) für zusätzliche Keywords und Nutzerbindung.",
    category: "Puzzle",
    engine: "casual",
    related: ["10x10", "tangram", "2048"],
  },
  {
    slug: "reversi-othello",
    name: "Reversi / Othello",
    title: "Reversi (Othello) online – Strategie & Logik kostenlos spielen",
    description:
      "Reversi gratis: Steine umdrehen, Züge planen, gegen KI spielen – mobil optimiert mit Zugvorschau.",
    intro:
      "Reversi ist schnell gelernt, aber strategisch tief: Setze Steine so, dass du gegnerische Steine einkesselst und umdrehst. Für Mobile: große Felder, Zugvorschau, „gültige Züge anzeigen“ optional, Undo im Trainingsmodus. Perfekt als „eine Runde geht immer“-Game mit sauberer Logik und hoher Wiederkehr.",
    category: "Brettspiele",
    engine: "reversi",
    related: ["schach", "dame", "mastermind"],
  },
  {
    slug: "dame",
    name: "Dame",
    title: "Dame online kostenlos – Klassiker mobil spielen (gegen KI oder zu zweit)",
    description:
      "Dame gratis: einfache Regeln, schnelle Partien, Touch-optimiertes Brett – gegen KI oder lokal zu zweit.",
    intro:
      "Dame ist der zugängliche Strategie-Klassiker: Diagonal ziehen, schlagen, Mehrfachsprünge planen, zur Dame werden. Mobile UX: Tap-to-Move, Highlight legaler Züge, Pflichtschläge optional je Regelset, schnelle Neustarts. Ideal als leichtes Denkspiel mit niedriger Einstiegshürde – und als interner Link-Hub zu Schach/Backgammon/weiteren Klassikern.",
    category: "Brettspiele",
    engine: "checkers",
    related: ["schach", "reversi-othello", "solitaer-klondike"],
  },
];

export const gameBySlug = Object.fromEntries(games.map((game) => [game.slug, game]));

export function getDailyIndex(length) {
  const now = new Date();
  const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor(utc / 86400000) % length;
}
