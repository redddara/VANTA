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
    description: "Circuit Rhythm · keys A S D J K L · 45 notes",
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
  }
};
