const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeText,
  shortenTitle,
  findActiveIndex
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
