// Apply glitch-minigames server theme (same as setColors NUI message in-game)
(function () {
  function applyPracticeTheme(options) {
    options = options || window.PRACTICE_SERVER_THEME || {};
    var colors = options.colors;
    if (!colors) return;

    window.MinigameColors = colors;

    var visualTheme = options.visualTheme || "classic";
    var opacity = options.backgroundOpacity;
    if (opacity === undefined) opacity = 0.8;

    document.body.classList.remove("theme-classic", "theme-modern");
    document.body.classList.add("theme-" + visualTheme);

    var root = document.documentElement;
    root.style.setProperty("--background-opacity", String(opacity));
    root.style.setProperty(
      "--background-gradient-1-alpha",
      "rgba(" + colors.backgroundGradient1Rgba + ", " + opacity + ")"
    );
    root.style.setProperty(
      "--background-gradient-2-alpha",
      "rgba(" + colors.backgroundGradient2Rgba + ", " + opacity + ")"
    );
    root.style.setProperty(
      "--background-secondary-alpha",
      "rgba(" + colors.backgroundSecondaryRgba + ", " + opacity + ")"
    );
    root.style.setProperty(
      "--background-tertiary-alpha",
      "rgba(" + colors.backgroundTertiaryRgba + ", " + opacity + ")"
    );

    root.style.setProperty("--primary-color", colors.primary);
    root.style.setProperty("--secondary-color", colors.secondary);
    root.style.setProperty("--success-color", colors.success);
    root.style.setProperty("--failure-color", colors.failure);
    root.style.setProperty("--warning-color", colors.warning);
    root.style.setProperty("--background-color", colors.background);
    root.style.setProperty("--background-gradient-1", colors.backgroundGradient1);
    root.style.setProperty("--background-gradient-2", colors.backgroundGradient2);
    root.style.setProperty("--background-secondary", colors.backgroundSecondary);
    root.style.setProperty("--background-tertiary", colors.backgroundTertiary);
    root.style.setProperty("--border-color", colors.border);
    root.style.setProperty("--text-color", colors.text);
    root.style.setProperty("--text-secondary-color", colors.textSecondary);
    root.style.setProperty("--danger-color", colors.danger);
    root.style.setProperty("--safe-color", colors.safe);

    if (colors.minigameColor1) root.style.setProperty("--minigame-color-1", colors.minigameColor1);
    if (colors.minigameColor2) root.style.setProperty("--minigame-color-2", colors.minigameColor2);
    if (colors.minigameColor3) root.style.setProperty("--minigame-color-3", colors.minigameColor3);
    if (colors.minigameColor4) root.style.setProperty("--minigame-color-4", colors.minigameColor4);
    if (colors.minigameColor5) root.style.setProperty("--minigame-color-5", colors.minigameColor5);

    root.style.setProperty("--neon-blue", colors.primary);
    root.style.setProperty("--light-blue", colors.primary);
    root.style.setProperty("--safe-zone", colors.safe);
    root.style.setProperty("--glow", "rgba(" + colors.primaryRgba + ", 0.7)");
    root.style.setProperty("--glow-color", colors.primary);
    root.style.setProperty("--text", colors.text);
  }

  window.applyPracticeTheme = applyPracticeTheme;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      applyPracticeTheme();
    });
  } else {
    applyPracticeTheme();
  }
})();
