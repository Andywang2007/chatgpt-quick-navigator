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

  function mergeEntryRecords(previousEntries, observedEntries) {
    const previousByKey = new Map(
      previousEntries.map((entry) => [entry.key, entry])
    );
    const observedKeys = new Set();
    let nextSequence = previousEntries.reduce(
      (maximum, entry) => Math.max(maximum, entry.sequence || 0),
      0
    ) + 1;
    const merged = [];

    observedEntries.forEach((entry) => {
      const previous = previousByKey.get(entry.key);
      observedKeys.add(entry.key);
      merged.push({
        ...previous,
        ...entry,
        sequence: previous?.sequence || nextSequence++
      });
    });

    previousEntries.forEach((entry) => {
      if (observedKeys.has(entry.key)) return;
      merged.push({
        ...entry,
        target: entry.target?.isConnected === false ? null : entry.target
      });
    });

    return merged.sort((left, right) => {
      const leftHasOrder = Number.isFinite(left.order);
      const rightHasOrder = Number.isFinite(right.order);
      if (leftHasOrder && rightHasOrder && left.order !== right.order) {
        return left.order - right.order;
      }
      if (leftHasOrder !== rightHasOrder) return leftHasOrder ? -1 : 1;
      return left.sequence - right.sequence;
    });
  }

  return { normalizeText, shortenTitle, findActiveIndex, mergeEntryRecords };
});
