// In-game defaults from cl_stores.lua and cl_ammunation.lua
window.PRACTICE_CONFIG = {
  storeUsb: {
    action: "startWordCrack",
    title: "Store — USB Computer Hack",
    description: "Word Crack · 60s · 5-letter words · 6 attempts",
    params: {
      timeLimit: 60000,
      wordLength: 5,
      maxAttempts: 6,
      wordList: window.STORE_COMPUTER_WORDS
    }
  },
  storeDoor: {
    action: "startPairs",
    title: "Store — Door Unlock",
    description: "Pairs · 4×4 grid · 30s · 16 attempt limit",
    params: {
      gridSize: 4,
      timeLimit: 30000,
      maxAttempts: 16
    }
  },
  ammoThermite: {
    action: "startRhythm",
    title: "Ammunation — Thermite Door",
    description: "In-game · 45 hits to pass · 1 wrong key · 3 misses",
    params: {
      lanes: 6,
      keys: ["A", "S", "D", "J", "K", "L"],
      noteSpeed: 350,
      noteSpawnRate: 400,
      requiredNotes: 45,
      difficulty: "normal",
      maxWrongKeys: 1,
      maxMissedNotes: 3
    }
  },
  ammoThermiteUnlimited: {
    action: "startRhythm",
    title: "Ammunation — Thermite (Unlimited)",
    description: "No 45-hit cap · keep going until you fail · same speed & keys",
    params: {
      lanes: 6,
      keys: ["A", "S", "D", "J", "K", "L"],
      noteSpeed: 350,
      noteSpawnRate: 400,
      unlimited: true,
      maxWrongKeys: 1,
      maxMissedNotes: 3
    }
  },
  ammoThermiteCustom: {
    action: "startRhythm",
    title: "Ammunation — Thermite (Custom / Beginner)",
    description: "Forgiving practice · 1×–3× speed · 3× = true in-game speed",
    customizable: true,
    params: {
      lanes: 6,
      keys: ["A", "S", "D", "J", "K", "L"],
      speedTier: 1,
      forgiving: true,
      unlimited: true,
      difficulty: "normal"
    },
    settings: [
      {
        key: "speedTier",
        label: "Speed",
        type: "select",
        options: [
          { value: "1", label: "1× — slowest (learn keys)" },
          { value: "2", label: "2× — medium" },
          { value: "3", label: "3× — true in-game speed" }
        ],
        default: "1"
      },
      {
        key: "forgiving",
        label: "Forgiving mode",
        type: "select",
        options: [
          { value: "yes", label: "Yes — never fail on wrong/miss" },
          { value: "no", label: "No — fail like in-game (1 wrong · 3 misses)" }
        ],
        default: "yes"
      },
      {
        key: "sessionType",
        label: "Session goal",
        type: "select",
        options: [
          { value: "unlimited", label: "Unlimited hits (practice until Esc)" },
          { value: "goal45", label: "Win at 45 hits (still forgiving)" }
        ],
        default: "unlimited"
      }
    ]
  },
  ammoCrate: {
    action: "startNumberedSequence",
    title: "Ammunation — Crate (Crowbar)",
    description: "Numbered Sequence · 7×7 grid · 8 numbers · 3 rounds",
    params: {
      gridSize: 7,
      sequenceLength: 8,
      rounds: 3,
      showTime: 3000,
      guessTime: 7000,
      maxWrongPresses: 1
    }
  },
  boostTrackerDots: {
    action: "startSymbolSearch",
    title: "Boosting — Tracker (Dots)",
    description: "Symbol Search · 10×10 · 700ms shift · 30s · 4-symbol key · Braille dots",
    params: {
      gridSize: 10,
      shiftInterval: 700,
      timeLimit: 30000,
      minKeyLength: 4,
      maxKeyLength: 4,
      symbolType: "dots"
    }
  },
  boostTrackerShapes: {
    action: "startSymbolSearch",
    title: "Boosting — Tracker (Shapes)",
    description: "Symbol Search · 10×10 · 700ms shift · 30s · 4-symbol key · geometric shapes",
    params: {
      gridSize: 10,
      shiftInterval: 700,
      timeLimit: 30000,
      minKeyLength: 4,
      maxKeyLength: 4,
      symbolType: "symbols"
    }
  },
  boostTrackerCustom: {
    action: "startSymbolSearch",
    title: "Boosting — Tracker (Custom)",
    description: "Choose dots or shapes and tune grid, timing, and key length",
    customizable: true,
    params: {
      gridSize: 10,
      shiftInterval: 700,
      timeLimit: 30000,
      minKeyLength: 4,
      maxKeyLength: 4,
      symbolType: "dots"
    },
    settings: [
      {
        key: "symbolType",
        label: "Symbol set",
        type: "select",
        options: [
          { value: "dots", label: "Dots (Braille)" },
          { value: "symbols", label: "Shapes" }
        ],
        default: "dots"
      },
      { key: "gridSize", label: "Grid size", type: "number", min: 6, max: 12, default: 10 },
      { key: "shiftInterval", label: "Shift interval (ms)", type: "number", min: 400, max: 1500, default: 700 },
      { key: "timeLimitSec", label: "Time limit (seconds)", type: "number", min: 15, max: 60, default: 30 },
      { key: "minKeyLength", label: "Min key length", type: "number", min: 1, max: 6, default: 4 },
      { key: "maxKeyLength", label: "Max key length", type: "number", min: 1, max: 6, default: 4 }
    ]
  },
  launderDropOff: {
    action: "startBackdoorSequence",
    title: "Laundering — Drop Off",
    description: "Backdoor Sequence · 3 stages · 8 keys · 5s · W A S D E F G H J",
    params: {
      totalStages: 3,
      keysPerStage: 8,
      timeLimit: 5,
      keyPool: ["W", "A", "S", "D", "E", "F", "G", "H", "J"],
      keyHintText: "W, A, S, D only"
    }
  },
  launderDropOffCustom: {
    action: "startBackdoorSequence",
    title: "Laundering — Drop Off (Custom)",
    description: "Tune stages, keys per stage, timer, and key set",
    customizable: true,
    params: {
      totalStages: 3,
      keysPerStage: 8,
      timeLimit: 5,
      keyPool: ["W", "A", "S", "D", "E", "F", "G", "H", "J"],
      keyHintText: "W, A, S, D, E, F, G, H, J"
    },
    settings: [
      { key: "totalStages", label: "Stages", type: "number", min: 1, max: 5, default: 3 },
      { key: "keysPerStage", label: "Keys per stage", type: "number", min: 3, max: 12, default: 8 },
      { key: "timeLimit", label: "Time per stage (seconds)", type: "number", min: 3, max: 30, default: 5 },
      {
        key: "keyPoolPreset",
        label: "Key set",
        type: "select",
        options: [
          { value: "wasd", label: "W A S D only" },
          { value: "launder", label: "W A S D E F G H J (in-game)" },
          { value: "extended", label: "W A S D Q E R F G H J K L" }
        ],
        default: "launder"
      }
    ]
  }
};
