const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeText,
  shortenTitle,
  findActiveIndex,
  mergeEntryRecords
} = require("../src/helpers.js");

test("normalizeText collapses whitespace", () => {
  assert.equal(normalizeText("  第一行\n\n 第二行  "), "第一行 第二行");
});

test("shortenTitle supplies a fallback for attachment-only prompts", () => {
  assert.equal(shortenTitle(""), "图片或附件");
});

test("shortenTitle truncates long prompts", () => {
  assert.equal(shortenTitle("123456789", 6), "12345…");
});

test("findActiveIndex finds the latest question above the viewport line", () => {
  assert.equal(findActiveIndex([-400, 100, 700], 250), 1);
  assert.equal(findActiveIndex([500, 900], 250), 0);
  assert.equal(findActiveIndex([], 250), -1);
});

test("mergeEntryRecords retains questions temporarily removed from the DOM", () => {
  const disconnectedTarget = { isConnected: false };
  const previous = [
    { key: "turn:0", order: 0, fullText: "旧问题", target: disconnectedTarget, sequence: 1 },
    { key: "turn:2", order: 2, fullText: "新问题", target: { isConnected: true }, sequence: 2 }
  ];
  const observed = [
    { key: "turn:2", order: 2, fullText: "新问题", target: { isConnected: true } }
  ];

  const merged = mergeEntryRecords(previous, observed);
  assert.deepEqual(merged.map((entry) => entry.key), ["turn:0", "turn:2"]);
  assert.equal(merged[0].target, null);
});

test("mergeEntryRecords reconnects a cached question when it reappears", () => {
  const reconnectedTarget = { isConnected: true };
  const merged = mergeEntryRecords(
    [{ key: "turn:0", order: 0, fullText: "问题", target: null, sequence: 1 }],
    [{ key: "turn:0", order: 0, fullText: "问题", target: reconnectedTarget }]
  );

  assert.equal(merged[0].target, reconnectedTarget);
});
