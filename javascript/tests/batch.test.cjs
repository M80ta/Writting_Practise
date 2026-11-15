// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const { createRow, createWorksheet, createChineseWorksheet, parseWordList, createBatchRows, normalizeWorksheet, renderWorksheet } = require("../worksheet.js");
const svgDocument = (svg) => new JSDOM(svg, { contentType: "image/svg+xml" }).window.document;

test("batch lists accept quoted words, lines, CSV, phrases, apostrophes, and Chinese punctuation", () => {
  assert.deepEqual(parseWordList('"mix" "crop" "cut" "measure" "pour"'), ["mix", "crop", "cut", "measure", "pour"]);
  assert.deepEqual(parseWordList('mix\r\ncrop,cut;measure\tpour\n\n'), ["mix", "crop", "cut", "measure", "pour"]);
  assert.deepEqual(parseWordList('ice cream\n"take off", "say ""hello"""\ndon\'t\n\'don\'t\''), ["ice cream", "take off", 'say "hello"', "don't", "don't"]);
  assert.deepEqual(parseWordList('“攪拌” “種植”、切開，測量；倒入'), ["攪拌", "種植", "切開", "測量", "倒入"]);
  assert.deepEqual(parseWordList('"ice cream, please"\nmix\nmix'), ["ice cream, please", "mix", "mix"]);
  for (const text of ["", " , ; \n", " ".repeat(100000), '"mix', "x".repeat(501), Array(201).fill("mix").join("\n")]) assert.throws(() => parseWordList(text));
});

test("English batches keep mixed copy styles and a blank writing area instead of filling the row", () => {
  const batch = createBatchRows('"mix" "crop" "cut" "measure" "pour"', { start_number: 40, additional_count: 2, first_style: "solid", following_style: "light", blank_cells: 4 });
  const result = renderWorksheet(createWorksheet(batch.rows));
  assert.equal(batch.word_count, 5);
  assert.equal(batch.next_number, 45);
  assert.deepEqual(batch.rows.map((row) => row.sequence_number), [40, 41, 42, 43, 44]);
  assert.equal(result.pages.length, 1);
  const document = svgDocument(result.pages[0]);
  const rows = [...document.querySelectorAll(".practice-row")];
  for (let index = 0; index < 5; index++) {
    const row = rows[index];
    const copies = [...row.querySelectorAll(".practice-copy")];
    assert.equal(copies.length, 3);
    assert.equal(copies[0].dataset.style, "solid");
    assert.deepEqual(copies.slice(1).map((copy) => copy.dataset.style), ["light", "light"]);
    assert.ok(copies.every((copy) => copy.textContent === batch.rows[index].text));
    const blank = row.querySelector(".practice-blank");
    assert.equal(Number(blank.getAttribute("width")), 48);
    copies.forEach((copy) => {
      const text = copy.querySelector("text");
      assert.ok(Number(text.getAttribute("x")) + Number(text.getAttribute("data-max-width")) < Number(blank.getAttribute("x")));
    });
    const number = row.querySelector(".worksheet-number");
    assert.equal(number.textContent, `${40 + index}.`);
    assert.ok(Number(number.getAttribute("y")) > Number(row.dataset.y) + Number(row.dataset.height));
  }
  assert.equal(rows[5].querySelector(".worksheet-number"), null);
  const single = renderWorksheet(createWorksheet(createBatchRows("mix", { additional_count: 0 }).rows));
  assert.equal(svgDocument(single.pages[0]).querySelectorAll(".practice-copy").length, 1);
});

test("word numbering continues across pages while optional blank rows stay unnumbered", () => {
  const batch = createBatchRows(Array(20).fill("mix").join("\n"), { start_number: 40, blank_rows: 1, first_style: "dashed" });
  const result = renderWorksheet(createWorksheet(batch.rows));
  assert.equal(batch.rows.length, 40);
  assert.equal(result.pages.length, 3);
  const numbers = result.pages.flatMap((page) => [...svgDocument(page).querySelectorAll(".worksheet-number")].map((number) => number.textContent));
  assert.deepEqual(numbers, Array.from({ length: 20 }, (_, index) => `${index + 40}.`));
  assert.ok(batch.rows.filter((_, index) => index % 2 === 1).every((row) => row.style === "blank" && row.sequence_number === null));
  const roundTrip = normalizeWorksheet(JSON.parse(JSON.stringify(createWorksheet(batch.rows))));
  assert.deepEqual(roundTrip.rows, batch.rows);
  const legacy = normalizeWorksheet({ rows: [{ text: "apple", placement: "flow", repeat_count: 1 }] }).rows[0];
  assert.equal(legacy.sequence_number, null);
  assert.equal(legacy.placement, "flow");
});

test("Chinese batches preserve annotation selectors, mixed styles, blank cells and numbering", () => {
  const alternate = "行" + String.fromCodePoint(0xe01e1);
  const batch = createBatchRows(`${alternate}走\n測量`, { font: "zhuyin", font_size_mm: 16, blank_cells: 2, first_style: "light", following_style: "dashed", start_number: 40 });
  const result = renderWorksheet({ ...createChineseWorksheet(), rows: batch.rows });
  const document = svgDocument(result.pages[0]);
  const first = document.querySelector(".practice-row");
  const texts = [...first.querySelectorAll("text:not(.worksheet-number)")];
  assert.deepEqual(texts.map((text) => text.textContent), [alternate, "走", alternate, "走"]);
  assert.equal(texts[0].getAttribute("fill"), "#b5c5bc");
  assert.ok(texts[2].hasAttribute("stroke-dasharray"));
  assert.equal(first.querySelectorAll(".han-grid").length, 8);
  assert.equal(Number(first.querySelector(".practice-blank").getAttribute("width")), 47);
  assert.equal(first.querySelector(".worksheet-number").textContent, "40.");
  const long = createBatchRows("測量長度", { font: "zhuyin", blank_cells: 2, additional_count: 1 });
  assert.throws(() => renderWorksheet({ ...createChineseWorksheet(), rows: long.rows }), /超過每行 8 格/);
  const fixed = createBatchRows("測量長度", { font: "zhuyin", blank_cells: 2, additional_count: 0 });
  assert.equal(renderWorksheet({ ...createChineseWorksheet(), rows: fixed.rows }).pages.length, 1);
});

test("batch limits and row validation prevent lost words, overflow and invalid numbering", () => {
  for (const options of [
    { additional_count: -1 }, { additional_count: 100 }, { additional_count: 1.5 },
    { blank_cells: 0 }, { blank_rows: 6 }, { start_number: 0 }, { start_number: 1.5 },
    { start_number: 999999 }, { following_style: "blank" }, { first_style: "unknown" }, { unexpected: true },
  ]) assert.throws(() => createBatchRows("mix\ncrop", options));
  assert.throws(() => createBatchRows(Array(101).fill("mix").join("\n"), { blank_rows: 1 }), /最多 200 行/);
  const last = createBatchRows("mix", { start_number: 999999 });
  assert.equal(last.next_number, null);
  const tooMuchBlank = createBatchRows("mix", { blank_cells: 16 });
  assert.throws(() => renderWorksheet(createWorksheet(tooMuchBlank.rows)), /預留空白須少於/);
  const invalid = createRow("mix", { sequence_number: '<script>' });
  assert.throws(() => renderWorksheet(createWorksheet([invalid])), /行序號/);
});
