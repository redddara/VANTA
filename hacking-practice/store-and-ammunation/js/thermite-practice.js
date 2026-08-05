/**
 * Standalone Circuit Rhythm practice (Ammunation thermite door).
 * Same settings as cl_ammunation.lua — no glitch-minigames CSS dependency.
 */
window.ThermitePractice = (function () {
  const DEFAULTS = {
    keys: ["A", "S", "D", "J", "K", "L"],
    noteSpeed: 350,
    noteSpawnRate: 400,
    requiredNotes: 45,
    maxWrongKeys: 1,
    maxMissedNotes: 3,
    hitWindow: 28
  };

  let cfg = { ...DEFAULTS };
  let active = false;
  let notes = [];
  let notesHit = 0;
  let wrongKeys = 0;
  let missed = 0;
  let hitY = 330;
  let spawnTimer = null;
  let moveTimer = null;
  let ended = false;

  const BEST_KEY = "thermiteUnlimitedBest";

  const root = () => document.getElementById("thermite-game");
  const lanesEl = () => document.getElementById("thermite-lanes");
  const statusEl = () => document.getElementById("thermite-status");
  const progressBar = () => document.getElementById("thermite-progress-bar");
  const progressLabel = () => document.getElementById("thermite-progress-label");
  const scoreHud = () => document.getElementById("thermite-score-hud");
  const scoreValue = () => document.getElementById("thermite-score-value");
  const bestValue = () => document.getElementById("thermite-best-value");
  const missesValue = () => document.getElementById("thermite-misses-value");
  const wrongValue = () => document.getElementById("thermite-wrong-value");

  function getBestScore() {
    try {
      return parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
    } catch (_) {
      return 0;
    }
  }

  function setBestScore(value) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch (_) {}
  }

  function ensureScoreHud() {
    const game = root();
    if (!game || document.getElementById("thermite-score-hud")) return;

    const hud = document.createElement("div");
    hud.id = "thermite-score-hud";
    hud.className = "thermite-score-hud hidden";
    hud.innerHTML =
      '<div class="thermite-score-main">' +
      '<span class="thermite-score-value" id="thermite-score-value">0</span>' +
      '<span class="thermite-score-caption">SCORE</span>' +
      "</div>" +
      '<div class="thermite-score-side">' +
      '<div class="thermite-score-best">Best <strong id="thermite-best-value">0</strong></div>' +
      '<div class="thermite-score-meta">' +
      'Misses <strong id="thermite-misses-value">0</strong>/3 · Wrong <strong id="thermite-wrong-value">0</strong>/1' +
      "</div>" +
      "</div>";

    const stage = game.querySelector(".thermite-stage");
    if (stage) game.insertBefore(hud, stage);
    else game.appendChild(hud);
  }

  function setScoreHudVisible(visible) {
    ensureScoreHud();
    const hud = scoreHud();
    if (hud) hud.classList.toggle("hidden", !visible);
  }

  function bumpScore() {
    const el = scoreValue();
    if (!el) return;
    el.classList.remove("is-bump");
    void el.offsetWidth;
    el.classList.add("is-bump");
  }

  function updateScoreHud(options) {
    options = options || {};
    if (!isUnlimited()) {
      setScoreHudVisible(false);
      return;
    }

    setScoreHudVisible(true);

    if (scoreValue()) scoreValue().textContent = String(notesHit);
    if (bestValue()) bestValue().textContent = String(getBestScore());
    if (missesValue()) missesValue().textContent = String(missed);
    if (wrongValue()) wrongValue().textContent = String(wrongKeys);

    if (options.bump) bumpScore();
  }

  function setStatus(text) {
    const el = statusEl();
    if (el) el.textContent = text;
  }

  function isUnlimited() {
    return cfg.unlimited === true || cfg.requiredNotes === 0 || cfg.requiredNotes == null;
  }

  function updateProgress() {
    const wrap = document.querySelector(".thermite-progress-wrap");
    if (isUnlimited()) {
      if (wrap) wrap.classList.add("is-unlimited");
      if (progressBar()) progressBar().style.width = "100%";
      if (progressLabel()) {
        progressLabel().textContent = "Keep hitting notes — game ends at 1 wrong key or 3 misses";
      }
      updateScoreHud();
      return;
    }
    setScoreHudVisible(false);
    if (wrap) wrap.classList.remove("is-unlimited");
    const pct = Math.min(100, Math.round((notesHit / cfg.requiredNotes) * 100));
    if (progressBar()) progressBar().style.width = pct + "%";
    if (progressLabel()) {
      progressLabel().textContent = "Hits: " + notesHit + " / " + cfg.requiredNotes + " (" + pct + "%)";
    }
  }

  function measureHitLine() {
    const line = document.getElementById("thermite-hit-line");
    const lane = lanesEl() && lanesEl().querySelector(".thermite-lane");
    if (!line || !lane) {
      hitY = 330;
      return;
    }
    const laneRect = lane.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    hitY = lineRect.top - laneRect.top + lineRect.height / 2;
    if (hitY < 80) hitY = 330;
  }

  function buildUI() {
    const lanes = lanesEl();
    const keysRow = document.getElementById("thermite-keys");
    if (!lanes || !keysRow) return;

    lanes.innerHTML = "";
    keysRow.innerHTML = "";

    cfg.keys.forEach(function (key) {
      const lane = document.createElement("div");
      lane.className = "thermite-lane";
      lane.dataset.key = key;

      const feedback = document.createElement("div");
      feedback.className = "thermite-feedback";
      feedback.dataset.key = key;
      lane.appendChild(feedback);

      lanes.appendChild(lane);

      const keyEl = document.createElement("div");
      keyEl.className = "thermite-key";
      keyEl.textContent = key;
      keyEl.dataset.key = key;
      keysRow.appendChild(keyEl);
    });
  }

  function flashFeedback(key, type) {
    const lane = lanesEl() && lanesEl().querySelector('.thermite-lane[data-key="' + key + '"]');
    if (!lane) return;
    const fb = lane.querySelector(".thermite-feedback");
    if (!fb) return;
    fb.textContent = type.toUpperCase();
    fb.className = "thermite-feedback show " + type;
    setTimeout(function () {
      fb.className = "thermite-feedback";
    }, 350);
  }

  function spawnNote() {
    if (!active) return;
    const key = cfg.keys[Math.floor(Math.random() * cfg.keys.length)];
    const lane = lanesEl() && lanesEl().querySelector('.thermite-lane[data-key="' + key + '"]');
    if (!lane) return;

    const note = document.createElement("div");
    note.className = "thermite-note";
    note.style.top = "-20px";
    lane.appendChild(note);

    notes.push({ key: key, y: -20, el: note, lane: lane, hit: false });
  }

  function endGame(success, reason) {
    if (ended) return;
    ended = true;
    active = false;

    if (spawnTimer) clearInterval(spawnTimer);
    if (moveTimer) clearInterval(moveTimer);
    spawnTimer = null;
    moveTimer = null;

    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);

    var roundIsNewBest = false;
    var roundBestScore = getBestScore();

    if (success) {
      setStatus("SYNCHRONIZATION COMPLETE! Press SPACE to play again.");
      playSoundSafe("sound-success");
    } else {
      var failMsg = reason || "SYNCHRONIZATION FAILED!";
      if (isUnlimited()) {
        roundIsNewBest = notesHit > roundBestScore;
        if (roundIsNewBest) {
          setBestScore(notesHit);
          roundBestScore = notesHit;
        }
        updateScoreHud();
        failMsg =
          "Score: " +
          notesHit +
          (roundIsNewBest ? " — NEW BEST!" : roundBestScore > 0 ? " · Best: " + roundBestScore : "") +
          ". Press SPACE to retry.";
      }
      setStatus(failMsg);
      playSoundSafe("sound-failure");
    }

    setTimeout(function () {
      window.dispatchEvent(
        new CustomEvent("practice:gameResult", {
          detail: {
            path: "rhythmResult",
            success: success,
            body: { success: success },
            notesHit: notesHit,
            unlimited: isUnlimited(),
            bestScore: roundBestScore,
            isNewBest: roundIsNewBest
          }
        })
      );
    }, 1800);
  }

  function removeNote(index) {
    const note = notes[index];
    if (note && note.el) note.el.remove();
    notes.splice(index, 1);
  }

  function tickNotes() {
    if (!active) return;
    const step = cfg.noteSpeed / 60;

    for (let i = notes.length - 1; i >= 0; i--) {
      const note = notes[i];
      if (note.hit) continue;

      note.y += step;
      note.el.style.top = note.y + "px";

      if (note.y > hitY + 40) {
        flashFeedback(note.key, "miss");
        playSoundSafe("sound-penalty");
        missed++;
        setStatus("Missed " + missed + " / " + cfg.maxMissedNotes + " allowed");
        updateScoreHud();
        removeNote(i);

        if (missed >= cfg.maxMissedNotes) {
          endGame(false, "Too many missed notes.");
        }
      }
    }
  }

  function onKeyDown(e) {
    if (!active || e.repeat) return;
    const key = (e.key || "").toUpperCase();
    if (cfg.keys.indexOf(key) === -1) return;
    e.preventDefault();
    if (window.PracticeSounds) PracticeSounds.unlock();

    const keyEl = document.querySelector('.thermite-key[data-key="' + key + '"]');
    if (keyEl) keyEl.classList.add("is-lit");

    let best = -1;
    let bestDist = Infinity;

    notes.forEach(function (note, idx) {
      if (note.hit || note.key !== key) return;
      const dist = Math.abs(note.y - hitY);
      if (dist < bestDist) {
        bestDist = dist;
        best = idx;
      }
    });

    if (best === -1 || bestDist > cfg.hitWindow) {
      wrongKeys++;
      flashFeedback(key, "miss");
      playSoundSafe("sound-penalty");
      updateScoreHud();
      if (wrongKeys >= cfg.maxWrongKeys) {
        endGame(false, "Too many wrong key presses.");
      }
      return;
    }

    const hit = notes[best];
    hit.hit = true;
    hit.el.remove();
    notes.splice(best, 1);

    let quality = "okay";
    if (bestDist <= 10) quality = "perfect";
    else if (bestDist <= 18) quality = "great";

    flashFeedback(key, quality);
    playSoundSafe("sound-click");

    notesHit++;
    updateProgress();
    updateScoreHud({ bump: true });

    if (!isUnlimited() && notesHit >= cfg.requiredNotes) {
      endGame(true);
    }
  }

  function onKeyUp(e) {
    const key = (e.key || "").toUpperCase();
    const keyEl = document.querySelector('.thermite-key[data-key="' + key + '"]');
    if (keyEl) keyEl.classList.remove("is-lit");
  }

  function start(config) {
    stop();

    cfg = Object.assign({}, DEFAULTS, config || {});
    if (!cfg.keys || !cfg.keys.length) cfg.keys = DEFAULTS.keys.slice();

    ended = false;
    notes = [];
    notesHit = 0;
    wrongKeys = 0;
    missed = 0;

    const el = root();
    if (!el) return;

    el.classList.add("is-active");
    el.style.display = "block";
    el.style.visibility = "visible";
    el.style.opacity = "1";
    buildUI();
    ensureScoreHud();
    updateProgress();
    setStatus(
      isUnlimited()
        ? "Unlimited practice — press " + cfg.keys.join("  ") + " when notes hit the line."
        : "Press " + cfg.keys.join("  ") + " when notes hit the glowing line."
    );
    if (window.PracticeSounds) PracticeSounds.unlock();

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        measureHitLine();
        active = true;
        spawnTimer = setInterval(spawnNote, cfg.noteSpawnRate);
        moveTimer = setInterval(tickNotes, 1000 / 60);
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);
      });
    });
  }

  function stop() {
    active = false;
    ended = false;
    if (spawnTimer) clearInterval(spawnTimer);
    if (moveTimer) clearInterval(moveTimer);
    spawnTimer = null;
    moveTimer = null;
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    notes.forEach(function (n) {
      if (n.el) n.el.remove();
    });
    notes = [];
    const el = root();
    if (el) {
      el.classList.remove("is-active");
      el.style.display = "none";
    }
    setScoreHudVisible(false);
  }

  return { start: start, stop: stop, getBestScore: getBestScore };
})();
