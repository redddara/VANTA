// Glitch Minigames — Circuit Rhythm (practice build)
// Patched for browser practice: unlimited mode, modern keys, no NUI fade-out.

let rhythmActive = false;
let rhythmLanes = [];
let rhythmKeys = [];
let rhythmNotes = [];
let currentCombo = 0;
let maxCombo = 0;
let totalScore = 0;
let noteSpeed = 300;
let noteSpawnRate = 1000;
let spawnInterval;
let moveInterval;
let totalNotes = 0;
let notesHit = 0;
let wrongKeyCount = 0;
let maxWrongKeys = 5;
let missedNotes = 0;
let maxMissedNotes = 3;
let gameProgress = 0;
let requiredNotes = 20;
let lastHitTime = 0;

const timingWindows = {
  perfect: 10,
  great: 15,
  okay: 20
};

const scoreValues = {
  perfect: 100,
  great: 50,
  okay: 20,
  miss: 0
};

const BEST_KEY = "thermiteUnlimitedBest";

let rhythmConfig = {
  lanes: 4,
  keys: ["A", "S", "D", "F"],
  noteSpeed: 300,
  noteSpawnRate: 1000,
  requiredNotes: 20,
  maxWrongKeys: 5,
  maxMissedNotes: 3,
  difficulty: "normal",
  unlimited: false
};

function isRhythmUnlimited() {
  return rhythmConfig.unlimited === true;
}

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

function keyFromEvent(e) {
  if (e.key && e.key.length === 1) return e.key.toUpperCase();
  if (e.keyCode) return String.fromCharCode(e.keyCode).toUpperCase();
  return "";
}

function ensureUnlimitedHud() {
  if (!isRhythmUnlimited()) {
    $("#rhythm-unlimited-hud").remove();
    $("#rhythm-container").removeClass("rhythm-unlimited-mode");
    return;
  }

  $("#rhythm-container").addClass("rhythm-unlimited-mode");
  $("#rhythm-timer-label").html('Score: <span id="rhythm-progress">0</span>');

  if ($("#rhythm-unlimited-hud").length) return;

  const hud = $(
    '<div id="rhythm-unlimited-hud" class="rhythm-unlimited-hud">' +
      '<div class="rhythm-unlimited-score"><span id="rhythm-live-score">0</span><small>SCORE</small></div>' +
      '<div class="rhythm-unlimited-meta">Best <strong id="rhythm-best-score">0</strong> · ' +
      'Misses <strong id="rhythm-live-misses">0</strong>/3 · Wrong <strong id="rhythm-live-wrong">0</strong>/1</div>' +
      "</div>"
  );
  $("#rhythm-container .rhythm-display").before(hud);
}

function updateUnlimitedHud() {
  if (!isRhythmUnlimited()) return;
  $("#rhythm-live-score").text(notesHit);
  $("#rhythm-best-score").text(getBestScore());
  $("#rhythm-live-misses").text(missedNotes);
  $("#rhythm-live-wrong").text(wrongKeyCount);
  $("#rhythm-progress").text(notesHit);
  $(".rhythm-progress").css("width", "100%");
}

function setupRhythmGame(config) {
  rhythmConfig = {
    lanes: config?.lanes || 4,
    keys: config?.keys || ["A", "S", "D", "F"],
    noteSpeed: config?.noteSpeed || 300,
    noteSpawnRate: config?.noteSpawnRate || 1000,
    requiredNotes: config?.requiredNotes || 20,
    maxWrongKeys: config?.maxWrongKeys || 5,
    maxMissedNotes: config?.maxMissedNotes || 3,
    difficulty: config?.difficulty || "normal",
    unlimited: config?.unlimited === true
  };

  if (rhythmConfig.difficulty === "easy") {
    Object.keys(timingWindows).forEach(function (key) {
      timingWindows[key] *= 1.5;
    });
  } else if (rhythmConfig.difficulty === "hard") {
    Object.keys(timingWindows).forEach(function (key) {
      timingWindows[key] *= 0.7;
    });
  }

  if (rhythmConfig.keys.length > rhythmConfig.lanes) {
    rhythmConfig.keys = rhythmConfig.keys.slice(0, rhythmConfig.lanes);
  }

  while (rhythmConfig.keys.length < rhythmConfig.lanes) {
    rhythmConfig.keys.push(String.fromCharCode(65 + rhythmConfig.keys.length));
  }

  noteSpeed = rhythmConfig.noteSpeed;
  noteSpawnRate = rhythmConfig.noteSpawnRate;
  requiredNotes = rhythmConfig.requiredNotes;
  maxWrongKeys = rhythmConfig.maxWrongKeys;
  maxMissedNotes = rhythmConfig.maxMissedNotes;
  rhythmLanes = Array(rhythmConfig.lanes).fill(0);
  rhythmKeys = rhythmConfig.keys;

  $("#rhythm-key-hint").text("Press " + rhythmKeys.join(", ") + " to hit the notes");

  if (!isRhythmUnlimited()) {
    $("#rhythm-timer-label").html('Progress: <span id="rhythm-progress">0</span>%');
  }

  ensureUnlimitedHud();
  resetRhythmGame();
}

function buildRhythmUI() {
  const highway = $(".rhythm-highway");
  const keyIndicators = $(".key-indicators");

  highway.empty();
  keyIndicators.empty();

  for (let i = 0; i < rhythmConfig.lanes; i++) {
    const lane = $('<div class="rhythm-lane"></div>');
    highway.append(lane);

    const keyIndicator = $('<div class="key-indicator"></div>');
    keyIndicator.text(rhythmKeys[i]);
    keyIndicator.attr("data-lane", i);
    keyIndicators.append(keyIndicator);

    const feedback = $('<div class="rhythm-feedback" data-lane="' + i + '"></div>');
    lane.append(feedback);
  }
}

function spawnNote() {
  if (!rhythmActive) return;

  const lane = Math.floor(Math.random() * rhythmConfig.lanes);
  const highway = $(".rhythm-highway");
  const laneEl = highway.find(".rhythm-lane").eq(lane);
  const note = $('<div class="rhythm-note"></div>');
  note.css("top", "-20px");
  laneEl.append(note);

  rhythmNotes.push({
    element: note,
    lane: lane,
    position: -20,
    startTime: Date.now(),
    hit: false
  });

  totalNotes++;
  updateProgressBar();
}

function moveNotes() {
  if (!rhythmActive) return;

  const hitZonePos = $(".hit-zone").position().top;
  const moveAmount = noteSpeed / 60;

  for (let i = rhythmNotes.length - 1; i >= 0; i--) {
    const note = rhythmNotes[i];
    if (note.hit) continue;

    note.position += moveAmount;
    note.element.css("top", note.position + "px");

    if (note.position > hitZonePos + 50) {
      showFeedback(note.lane, "miss");
      breakCombo();
      missedNotes++;
      $("#rhythm-message").text("Missed " + missedNotes + "/" + maxMissedNotes + " notes allowed");
      updateUnlimitedHud();

      if (missedNotes >= maxMissedNotes) {
        stopRhythmGame(false);
      }

      note.element.remove();
      rhythmNotes.splice(i, 1);
    }
  }
}

function handleRhythmKeyPress(e) {
  if (!rhythmActive) return;

  const keyPressed = keyFromEvent(e);
  const laneIndex = rhythmKeys.indexOf(keyPressed);
  if (laneIndex === -1) return;

  e.preventDefault();
  if (window.PracticeSounds) PracticeSounds.unlock();

  $(".key-indicator").eq(laneIndex).addClass("active");

  const hitZonePos = $(".hit-zone").position().top;
  let noteHit = false;
  let hitTiming = "miss";
  let hitNoteIndex = -1;
  let closestNote = null;
  let closestDistance = Infinity;

  rhythmNotes.forEach(function (note, index) {
    if (note.lane === laneIndex && !note.hit) {
      const distance = Math.abs(note.position - hitZonePos);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestNote = note;
        hitNoteIndex = index;
      }
    }
  });

  if (closestNote) {
    if (closestDistance <= timingWindows.perfect) {
      hitTiming = "perfect";
      noteHit = true;
    } else if (closestDistance <= timingWindows.great) {
      hitTiming = "great";
      noteHit = true;
    } else if (closestDistance <= timingWindows.okay) {
      hitTiming = "okay";
      noteHit = true;
    }

    if (noteHit) {
      closestNote.hit = true;
      closestNote.element.remove();
      rhythmNotes.splice(hitNoteIndex, 1);
      updateScore(hitTiming);
      increaseCombo();
      showFeedback(laneIndex, hitTiming);
      notesHit++;
      updateProgressBar();
      playSoundSafe("sound-click");
      lastHitTime = Date.now();
    }
  } else {
    wrongKeyCount++;
    playSoundSafe("sound-penalty");
    breakCombo();
    showFeedback(laneIndex, "miss");
    updateUnlimitedHud();

    if (wrongKeyCount >= maxWrongKeys) {
      stopRhythmGame(false);
    }
  }
}

function handleRhythmKeyRelease(e) {
  if (!rhythmActive) return;
  const keyReleased = keyFromEvent(e);
  const laneIndex = rhythmKeys.indexOf(keyReleased);
  if (laneIndex === -1) return;
  $(".key-indicator").eq(laneIndex).removeClass("active");
}

function updateScore(timing) {
  const multiplier = Math.floor(currentCombo / 10) + 1;
  totalScore += scoreValues[timing] * multiplier;
}

function increaseCombo() {
  currentCombo++;
  if (currentCombo > maxCombo) maxCombo = currentCombo;
}

function breakCombo() {
  currentCombo = 0;
}

function showFeedback(lane, timing) {
  const feedback = $('.rhythm-feedback[data-lane="' + lane + '"]');
  feedback.text(timing.toUpperCase());
  feedback.removeClass("feedback-perfect feedback-great feedback-okay feedback-miss");
  feedback.addClass("feedback-" + timing);
  feedback.addClass("feedback-show");
  setTimeout(function () {
    feedback.removeClass("feedback-show");
  }, 500);
}

function updateProgressBar() {
  if (isRhythmUnlimited()) {
    updateUnlimitedHud();
    return;
  }

  gameProgress = Math.min(100, Math.round((notesHit / requiredNotes) * 100));
  $(".rhythm-progress").css("width", gameProgress + "%");
  $("#rhythm-progress").text(gameProgress);

  if (notesHit >= requiredNotes) {
    stopRhythmGame(true);
  }
}

function resetRhythmGame() {
  currentCombo = 0;
  maxCombo = 0;
  totalScore = 0;
  totalNotes = 0;
  notesHit = 0;
  wrongKeyCount = 0;
  missedNotes = 0;
  rhythmNotes = [];
  gameProgress = 0;

  $(".rhythm-progress").css("width", isRhythmUnlimited() ? "100%" : "0%");
  $("#rhythm-progress").text(isRhythmUnlimited() ? "0" : "0");
  $("#rhythm-message").text(
    isRhythmUnlimited()
      ? "Unlimited — keep hitting notes until you fail"
      : "Hit the notes in sync with the beat"
  );
  updateUnlimitedHud();
}

function startRhythmGame() {
  rhythmActive = true;
  buildRhythmUI();
  resetRhythmGame();
  $(".rhythm-note").remove();

  spawnInterval = setInterval(spawnNote, noteSpawnRate);
  moveInterval = setInterval(moveNotes, 1000 / 60);

  document.addEventListener("keydown", handleRhythmKeyPress);
  document.addEventListener("keyup", handleRhythmKeyRelease);
}

function closeRhythmGame() {
  rhythmActive = false;
  clearInterval(spawnInterval);
  clearInterval(moveInterval);
  document.removeEventListener("keydown", handleRhythmKeyPress);
  document.removeEventListener("keyup", handleRhythmKeyRelease);
  $(".rhythm-note").remove();
  rhythmNotes = [];
}

function stopRhythmGame(success) {
  rhythmActive = false;
  clearInterval(spawnInterval);
  clearInterval(moveInterval);
  document.removeEventListener("keydown", handleRhythmKeyPress);
  document.removeEventListener("keyup", handleRhythmKeyRelease);

  var roundIsNewBest = false;
  var roundBestScore = getBestScore();

  if (success) {
    $("#rhythm-message").text("SYNCHRONIZATION COMPLETE! Circuit stabilized.");
  } else {
    if (isRhythmUnlimited()) {
      roundIsNewBest = notesHit > roundBestScore;
      if (roundIsNewBest) {
        setBestScore(notesHit);
        roundBestScore = notesHit;
      }
      updateUnlimitedHud();
      $("#rhythm-message").text(
        "Score: " +
          notesHit +
          (roundIsNewBest ? " — NEW BEST!" : roundBestScore > 0 ? " · Best: " + roundBestScore : "")
      );
    } else if (missedNotes >= maxMissedNotes) {
      $("#rhythm-message").text("SYNCHRONIZATION FAILED! Too many missed notes.");
    } else if (wrongKeyCount >= maxWrongKeys) {
      $("#rhythm-message").text("SYNCHRONIZATION FAILED! Too many wrong inputs.");
    } else {
      $("#rhythm-message").text("SYNCHRONIZATION FAILED! Circuit overloaded.");
    }
    playSoundSafe("sound-failure");
  }

  setTimeout(function () {
    const result = {
      success: success,
      score: totalScore,
      maxCombo: maxCombo,
      notesHit: notesHit,
      totalNotes: totalNotes,
      accuracy: notesHit > 0 ? Math.round((notesHit / totalNotes) * 100) : 0,
      unlimited: isRhythmUnlimited(),
      bestScore: roundBestScore,
      isNewBest: roundIsNewBest
    };

    fetch("https://glitch-minigames/rhythmResult", {
      method: "POST",
      body: JSON.stringify(result)
    });

    if (!window.PRACTICE_MODE) {
      $("#rhythm-container").fadeOut(500);
    }
  }, 2000);
}

window.rhythmPracticeFunctions = {
  setup: setupRhythmGame,
  start: startRhythmGame,
  stop: closeRhythmGame
};
