/**
 * decks.js — Karten-Decks für Memory klickspiele.de
 * Jedes Deck hat mind. 18 einzigartige Symbole (für 6×6 = 18 Paare)
 */

const DECKS = {
  tiere: {
    id: 'tiere',
    label: 'Tiere',
    icon: '🐾',
    symbols: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
      '🦁','🐮','🐷','🐸','🐵','🦄','🐔','🐧','🦆','🦉',
      '🐝','🦋','🐠','🐬','🦓','🦒','🐙','🦜','🦩','🐇',
    ],
  },
  flaggen: {
    id: 'flaggen',
    label: 'Flaggen',
    icon: '🏴',
    symbols: [
      '🇩🇪','🇫🇷','🇮🇹','🇪🇸','🇵🇹','🇳🇱','🇧🇪','🇦🇹','🇨🇭','🇵🇱',
      '🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇬🇧','🇺🇸','🇨🇦','🇯🇵','🇨🇳','🇧🇷',
      '🇷🇺','🇺🇦','🇹🇷','🇬🇷','🇨🇿','🇭🇺','🇷🇴','🇮🇪','🇮🇸','🇲🇽',
    ],
  },
  emojis: {
    id: 'emojis',
    label: 'Emojis',
    icon: '😊',
    symbols: [
      '😀','😂','🥰','😎','🤩','😴','🤔','😱','🤗','😡',
      '🥺','😭','🤠','🥳','🤯','😏','🧐','🤑','😇','🤫',
      '🤡','👻','💀','🎃','🤖','👽','🦸','🧙','🧸','🎭',
    ],
  },
  weihnachten: {
    id: 'weihnachten',
    label: 'Weihnachten',
    icon: '🎄',
    symbols: [
      '🎄','⛄','🎅','🤶','🦌','🎁','❄️','🔔','🕯️','⭐',
      '🌟','🧦','🍪','🍷','🛷','🔮','🎿','🍫','🍬','🧣',
      '🎶','✨','🕊️','🧊','🎠','🍑','🥂','🪅','🌙','🎆',
    ],
  },
  früchte: {
    id: 'früchte',
    label: 'Früchte',
    icon: '🍎',
    symbols: [
      '🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥭','🍍','🥝',
      '🍌','🍉','🍏','🍐','🫐','🍅','🥥','🥑','🥦','🥕',
      '🌽','🍆','🫒','🍄','🌶️','🫑','🧅','🧄','🥜','🌰',
    ],
  },
  weltraum: {
    id: 'weltraum',
    label: 'Weltraum',
    icon: '🚀',
    symbols: [
      '🚀','🛸','🌍','🌙','⭐','☀️','🪐','☄️','🌌','🔭',
      '👨‍🚀','🛰️','🌠','🌟','💫','🪨','🌑','🌕','🌒','🌓',
      '🌔','🌖','🌗','🌘','🌛','🌜','🌝','🌞','🌚','💥',
    ],
  },
};

const GRIDS = [
  { id: '3x4', label: '3 × 4', cols: 3, rows: 4, pairs: 6 },
  { id: '4x4', label: '4 × 4', cols: 4, rows: 4, pairs: 8 },
  { id: '4x5', label: '4 × 5', cols: 4, rows: 5, pairs: 10 },
  { id: '5x4', label: '5 × 4', cols: 5, rows: 4, pairs: 10 },
  { id: '6x6', label: '6 × 6', cols: 6, rows: 6, pairs: 18 },
];

export { DECKS, GRIDS };
