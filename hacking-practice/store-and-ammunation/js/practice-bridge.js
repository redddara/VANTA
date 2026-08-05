// Browser shim for FiveM NUI callbacks used by glitch-minigames
(function () {
  window.GetParentResourceName = function () {
    return "glitch-minigames";
  };

  // numberedSequence.js only posts results when invokeNative is set
  window.invokeNative = true;
  window.PRACTICE_MODE = true;

  function parseBody(data) {
    if (!data) return {};
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch (_) {
        return {};
      }
    }
    return data;
  }

  function handleNuiCallback(url, rawBody) {
    const path = url.replace(/^https:\/\/[^/]+\//, "");
    const body = parseBody(rawBody);

    if (path.endsWith("Close")) {
      window.dispatchEvent(new CustomEvent("practice:gameClosed"));
      return;
    }

    if (path.endsWith("Result") || path === "rhythmResult") {
      const success = body.success !== false;
      window.dispatchEvent(
        new CustomEvent("practice:gameResult", {
          detail: {
            path,
            success,
            body,
            notesHit: body.notesHit,
            unlimited: body.unlimited,
            bestScore: body.bestScore,
            isNewBest: body.isNewBest
          }
        })
      );
    }
  }

  function patchJqueryPost() {
    if (!window.jQuery) return;
    const originalPost = window.jQuery.post;
    window.jQuery.post = function (url) {
      if (typeof url === "string" && url.startsWith("https://glitch-minigames/")) {
        handleNuiCallback(url, arguments[1]);
        return window.jQuery.Deferred().resolve().promise();
      }
      return originalPost.apply(this, arguments);
    };
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = function (url, options) {
    if (typeof url === "string" && url.startsWith("https://glitch-minigames/")) {
      handleNuiCallback(url, options && options.body);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return originalFetch(url, options);
  };

  if (window.jQuery) {
    patchJqueryPost();
  } else {
    document.addEventListener("DOMContentLoaded", patchJqueryPost);
  }
})();
