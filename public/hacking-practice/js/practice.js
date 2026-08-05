(function () {

  const launcher = document.getElementById("launcher");

  const gameArea = document.getElementById("game-area");

  const resultBanner = document.getElementById("result-banner");

  const gameList = document.getElementById("game-list");

  const customOverlay = document.getElementById("custom-settings-overlay");

  const customForm = document.getElementById("custom-settings-form");

  const customTitle = document.getElementById("custom-settings-title");

  const customCancel = document.getElementById("custom-settings-cancel");



  let currentGameKey = null;

  let currentLaunchParams = null;

  let pendingCustomKey = null;

  let awaitingRetry = false;



  function showMenu() {

    launcher.classList.remove("hidden");

    gameArea.classList.add("hidden");

    document.body.classList.remove("game-active");

    awaitingRetry = false;

    currentGameKey = null;

    currentLaunchParams = null;

    hideCustomSettings();

    hideResult();

    if (window.hideAllGames) window.hideAllGames();

  }



  function hideMenu() {

    launcher.classList.add("hidden");

    gameArea.classList.remove("hidden");

    document.body.classList.add("game-active");

  }



  function showResult(success, detail) {

    awaitingRetry = true;

    if (detail && (detail.unlimited || detail.forgiving) && !success) {
      var msg = "Hits: " + (detail.notesHit || 0);
      if (detail.speedTier) {
        msg += " · Speed " + detail.speedTier + "×";
      }
      if (detail.isNewBest) {
        msg += " — NEW BEST!";
      } else if (detail.bestScore > 0) {
        msg += " · Best: " + detail.bestScore;
      }
      resultBanner.textContent = msg + " — press SPACE to retry";
    } else {
      resultBanner.textContent = success
        ? "Success — press SPACE to play again"
        : "Failed — press SPACE to retry";
    }

    resultBanner.className = "result-banner visible " + (success ? "success" : "failure");

  }



  function hideResult() {

    resultBanner.className = "result-banner";

    resultBanner.textContent = "";

  }



  function launch(key, overrideParams) {

    const entry = window.PRACTICE_CONFIG[key];

    if (!entry) return;



    currentGameKey = key;

    currentLaunchParams = overrideParams || null;

    awaitingRetry = false;

    hideMenu();

    hideResult();



    const params = overrideParams || entry.params;

    window.launchPracticeGame(entry.action, params);

  }



  function retryCurrent() {

    if (!currentGameKey || !awaitingRetry) return;

    launch(currentGameKey, currentLaunchParams);

  }



  function hideCustomSettings() {

    pendingCustomKey = null;

    if (customOverlay) {

      customOverlay.classList.add("hidden");

      customOverlay.setAttribute("aria-hidden", "true");

    }

  }



  function buildCustomParams(entry, formData) {

    const params = Object.assign({}, entry.params);

    const keyPoolPresets = {

      wasd: {

        keyPool: ["W", "A", "S", "D"],

        keyHintText: "W, A, S, D only"

      },

      launder: {

        keyPool: ["W", "A", "S", "D", "E", "F", "G", "H", "J"],

        keyHintText: "W, A, S, D, E, F, G, H, J"

      },

      extended: {

        keyPool: ["W", "A", "S", "D", "Q", "E", "R", "F", "G", "H", "J", "K", "L"],

        keyHintText: "W A S D Q E R F G H J K L"

      }

    };



    entry.settings.forEach(function (setting) {

      const raw = formData.get(setting.key);

      if (setting.key === "timeLimitSec") {

        params.timeLimit = Number(raw) * 1000;

        return;

      }

      if (setting.key === "keyPoolPreset") {

        const preset = keyPoolPresets[raw] || keyPoolPresets.launder;

        params.keyPool = preset.keyPool.slice();

        params.keyHintText = preset.keyHintText;

        return;

      }

      if (setting.key === "speedTier") {

        params.speedTier = Number(raw);

        return;

      }

      if (setting.key === "forgiving") {

        params.forgiving = raw === "yes";

        return;

      }

      if (setting.key === "sessionType") {

        if (raw === "unlimited") {

          params.unlimited = true;

          delete params.requiredNotes;

        } else {

          params.unlimited = false;

          params.requiredNotes = 45;

        }

        return;

      }

      if (setting.type === "select") {

        params[setting.key] = raw;

        return;

      }

      params[setting.key] = Number(raw);

    });



    if (params.minKeyLength > params.maxKeyLength) {

      params.maxKeyLength = params.minKeyLength;

    }

    return params;

  }



  function showCustomSettings(key) {

    const entry = window.PRACTICE_CONFIG[key];

    if (!entry || !entry.customizable || !customForm || !customOverlay) {

      launch(key);

      return;

    }



    pendingCustomKey = key;

    customTitle.textContent = entry.title;

    customForm.innerHTML = "";



    entry.settings.forEach(function (setting) {

      const field = document.createElement("div");

      field.className = "custom-settings-field";



      const label = document.createElement("label");

      label.setAttribute("for", "custom-" + setting.key);

      label.textContent = setting.label;

      field.appendChild(label);



      let input;

      if (setting.type === "select") {

        input = document.createElement("select");

        input.id = "custom-" + setting.key;

        input.name = setting.key;

        setting.options.forEach(function (option) {

          const opt = document.createElement("option");

          opt.value = option.value;

          opt.textContent = option.label;

          if (option.value === setting.default) {

            opt.selected = true;

          }

          input.appendChild(opt);

        });

      } else {

        input = document.createElement("input");

        input.type = "number";

        input.id = "custom-" + setting.key;

        input.name = setting.key;

        input.min = String(setting.min);

        input.max = String(setting.max);

        input.value = String(setting.default);

      }



      field.appendChild(input);

      customForm.appendChild(field);

    });



    customOverlay.classList.remove("hidden");

    customOverlay.setAttribute("aria-hidden", "false");

    const firstInput = customForm.querySelector("select, input");

    if (firstInput) firstInput.focus();

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

    ["ammoThermite", "ammoThermiteUnlimited", "ammoThermiteCustom", "ammoCrate"].forEach((key) => ammoGrid.appendChild(createCard(key)));

    ammoSection.appendChild(ammoGrid);

    gameList.appendChild(ammoSection);



    const boostSection = document.createElement("section");

    boostSection.innerHTML = "<h2>Boosting</h2>";

    const boostGrid = document.createElement("div");

    boostGrid.className = "game-grid";

    ["boostTrackerDots", "boostTrackerShapes", "boostTrackerCustom"].forEach((key) => boostGrid.appendChild(createCard(key)));

    boostSection.appendChild(boostGrid);

    gameList.appendChild(boostSection);



    const launderSection = document.createElement("section");

    launderSection.innerHTML = "<h2>Laundering</h2>";

    const launderGrid = document.createElement("div");

    launderGrid.className = "game-grid";

    ["launderDropOff", "launderDropOffCustom"].forEach((key) => launderGrid.appendChild(createCard(key)));

    launderSection.appendChild(launderGrid);

    gameList.appendChild(launderSection);

  }



  function createCard(key) {

    const entry = window.PRACTICE_CONFIG[key];

    const card = document.createElement("button");

    card.type = "button";

    card.className = "game-card";

    card.innerHTML = "<strong>" + entry.title + "</strong><span>" + entry.description + "</span>";

    card.addEventListener("click", function () {

      if (entry.customizable) {

        showCustomSettings(key);

      } else {

        launch(key);

      }

    });

    return card;

  }



  document.getElementById("back-btn").addEventListener("click", showMenu);



  if (customCancel) {

    customCancel.addEventListener("click", hideCustomSettings);

  }



  if (customOverlay) {

    customOverlay.addEventListener("click", function (e) {

      if (e.target === customOverlay) hideCustomSettings();

    });

  }



  if (customForm) {

    customForm.addEventListener("submit", function (e) {

      e.preventDefault();

      if (!pendingCustomKey) return;

      const entry = window.PRACTICE_CONFIG[pendingCustomKey];

      const formData = new FormData(customForm);

      const params = buildCustomParams(entry, formData);

      const key = pendingCustomKey;

      hideCustomSettings();

      launch(key, params);

    });

  }



  if (!launcher || !gameList) {

    console.error("Practice UI elements missing");

    return;

  }



  window.addEventListener("practice:gameResult", function (e) {

    showResult(e.detail.success, e.detail);

  });



  window.addEventListener("practice:cancelled", function () {

    showMenu();

  });



  document.addEventListener("keydown", function (e) {

    if (e.key === "Escape" && customOverlay && !customOverlay.classList.contains("hidden")) {

      hideCustomSettings();

      return;

    }

    if (e.key !== " " && e.code !== "Space") return;

    if (!awaitingRetry || !currentGameKey || gameArea.classList.contains("hidden")) return;

    e.preventDefault();

    retryCurrent();

  });



  window.retryPracticeGame = retryCurrent;



  renderMenu();

})();

