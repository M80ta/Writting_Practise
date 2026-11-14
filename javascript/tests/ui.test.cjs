// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Browser DOM integration with all backend requests explicitly blocked.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");
const root = path.resolve(__dirname, "..");
const base = "https://example.github.io/EnglishPractise/javascript/";
const storageKey = "letter-lines.javascript.v1";
const windows = [];
const errors = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, label) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (predicate()) return;
    await sleep(20);
  }
  throw new Error(`Timed out: ${label}`);
}

function setup(saved = null, options = {}) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error.message));
  const dom = new JSDOM(fs.readFileSync(path.join(root, "index.html"), "utf8"), {
    url: options.url || base, runScripts: "outside-only", pretendToBeVisual: true, virtualConsole,
  });
  const w = dom.window;
  windows.push(w);
  w.fetch = () => { throw new Error("Backend access is forbidden in the JavaScript version"); };
  w.ResizeObserver = class { observe() {} };
  w.document.fonts = { ready: Promise.resolve(), load: () => options.fontFailure ? Promise.reject(new Error("font blocked")) : Promise.resolve([]) };
  // JSDOM has no layout or font engine. Only the fitting branch is exercised here.
  w.SVGElement.prototype.getComputedTextLength = function () { return this.textContent.length * 4; };
  w.SVGElement.prototype.getScreenCTM = () => ({ inverse: () => ({}) });
  w.DOMPoint = class { constructor(x, y) { this.x = x; this.y = y; } matrixTransform() { return this; } };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  w.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  w.confirm = () => true;
  w.blobDownloads = [];
  w.downloads = [];
  w.Blob = Blob;
  w.URL.createObjectURL = (blob) => { w.blobDownloads.push(blob); return "blob:test-export"; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { w.downloads.push({ href: this.href, name: this.download }); };
  w.printCalls = 0;
  w.print = () => { w.printCalls++; };
  w.getComputedStyle = () => ({ paddingLeft: "20", paddingRight: "20" });
  Object.defineProperty(w.document.querySelector("#paper-viewport"), "clientWidth", { value: 900 });
  if (options.storageBlocked) Object.defineProperty(w, "localStorage", { get() { throw new Error("storage blocked"); } });
  if (saved) w.localStorage.setItem(storageKey, saved);
  w.eval(fs.readFileSync(path.join(root, "worksheet.js"), "utf8"));
  w.eval(fs.readFileSync(path.join(root, "app.js"), "utf8"));
  const $ = (selector) => w.document.querySelector(selector);
  const $$ = (selector) => [...w.document.querySelectorAll(selector)];
  const input = (selector, value, event = "change") => {
    $(selector).value = value;
    $(selector).dispatchEvent(new w.Event(event, { bubbles: true }));
  };
  const ready = () => $("#print-button").disabled === false && $$(".paper-page").length > 0;
  const savedState = () => JSON.parse(w.localStorage.getItem(storageKey)).worksheet;
  return { dom, w, $, $$, input, ready, savedState };
}

test("editing, exact counts, paper settings, print, local restore and JSON work without a backend", async (t) => {
  t.after(() => windows.splice(0).forEach((w) => w.close()));
  const ui = setup();
  const { w, $, $$, input, ready, savedState } = ui;
  await waitFor(ready, "initial render");
  assert.equal($$(".row-card").length, 8);
  assert.equal($$(".paper-page").length, 1);
  assert.equal($$("#paper-stack .practice-row").length, 10);
  assert.equal($$("#print-pages .practice-row").length, 10);

  input("#row-text", "WWWWWWWWWW <safe>&", "input");
  input("#row-placement", "flow");
  input("#row-font", "cursive");
  $("[data-style=dashed]").click();
  await waitFor(ready, "row text and font changes");
  assert.equal(savedState().rows[0].font, "cursive");
  assert.equal(savedState().rows[1].font, "hand");
  assert.ok($("#paper-stack").textContent.includes("<safe>&"));
  assert.equal($("#paper-stack safe"), null);

  assert.equal($("#flow-repeat-control").hidden, false);
  assert.equal($("#cell-repeat-control").hidden, true);
  assert.equal($("#row-repeat-count").value, "1");
  const sample = "WWWWWWWWWW <safe>&";
  input("#row-repeat-count", "3", "input");
  await waitFor(ready, "three repetitions");
  assert.equal(savedState().rows[0].repeat_count, 3);
  assert.equal(savedState().rows[1].repeat_count, 1);
  assert.ok($("#paper-stack .practice-row").textContent.includes([sample, sample, sample].join("   ")));
  assert.ok($("#print-pages .practice-row").textContent.includes([sample, sample, sample].join("   ")));
  input("#row-repeat-count", "1");
  await waitFor(ready, "single repetition");
  assert.equal($("#paper-stack .practice-row").textContent, sample);
  for (const value of ["0", "-5", ""]) {
    input("#row-repeat-count", value);
    await waitFor(ready, "minimum repetition count");
    assert.equal($("#row-repeat-count").value, "1");
    assert.equal(savedState().rows[0].repeat_count, 1);
  }
  input("#row-repeat-count", "5");
  await waitFor(ready, "save repetition count");

  input("#row-placement", "cells");
  await waitFor(ready, "cell placement");
  assert.equal($("#flow-repeat-control").hidden, true);
  assert.equal($("#cell-repeat-control").hidden, false);
  $("#paper-stack .practice-row").dispatchEvent(new w.MouseEvent("click", { bubbles: true, clientX: 20, clientY: 45 }));
  assert.ok($("#cell-dialog").open);
  $("#cell-text").value = "Hello";
  $("#cell-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  await waitFor(ready, "cell override");
  assert.equal(savedState().rows[0].cells[0], "Hello");
  assert.ok($("#paper-stack").textContent.includes("Hello"));

  $("#duplicate-row").click();
  await waitFor(ready, "duplicate row");
  assert.equal($$(".row-card").length, 9);
  assert.equal(savedState().rows[1].cells[0], "Hello");
  assert.equal(savedState().rows[1].repeat_count, 5);
  $("#move-down").click();
  await waitFor(ready, "move row");
  assert.equal(savedState().rows[2].cells[0], "Hello");
  $("#delete-row").click();
  await waitFor(ready, "delete row");
  assert.equal($$(".row-card").length, 8);

  input("#paper-size", "A5");
  input("#orientation", "landscape");
  input("#rows-per-page", "30");
  input("#columns", "40");
  await waitFor(ready, "landscape auto pagination");
  assert.equal($$(".paper-page").length, 2);
  assert.ok($("#actual-layout").textContent.includes("4 行 × 12 格"));
  assert.equal($("#warning").hidden, false);
  const ids = $$('clipPath').map((clip) => clip.id);
  assert.equal(new Set(ids).size, ids.length, "screen and print clip IDs must be distinct");
  $$('[clip-path]').forEach((element) => {
    const id = element.getAttribute("clip-path").match(/#([^)]*)/)[1];
    assert.ok(w.document.getElementById(id), `missing clip ${id}`);
  });
  assert.equal($("#print-pages [tabindex]"), null);
  $("#print-button").click();
  await waitFor(() => w.printCalls === 1, "print preparation");

  const saved = w.localStorage.getItem(storageKey);
  const restored = setup(saved);
  await waitFor(restored.ready, "restore saved project");
  assert.equal(restored.savedState().rows[0].cells[0], "Hello");
  assert.equal(restored.savedState().rows[0].repeat_count, 5);
  assert.equal(restored.$$(".paper-page").length, 2);

  const oldProject = JSON.parse(saved);
  oldProject.worksheet.rows.forEach((row) => { delete row.repeat_count; });
  Object.assign(oldProject.worksheet.rows[0], { placement: "flow", text: "apple", repeat: true });
  const legacy = setup(JSON.stringify(oldProject));
  await waitFor(legacy.ready, "restore old auto-fill project");
  assert.equal(legacy.savedState().rows[0].repeat_count, 4);
  assert.equal(legacy.$("#row-repeat-count").value, "4");
  assert.equal(legacy.$("#paper-stack .practice-row").textContent, "apple   apple   apple   apple");

  $("#export-project").click();
  assert.equal(w.downloads[0].name, "letter-lines-worksheet.json");
  const exported = JSON.parse(await w.blobDownloads[0].text());
  assert.equal(exported.worksheet.rows[0].repeat_count, 5);
  const imported = JSON.parse(saved);
  Object.assign(imported.worksheet.rows[0], { text: "Imported phrase", placement: "flow", repeat_count: 2 });
  const text = JSON.stringify(imported);
  Object.defineProperty($("#import-file"), "files", { configurable: true, value: [{ size: text.length, text: async () => text }] });
  $("#import-file").dispatchEvent(new w.Event("change", { bubbles: true }));
  await waitFor(() => ready() && savedState().rows[0].text === "Imported phrase", "load Rust-compatible JSON");
  assert.equal($("#row-repeat-count").value, "2");
  assert.equal($("#paper-stack .practice-row").textContent, "Imported phrase   Imported phrase");

  const invalidText = JSON.stringify({ version: 1, worksheet: { rows: [{ text: "bad", repeat_count: 0 }] } });
  Object.defineProperty($("#import-file"), "files", { configurable: true, value: [{ size: invalidText.length, text: async () => invalidText }] });
  $("#import-file").dispatchEvent(new w.Event("change", { bubbles: true }));
  await waitFor(() => $("#toast").textContent.includes("無法載入"), "reject invalid imported counts");
  assert.equal(savedState().rows[0].text, "Imported phrase");

  const offline = setup(null, { url: "file:///D:/EnglishPractise/javascript/index.html", storageBlocked: true, fontFailure: true });
  await waitFor(offline.ready, "open a local file with restricted storage and fonts");
  assert.ok(offline.$("#warning").textContent.includes("手寫字型載入失敗"));
  assert.ok(offline.$("#save-status").textContent.includes("無法自動儲存"));
  offline.$("#print-button").click();
  await waitFor(() => offline.w.printCalls === 1, "print with system font fallback");

  $("[data-template=blank]").click();
  await waitFor(ready, "blank template");
  input("#row-text", "Aa", "input");
  await waitFor(ready, "typing on blank row");
  assert.equal(savedState().rows[0].style, "dashed");
  assert.ok($("#paper-stack").textContent.includes("Aa"));
  assert.deepEqual(errors, []);
});
