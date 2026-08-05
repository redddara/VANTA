// Practice launcher — vanilla JS only (thermite must work even if jQuery CDN fails)
window.MinigameColors = {
  primary: "#2dd4a8",
  secondary: "#1a8c6f",
  success: "#2dd4a8",
  failure: "#ff4444"
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
  if (window.ThermitePractice) ThermitePractice.stop();
  if (typeof window.closeNumberedSequenceGame === "function") closeNumberedSequenceGame();
  if (window.wordCrackFunctions && wordCrackFunctions.close) wordCrackFunctions.close();
  if (window.pairsFunctions && pairsFunctions.close) pairsFunctions.close();

  hideEl("numbered-sequence-container");
  hideEl("pairs-container");
  hideEl("word-crack-container");
  hideEl("thermite-game");
}

window.hideAllGames = hideAllGames;

window.launchPracticeGame = function (action, config) {
  try {
    if (action === "startRhythm") {
      hideEl("numbered-sequence-container");
      hideEl("pairs-container");
      hideEl("word-crack-container");
      if (window.wordCrackFunctions && wordCrackFunctions.close) wordCrackFunctions.close();
      if (window.pairsFunctions && pairsFunctions.close) pairsFunctions.close();
      if (typeof window.closeNumberedSequenceGame === "function") closeNumberedSequenceGame();

      if (!window.ThermitePractice) {
        showBootError("ThermitePractice failed to load. Check js/thermite-practice.js");
        return;
      }
      window.ThermitePractice.start(config || {});
      return;
    }

    hideAllGames();

    if (action === "startWordCrack" && window.wordCrackFunctions) {
      window.wordCrackFunctions.start(config);
    } else if (action === "startPairs" && window.pairsFunctions) {
      window.pairsFunctions.start(config);
    } else if (action === "startNumberedSequence") {
      showEl("numbered-sequence-container", "flex");
      if (typeof window.startNumberedSequenceGame === "function") {
        window.startNumberedSequenceGame(config);
      }
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
    if (e.key === "Escape") {
      hideAllGames();
      window.dispatchEvent(new CustomEvent("practice:cancelled"));
    }
  });
});
