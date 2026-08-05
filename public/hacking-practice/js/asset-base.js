/**
 * Resolve asset paths relative to this HTML file (works for file:// and http://).
 */
window.PracticeAssetBase = (function () {
  var base = "";
  try {
    var path = window.location.pathname || "";
    if (/^https?:/i.test(window.location.protocol)) {
      base = window.location.href.replace(/[^/]*$/, "");
    } else if (window.location.href.indexOf("file:") === 0) {
      base = window.location.href.replace(/[^/\\]*$/, "");
    }
  } catch (_) {}
  function url(relative) {
    if (!relative) return relative;
    if (/^https?:\/\//i.test(relative) || /^file:/i.test(relative)) return relative;
    try {
      return new URL(relative, base || window.location.href).href;
    } catch (_) {
      return relative;
    }
  }
  return { url: url, base: base };
})();
