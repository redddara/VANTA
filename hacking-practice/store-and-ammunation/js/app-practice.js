// Practice launcher — uses glitch-minigames UI (same as in-game)

window.MinigameColors = (window.PRACTICE_SERVER_THEME && window.PRACTICE_SERVER_THEME.colors) || {
  primary: "#d4af37",
  primaryRgba: "212, 175, 55",
  secondary: "#9c7c19",
  success: "#d4af37",
  failure: "#b22222"
};



function hideEl(id) {

  const el = document.getElementById(id);

  if (!el) return;

  el.classList.remove("active", "is-active");

  el.style.display = "none";

}



function showEl(id, display) {

  const el = document.getElementById(id);

  if (!el) return;

  el.classList.add("active");

  el.style.display = display || "flex";

  el.style.visibility = "visible";

  el.style.opacity = "1";

}



function hideAllGames() {

  if (window.rhythmPracticeFunctions) rhythmPracticeFunctions.stop();

  if (typeof window.closeNumberedSequenceGame === "function") closeNumberedSequenceGame();

  if (window.wordCrackFunctions && wordCrackFunctions.close) wordCrackFunctions.close();

  if (window.pairsFunctions && pairsFunctions.close) pairsFunctions.close();



  if (typeof window.closeSymbolSearchGame === "function") closeSymbolSearchGame();

  if (window.backdoorSequenceFunctions && backdoorSequenceFunctions.stop) backdoorSequenceFunctions.stop();

  hideEl("rhythm-container");

  hideEl("numbered-sequence-container");

  hideEl("pairs-container");

  hideEl("word-crack-container");

  hideEl("symbol-search-container");

  hideEl("sequence-container");

}



window.hideAllGames = hideAllGames;



window.launchPracticeGame = function (action, config) {

  try {

    hideAllGames();



    if (action === "startRhythm") {

      if (!window.rhythmPracticeFunctions || !window.jQuery) {

        showBootError("Rhythm game failed to load. Check js/rhythm.js and jquery.");

        return;

      }

      if (window.wordCrackFunctions && wordCrackFunctions.close) wordCrackFunctions.close();

      if (window.pairsFunctions && pairsFunctions.close) pairsFunctions.close();

      if (typeof window.closeNumberedSequenceGame === "function") closeNumberedSequenceGame();



      rhythmPracticeFunctions.setup(config || {});

      showEl("rhythm-container", "flex");

      rhythmPracticeFunctions.start();

      return;

    }



    if (action === "startWordCrack" && window.wordCrackFunctions) {

      showEl("word-crack-container", "flex");

      window.wordCrackFunctions.start(config);

    } else if (action === "startPairs" && window.pairsFunctions) {

      showEl("pairs-container", "flex");

      window.pairsFunctions.start(config);

    } else if (action === "startNumberedSequence") {

      showEl("numbered-sequence-container", "flex");

      if (typeof window.startNumberedSequenceGame === "function") {

        window.startNumberedSequenceGame(config);

      }

    } else if (action === "startSymbolSearch") {

      if (!window.jQuery) {

        showBootError("Symbol Search failed to load. Check js/symbolSearch.js and jquery.");

        return;

      }

      showEl("symbol-search-container", "flex");

      if (typeof window.startSymbolSearchGame === "function") {

        window.startSymbolSearchGame(config);

      }

    } else if (action === "startBackdoorSequence") {

      if (!window.jQuery || !window.backdoorSequenceFunctions) {

        showBootError("Backdoor Sequence failed to load. Check js/backdoorSequence.js and jquery.");

        return;

      }

      showEl("sequence-container", "flex");

      window.backdoorSequenceFunctions.start(config || {});

    }

  } catch (err) {

    console.error(err);

    showBootError("Game error: " + err.message);

  }

};



function showBootError(msg) {

  let box = document.getElementById("boot-error");

  if (!box) {

    box = document.createElement("div");

    box.id = "boot-error";

    box.style.cssText =

      "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#111;z-index:99999;padding:2rem;";

    box.innerHTML =

      '<div style="max-width:520px;padding:1.5rem;border:1px solid #ff4444;border-radius:10px;background:#1a1010;color:#ffb4b4;font-family:system-ui,sans-serif;"></div>';

    document.body.appendChild(box);

  }

  box.firstElementChild.textContent = msg;

  box.style.display = "flex";

}



document.addEventListener("DOMContentLoaded", function () {

  document.addEventListener("keydown", function (e) {

    if (window.backdoorSequenceFunctions && backdoorSequenceFunctions.isActive()) {

      const key = backdoorSequenceFunctions.keyCodeMap[e.keyCode];

      if (key) {

        e.preventDefault();

        backdoorSequenceFunctions.handleKeyPress(key);

      }

      return;

    }

    if (e.key === "Escape") {

      hideAllGames();

      window.dispatchEvent(new CustomEvent("practice:cancelled"));

    }

  });

});


