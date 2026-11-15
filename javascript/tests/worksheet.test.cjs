// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
const test = require("node:test");
const assert = require("node:assert/strict");
const { createRow, createWorksheet, normalizeWorksheet, renderWorksheet } = require("../worksheet.js");

test("A4 dimensions, two writing lines, three-page pagination, and padded final rows", () => {
  const result = renderWorksheet(createWorksheet(Array.from({ length: 31 }, () => createRow())));
  assert.equal(result.width_mm, 210);
  assert.equal(result.height_mm, 297);
  assert.equal(result.pages.length, 3);
  assert.equal(result.rows_per_page, 15);
  assert.equal(result.columns, 16);
  assert.deepEqual(result.warnings, []);
  for (const page of result.pages) {
    assert.equal((page.match(/class="practice-row"/g) || []).length, 15);
    assert.equal((page.match(/stroke-width=".22"/g) || []).length, 15);
    assert.equal((page.match(/stroke-width=".3"/g) || []).length, 15);
    const rows = [...page.matchAll(/class="practice-row"[^>]*data-x="([^"]+)" data-y="([^"]+)" data-width="([^"]+)" data-height="([^"]+)" data-cell-width="([^"]+)"/g)];
    rows.forEach((row, index) => {
      assert.equal(Number(row[1]), 9);
      assert.equal(Number(row[2]), 36 + index * 16);
      assert.equal(Number(row[3]), 192);
      assert.equal(Number(row[4]), 14);
      assert.equal(Number(row[5]), 12);
      assert.ok(Number(row[1]) + Number(row[3]) <= 210 - 8);
      assert.ok(Number(row[2]) + Number(row[4]) <= 297 - 8);
    });
  }
  assert.ok(result.pages[2].includes("data-row=\"44\""));
});

test("A5 landscape caps rows and columns and reports its actual layout", () => {
  const result = renderWorksheet({ paper_size: "A5", orientation: "landscape", rows_per_page: 30, columns: 40 });
  assert.equal(result.width_mm, 210);
  assert.equal(result.height_mm, 148);
  assert.equal(result.rows_per_page, 6);
  assert.equal(result.columns, 16);
  assert.equal(result.warnings.length, 2);
});

test("Letter landscape, black and white, no header, and optional vertical guides", () => {
  const result = renderWorksheet({ paper_size: "Letter", orientation: "landscape", print_mode: "grayscale", show_header: false, vertical_guides: false });
  assert.equal(result.width_mm, 279.4);
  assert.equal(result.height_mm, 215.9);
  assert.ok(!result.pages[0].includes(">NAME</text>"));
  assert.ok(!result.pages[0].includes('stroke-dasharray=".5 1.2"'));
  assert.ok(result.pages[0].includes('stroke="#8a8a8a"'));
});

test("word and sentence counts include the original and remain independent per row", () => {
  const result = renderWorksheet({ rows: [
    createRow("apple", { placement: "flow", repeat_count: 1 }),
    createRow("Keep growing.", { placement: "flow", repeat_count: 3, font: "cursive", style: "solid" }),
  ] });
  assert.ok(result.pages[0].includes(">apple</text>"));
  assert.ok(result.pages[0].includes(">Keep growing.   Keep growing.   Keep growing.</text>"));
  assert.ok(result.pages[0].includes("'Caveat', cursive"));
  assert.ok(result.pages[0].includes('xml:space="preserve"'));
  assert.equal(normalizeWorksheet({ rows: [{ text: "apple" }] }).rows[0].repeat_count, 1);
});

test("cell overrides support words, intentional blanks, and Unicode code points", () => {
  const result = renderWorksheet({ columns: 4, rows: [createRow("A😀B", { cells: ["Hello", "", null, "World"] })] });
  assert.ok(result.pages[0].includes(">Hello</text>"));
  assert.ok(result.pages[0].includes(">B</text>"));
  assert.ok(result.pages[0].includes(">World</text>"));
  assert.ok(!result.pages[0].includes("😀"));
  const repeated = renderWorksheet({ columns: 4, rows: [createRow("Ab", { repeat: true })] });
  assert.equal((repeated.pages[0].match(/>A<\/text>/g) || []).length, 2);
});

test("all user text is XML escaped and invalid XML characters are replaced", () => {
  const content = '<img onerror="alert(1)">&\'\u0000\ud800';
  const svg = renderWorksheet({ title: "<script>&", rows: [createRow(content, { placement: "flow" })] }).pages[0];
  assert.ok(!svg.includes("<script>"));
  assert.ok(!svg.includes("<img"));
  assert.ok(svg.includes("&lt;img onerror=&quot;alert(1)&quot;&gt;&amp;&apos;��"));
  assert.ok(!svg.includes("\u0000"));
});

test("rejects invalid counts, dimensions, enums, oversized content, and unexpected fields", () => {
  for (const repeat_count of [0, -1, 101, 1.5, "3", NaN]) assert.throws(() => renderWorksheet({ rows: [createRow("apple", { repeat_count })] }));
  for (const config of [
    { cell_height_mm: NaN }, { columns: 0 }, { columns: 1.5 }, { paper_size: "__proto__" },
    { orientation: "injected" }, { title: "x".repeat(81) }, { unexpected: true },
    { rows: Array.from({ length: 201 }, () => createRow()) },
    { rows: [createRow("x".repeat(501))] }, { rows: [createRow("", { font: "toString" })] },
    { rows: [createRow("", { cells: [123] })] }, { rows: [createRow("", { cells: ["x".repeat(81)] })] },
  ]) assert.throws(() => renderWorksheet(config));
  assert.equal(renderWorksheet({ rows: [createRow("apple", { placement: "flow", repeat_count: 100 })] }).pages.length, 1);
});

test("restores old Rust v1 auto-fill projects without changing their source object", () => {
  const original = { margin_mm: 14, columns: 12, cell_width_mm: 15, rows: [{ text: "apple", placement: "flow", repeat: true }] };
  const normalized = normalizeWorksheet(original);
  assert.equal(normalized.rows[0].repeat_count, 4);
  assert.equal(original.rows[0].repeat_count, undefined);
});

test("blank styles omit reference text while preserving the two lines", () => {
  const result = renderWorksheet({ rows: [createRow("hidden reference", { style: "blank" })] });
  assert.ok(!result.pages[0].includes("hidden reference"));
  assert.equal((result.pages[0].match(/stroke-width=".22"/g) || []).length, 15);
});

test("warns when text or preserved cell overrides exceed the visible columns", () => {
  const result = renderWorksheet({ columns: 2, rows: [createRow("ABCDE", { cells: [null, null, "outside"] })] });
  assert.equal(result.warnings.length, 1);
  assert.ok(!result.pages[0].includes(">outside</text>"));
});
