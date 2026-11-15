// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createRow, createChineseWorksheet, normalizeWorksheet, renderWorksheet, splitText, getReadingOptions } = require("../worksheet.js");
const data = require("../zhuyin-data.js");
const count = (svg, pattern) => (svg.match(pattern) || []).length;

test("Chinese A4 preset fits thirteen eight-character rows with Han and Zhuyin writing areas", () => {
  const config = createChineseWorksheet();
  const result = renderWorksheet(config);
  assert.equal(config.grid_style, "tian");
  assert.equal(result.pages.length, 1);
  assert.equal(result.columns, 8);
  assert.equal(result.rows_per_page, 13);
  assert.equal(count(result.pages[0], /class="han-grid"/g), 104);
  assert.equal(count(result.pages[0], /class="zhuyin-grid"/g), 104);
  const rows = [...result.pages[0].matchAll(/class="practice-row"[^>]*data-x="([^"]+)" data-y="([^"]+)" data-width="([^"]+)" data-height="([^"]+)" data-cell-width="([^"]+)"/g)];
  assert.equal(rows.length, 13);
  rows.forEach((row, index) => {
    assert.equal(Number(row[1]), 8);
    assert.equal(Number(row[2]), 36 + index * 19);
    assert.equal(Number(row[3]), 194);
    assert.equal(Number(row[4]), 17);
    assert.equal(Number(row[5]), 22.5);
    assert.ok(Number(row[1]) + Number(row[3]) <= 210 - 8);
    assert.ok(Number(row[2]) + Number(row[4]) <= 297 - 8);
  });
  assert.ok(result.pages[0].includes('data-cell-pitch="24.5"'));
  const firstRowCells = [...result.pages[0].matchAll(/class="han-grid" x="([^"]+)"/g)].slice(0, 8);
  firstRowCells.forEach((cell, column) => assert.ok(Math.abs(Number(cell[1]) - (9 + column * 24.5)) < 0.0001));
  assert.ok(result.pages[0].includes("'Bpmf Zihi Kai', serif"));
  assert.ok(result.pages[0].includes(">姓名</text>"));
  assert.equal(result.warnings.length, 0);
});

test("Chinese horizontal gaps affect capacity and preserve older worksheets without a gap setting", () => {
  const config = createChineseWorksheet();
  const wider = renderWorksheet({ ...config, cell_gap_mm: 3 });
  assert.equal(wider.columns, 7);
  assert.ok(wider.warnings.some((warning) => warning.includes("7 格")));
  const single = renderWorksheet({ ...config, columns: 1 });
  assert.ok(single.pages[0].includes('data-width="22.5"'));
  const old = { ...config, cell_width_mm: 24 };
  delete old.cell_gap_mm;
  assert.equal(normalizeWorksheet(old).cell_gap_mm, 0);
  const oldResult = renderWorksheet(old);
  assert.equal(oldResult.columns, 8);
  assert.ok(oldResult.pages[0].includes('data-x="9" data-y="36" data-width="192"'));
  assert.deepEqual(oldResult.pages, renderWorksheet({ ...old, cell_gap_mm: 0 }).pages);
  for (const gap of [-1, 13, NaN, Infinity, "2"]) assert.throws(() => renderWorksheet({ ...config, cell_gap_mm: gap }), /中文格間距/);
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
  assert.equal(count(mi, /<line /g) - count(tian, /<line /g), 208);
  assert.equal(count(tian, /<line /g) - count(square, /<line /g), 208);
  const result = renderWorksheet({ ...config, paper_size: "A5", orientation: "landscape" });
  assert.equal(result.rows_per_page, 5);
  assert.equal(result.pages.length, 2);
  assert.ok(result.warnings.some((warning) => warning.includes("5 行")));
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
