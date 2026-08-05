/**
 * Practice sounds — local MP3s in sounds/ (portable folder, no internet).
 */
window.PracticeSounds = (function () {
  const FILE_MAP = {
    "sound-click": "sounds/click.mp3",
    "sound-success": "sounds/success.mp3",
    "sound-failure": "sounds/failure.mp3",
    "sound-penalty": "sounds/penalty.mp3",
    "sound-buttonPress": "sounds/buttonPress.mp3"
  };

  let enabled = true;
  let useFiles = true;
  let ctx = null;
  const pool = {};

  function resolveSrc(rel) {
    if (window.PracticeAssetBase && PracticeAssetBase.url) {
      return PracticeAssetBase.url(rel);
    }
    return rel;
  }

  function getCtx() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) ctx = new Ctx();
    }
    return ctx;
  }

  function unlock() {
    const c = getCtx();
    if (c && c.state === "suspended") {
      c.resume().catch(function () {});
    }
  }

  function preload() {
    Object.keys(FILE_MAP).forEach(function (id) {
      const rel = FILE_MAP[id];
      const src = resolveSrc(rel);
      if (pool[src]) return;
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = 0.85;
      audio.addEventListener("error", function () {
        console.warn("Sound missing:", rel);
      });
      pool[src] = audio;
    });

    Object.keys(FILE_MAP).forEach(function (id) {
      const el = document.getElementById(id);
      const src = resolveSrc(FILE_MAP[id]);
      if (el) {
        el.src = src;
        el.volume = 0.85;
      }
    });
  }

  function playFile(id) {
    const rel = FILE_MAP[id] || FILE_MAP["sound-click"];
    const src = resolveSrc(rel);
    let audio = pool[src];

    if (!audio) {
      audio = new Audio(src);
      audio.volume = 0.85;
      pool[src] = audio;
    }

    const clone = new Audio(src);
    clone.volume = 0.85;
    const p = clone.play();
    if (p && p.catch) {
      p.catch(function () {
        playSynth(id);
      });
      return true;
    }
    return true;
  }

  function beep(freq, duration, type, volume, when) {
    const c = getCtx();
    if (!c || !enabled) return;

    const t0 = when != null ? when : c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function playSynth(id) {
    switch (id) {
      case "sound-penalty":
        beep(180, 0.12, "sawtooth", 0.14);
        break;
      case "sound-failure":
        beep(220, 0.2, "sawtooth", 0.16);
        break;
      case "sound-success":
        beep(523.25, 0.1, "sine", 0.12);
        beep(659.25, 0.1, "sine", 0.12, getCtx().currentTime + 0.1);
        break;
      case "sound-buttonPress":
        beep(640, 0.035, "triangle", 0.1);
        break;
      default:
        beep(920, 0.055, "square", 0.12);
    }
  }

  function play(id) {
    if (!enabled) return;
    unlock();
    if (useFiles) {
      playFile(id);
      return;
    }
    playSynth(id);
  }

  function setEnabled(on) {
    enabled = !!on;
  }

  function initUnlockListeners() {
    function once() {
      unlock();
      document.removeEventListener("pointerdown", once);
      document.removeEventListener("keydown", once);
    }
    document.addEventListener("pointerdown", once, { passive: true });
    document.addEventListener("keydown", once);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      preload();
      initUnlockListeners();
    });
  } else {
    preload();
    initUnlockListeners();
  }

  return { play: play, unlock: unlock, setEnabled: setEnabled, preload: preload };
})();

window.playSoundSafe = function (soundId) {
  try {
    window.PracticeSounds.play(soundId);
  } catch (_) {}
};
