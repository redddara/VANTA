(function () {

  const launcher = document.getElementById("launcher");

  const gameArea = document.getElementById("game-area");

  const resultBanner = document.getElementById("result-banner");

  const gameList = document.getElementById("game-list");



  let currentGameKey = null;

  let awaitingRetry = false;



  function showMenu() {

    launcher.classList.remove("hidden");

    gameArea.classList.add("hidden");

    document.body.classList.remove("game-active");

    awaitingRetry = false;

    currentGameKey = null;

    hideResult();

    if (window.hideAllGames) window.hideAllGames();

  }



  function hideMenu() {

    launcher.classList.add("hidden");

    gameArea.classList.remove("hidden");

    document.body.classList.add("game-active");

  }



  function showResult(success) {

    awaitingRetry = true;

    resultBanner.textContent = success

      ? "Success — press SPACE to play again"

      : "Failed — press SPACE to retry";

    resultBanner.className = "result-banner visible " + (success ? "success" : "failure");

  }



  function hideResult() {

    resultBanner.className = "result-banner";

    resultBanner.textContent = "";

  }



  function launch(key) {

    const entry = window.PRACTICE_CONFIG[key];

    if (!entry) return;



    currentGameKey = key;

    awaitingRetry = false;

    hideMenu();

    hideResult();



    if (key === "ammoThermite" && window.ThermitePractice) {

      try {

        hideElOnlyOthers();

        window.ThermitePractice.start(entry.params);

      } catch (err) {

        console.error(err);

        alert("Thermite failed to start: " + err.message);

      }

      return;

    }



    if (typeof window.launchPracticeGame !== "function") {

      alert("Could not load practice scripts. Double-click OPEN.bat or index.html inside this folder.");

      return;

    }

    window.launchPracticeGame(entry.action, entry.params);

  }



  function retryCurrent() {

    if (!currentGameKey || !awaitingRetry) return;

    launch(currentGameKey);

  }



  function hideElOnlyOthers() {

    ["numbered-sequence-container", "pairs-container", "word-crack-container"].forEach(function (id) {

      const el = document.getElementById(id);

      if (el) {

        el.classList.remove("active");

        el.style.display = "none";

      }

    });

    if (window.wordCrackFunctions && wordCrackFunctions.close) wordCrackFunctions.close();

    if (window.pairsFunctions && pairsFunctions.close) pairsFunctions.close();

    if (typeof window.closeNumberedSequenceGame === "function") closeNumberedSequenceGame();

  }



  function renderMenu() {

    if (!gameList) return;

    gameList.innerHTML = "";



    const storeSection = document.createElement("section");

    storeSection.innerHTML = "<h2>Store Robbery</h2>";

    const storeGrid = document.createElement("div");

    storeGrid.className = "game-grid";

    ["storeUsb", "storeDoor"].forEach((key) => storeGrid.appendChild(createCard(key)));

    storeSection.appendChild(storeGrid);

    gameList.appendChild(storeSection);



    const ammoSection = document.createElement("section");

    ammoSection.innerHTML = "<h2>Ammunation Robbery</h2>";

    const ammoGrid = document.createElement("div");

    ammoGrid.className = "game-grid";

    ["ammoThermite", "ammoCrate"].forEach((key) => ammoGrid.appendChild(createCard(key)));

    ammoSection.appendChild(ammoGrid);

    gameList.appendChild(ammoSection);

  }



  function createCard(key) {

    const entry = window.PRACTICE_CONFIG[key];

    const card = document.createElement("button");

    card.type = "button";

    card.className = "game-card";

    card.innerHTML = "<strong>" + entry.title + "</strong><span>" + entry.description + "</span>";

    card.addEventListener("click", () => launch(key));

    return card;

  }



  document.getElementById("back-btn").addEventListener("click", showMenu);



  if (!launcher || !gameList) {

    console.error("Practice UI elements missing");

    return;

  }



  window.addEventListener("practice:gameResult", function (e) {

    showResult(e.detail.success);

  });



  window.addEventListener("practice:cancelled", function () {

    showMenu();

  });



  document.addEventListener("keydown", function (e) {

    if (e.key !== " " && e.code !== "Space") return;

    if (!awaitingRetry || !currentGameKey || gameArea.classList.contains("hidden")) return;

    e.preventDefault();

    retryCurrent();

  });



  window.retryPracticeGame = retryCurrent;



  renderMenu();

})();


