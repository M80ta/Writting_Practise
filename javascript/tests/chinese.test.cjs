// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createRow, createChineseWorksheet, normalizeWorksheet, renderWorksheet, splitText, getReadingOptions } = require("../worksheet.js");
const data = require("../zhuyin-data.js");
const count = (svg, pattern) => (svg.match(pattern) || []).length;

test("Chinese preset prints six-character rows with Han and Zhuyin writing areas", () => {
  const config = createChineseWorksheet();
  const result = renderWorksheet(config);
  assert.equal(config.grid_style, "tian");
  assert.equal(result.pages.length, 1);
  assert.equal(result.columns, 6);
  assert.equal(result.rows_per_page, 8);
  assert.equal(count(result.pages[0], /class="han-grid"/g), 48);
  assert.equal(count(result.pages[0], /class="zhuyin-grid"/g), 48);
  assert.ok(result.pages[0].includes("'Bpmf Zihi Kai', serif"));
  assert.ok(result.pages[0].includes(">姓名</text>"));
  assert.equal(result.warnings.length, 0);
});

test("IVS pronunciation selectors stay with their Han character and do not consume a second cell", () => {
  const alternate = "行" + String.fromCodePoint(0xe01e1);
  assert.deepEqual(splitText(alternate + "走"), [alternate, "走"]);
  const config = { ...createChineseWorksheet(), columns: 2, rows: [createRow(alternate + "走", { font: "zhuyin", font_size_mm: 16 })] };
  const result = renderWorksheet(config);
  assert.ok(result.pages[0].includes(`>${alternate}</text>`));
  assert.ok(result.pages[0].includes(">走</text>"));
  assert.equal(result.warnings.length, 0);
  const options = getReadingOptions("行");
  assert.ok(options.some((option) => option.value === alternate));
  assert.ok(options.some((option) => option.value === "行" + String.fromCodePoint(0xe01e0)));
  assert.deepEqual(getReadingOptions("銀行"), []);
});

test("plain Han font uses the no-Zhuyin glyph without overwriting the saved reading", () => {
  const alternate = "重" + String.fromCodePoint(0xe01e1);
  const config = { ...createChineseWorksheet(), rows: [createRow(alternate, { font: "kai", font_size_mm: 16 })] };
  const normalized = normalizeWorksheet(config);
  assert.equal(normalized.rows[0].text, alternate);
  const svg = renderWorksheet(config).pages[0];
  assert.ok(svg.includes(">重" + String.fromCodePoint(0xe01e0) + "</text>"));
  assert.ok(!svg.includes(`>${alternate}</text>`));
});

test("Mi and square guides differ while Chinese landscape capacity still paginates", () => {
  const config = createChineseWorksheet();
  const tian = renderWorksheet(config).pages[0];
  const mi = renderWorksheet({ ...config, grid_style: "mi" }).pages[0];
  const square = renderWorksheet({ ...config, grid_style: "square" }).pages[0];
  assert.equal(count(mi, /<line /g) - count(tian, /<line /g), 96);
  assert.equal(count(tian, /<line /g) - count(square, /<line /g), 96);
  const result = renderWorksheet({ ...config, paper_size: "A5", orientation: "landscape" });
  assert.equal(result.rows_per_page, 3);
  assert.equal(result.pages.length, 2);
  assert.ok(result.warnings.some((warning) => warning.includes("3 行")));
  assert.throws(() => renderWorksheet({ ...config, rows: [createRow("整句", { placement: "flow" })] }), /逐格/);
});

test("warns about Han characters outside the annotation coverage", () => {
  const result = renderWorksheet({ ...createChineseWorksheet(), rows: [createRow(String.fromCodePoint(0x31350), { font: "zhuyin", font_size_mm: 16 })] });
  assert.ok(result.warnings.some((warning) => warning.includes("注音字集")));
});

test("bundled original Chinese font and upstream licenses match the derived cmap metadata", () => {
  const font = fs.readFileSync(path.join(__dirname, "../fonts/BpmfZihiKaiStd-Regular.ttf"));
  assert.equal(crypto.createHash("sha256").update(font).digest("hex"), data.sha256);
  assert.equal(data.sha256, "b5de180c456840edc57d07256d7d167a95306c81ab1936677c4706491a9e7d37");
  assert.ok(Array.from(data.supported).length > 13000);
  for (const file of ["LICENSE-ZihiKaiStd.txt", "LICENSE-2.0.txt", "BpmfZihiKaiStd-NOTICE.txt"]) assert.ok(fs.existsSync(path.join(__dirname, "../fonts", file)));
});
