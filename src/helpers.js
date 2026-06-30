(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.ChatQuickNavHelpers = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function shortenTitle(value, maxLength) {
    const text = normalizeText(value);
    const limit = maxLength || 80;

    if (!text) return "图片或附件";
    if (text.length <= limit) return text;
    return `${text.slice(0, limit - 1).trimEnd()}…`;
  }

  function findActiveIndex(tops, viewportLine) {
    if (!tops.length) return -1;

    let active = 0;
    for (let index = 0; index < tops.length; index += 1) {
      if (tops[index] <= viewportLine) active = index;
      else break;
    }
    return active;
  }

  return { normalizeText, shortenTitle, findActiveIndex };
});
