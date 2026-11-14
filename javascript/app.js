// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"use strict";
(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const chineseEntry = new URLSearchParams(location.search).get("mode") === "chinese";
  const STORAGE_KEY = chineseEntry ? "letter-lines.javascript.chinese.v1" : "letter-lines.javascript.v1";
  const FONTS = {
    hand: { label: "Patrick Hand", css: "'Patrick Hand', sans-serif" },
    cursive: { label: "Caveat", css: "'Caveat', cursive" },
    sans: { label: "Arial", css: "Arial, sans-serif" },
    serif: { label: "Georgia", css: "Georgia, serif" },
    mono: { label: "Courier New", css: "'Courier New', monospace" },
    zhuyin: { label: "字嗨注音標楷", css: "'Bpmf Zihi Kai', serif" },
    kai: { label: "字嗨標楷（無注音）", css: "'Bpmf Zihi Kai', serif" },
  };
  const STYLES = { dashed: "虛線", solid: "實線", light: "淡字", blank: "空白" };
  const clone = (object) => JSON.parse(JSON.stringify(object));
  const makeRow = LetterLines.createRow;
  const englishDefaults = () => LetterLines.createWorksheet([makeRow("Aa Bb Cc Dd", { style: "solid" }), makeRow("Aa Bb Cc Dd"), makeRow("Ee Ff Gg Hh"), makeRow("Ii Jj Kk Ll", { font: "cursive" }), makeRow("Mm Nn Oo Pp", { font: "serif", style: "light" }), makeRow("Qq Rr Ss Tt", { font: "hand" }), makeRow("Uu Vv Ww Xx"), makeRow("Yy Zz", { font: "cursive" })]);
  const defaults = () => chineseEntry ? LetterLines.createChineseWorksheet() : englishDefaults();
  const newRow = () => makeRow("", state.grid_style === "english" ? {} : { font: "zhuyin", font_size_mm: 16 });
  let state = defaults();
  let activeRow = 0;
  let lastResult = null;
  let renderTimer;
  let renderVersion = 0;
  let pendingRender = Promise.resolve(false);
  const fontLoads = new Map();
  let cellTarget = null;
  let toastTimer;
  let storageAvailable = true;
  let dirty = false;
  let printing = false;
  let previewReady = false;
  let template = chineseEntry ? "chinese" : "alphabet";

  function toast(message) {
    $("#toast").textContent = message;
    $("#toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 3800);
  }

  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, worksheet: state, template }));
      storageAvailable = true;
      $("#save-status").lastChild.textContent = "已自動儲存在此瀏覽器";
    } catch {
      storageAvailable = false;
      $("#save-status").lastChild.textContent = "無法自動儲存，請使用「儲存編排」";
    }
  }

  function updatePresets() {
    $$("[data-template]").forEach((button) => {
      button.classList.toggle("active", button.dataset.template === template);
      button.setAttribute("aria-pressed", String(button.dataset.template === template));
    });
  }

  function ensureRow(index) {
    while (state.rows.length <= index && state.rows.length < 200) state.rows.push(newRow());
    return state.rows[index];
  }

  function renderRowList() {
    const list = $("#row-list");
    const scrollTop = list.scrollTop;
    const fragment = document.createDocumentFragment();
    state.rows.forEach((row, index) => {
      const card = document.createElement("button");
      card.className = `row-card${index === activeRow ? " active" : ""}`;
      card.type = "button";
      card.setAttribute("aria-label", `編輯第 ${index + 1} 行：${row.text || "空白練習"}`);
      card.setAttribute("aria-pressed", String(index === activeRow));
      const number = document.createElement("span");
      number.className = "row-number";
      number.textContent = String(index + 1).padStart(2, "0");
      const content = document.createElement("span");
      content.className = "row-card-body";
      const text = document.createElement("span");
      text.className = "row-card-text";
      text.style.fontFamily = FONTS[row.font].css;
      text.textContent = LetterLines.displayText(row, row.text || (row.cells.some((cell) => cell) ? "自訂格子內容" : "Blank practice"));
      const meta = document.createElement("span");
      meta.className = "row-card-meta";
      meta.textContent = `${FONTS[row.font].label} · ${row.placement === "flow" ? `單字／句子 · ${row.repeat_count} 次` : "逐格書寫"}`;
      const style = document.createElement("span");
      style.className = "row-card-style";
      style.textContent = STYLES[row.style];
      content.append(text, meta);
      card.append(number, content, style);
      card.addEventListener("click", () => selectRow(index));
      fragment.append(card);
    });
    list.replaceChildren(fragment);
    list.scrollTop = scrollTop;
    $("#row-count").textContent = `${state.rows.length} 行`;
    $("#add-row").disabled = state.rows.length >= 200;
  }

  function renderEditor() {
    const row = state.rows[activeRow];
    $("#editing-title").textContent = `第 ${String(activeRow + 1).padStart(2, "0")} 行設定`;
    $("#row-text").value = row.text;
    $("#text-length").textContent = `${Array.from(row.text).length} / 500`;
    $("#row-font").value = row.font;
    $("#row-placement").value = row.placement;
    $("#row-font-size").value = row.font_size_mm;
    $("#row-repeat").checked = row.repeat;
    renderRepeatControls();
    $("#font-specimen").style.fontFamily = FONTS[row.font].css;
    $("#font-specimen").textContent = LetterLines.displayText(row, ["zhuyin", "kai"].includes(row.font) ? "國字注音" : "The quick brown fox.");
    $("#row-placement").querySelector('option[value="flow"]').disabled = state.grid_style !== "english";
    $("#row-placement").querySelector('option[value="cells"]').textContent = state.grid_style === "english" ? "逐格字母" : "逐格國字";
    $("#chinese-note").hidden = state.grid_style === "english" && !["zhuyin", "kai"].includes(row.font);
    $("#chinese-note").textContent = row.font === "kai" ? "這一行只顯示國字；改選「字嗨注音標楷」可附上注音。" : "中文注音使用字型預設讀音。點紙上的單格可改選多音字；中文格型使用逐格排列。中文範字須等注音字型載入完成後列印。";
    $("#move-up").disabled = activeRow === 0;
    $("#move-down").disabled = activeRow === state.rows.length - 1;
    $("#duplicate-row").disabled = state.rows.length >= 200;
    $$("[data-style]").forEach((button) => {
      button.classList.toggle("active", button.dataset.style === row.style);
      button.setAttribute("aria-pressed", String(button.dataset.style === row.style));
    });
  }

  function renderSettings() {
    $$("[data-setting]").forEach((input) => {
      const value = state[input.dataset.setting];
      if (input.type === "checkbox") input.checked = value;
      else input.value = value;
    });
    $("#grid-help").textContent = state.grid_style === "english" ? "每行固定兩條水平書寫線。超出紙張的行數與格數會自動調整，預覽會顯示實際配置。" : "中文格型逐格排字，右側預留注音區。田字格大小依字級與格寬高限制；超出紙張容量時會提示。";
  }

  function renderRepeatControls() {
    const row = state.rows[activeRow];
    $("#cell-repeat-control").hidden = row.placement !== "cells";
    $("#flow-repeat-control").hidden = row.placement !== "flow";
    $("#row-repeat-count").value = row.repeat_count;
  }

  function selectRow(index) {
    if (index >= 200) { toast("最多可建立 200 行練習"); return; }
    ensureRow(index);
    activeRow = index;
    renderRowList();
    renderEditor();
    highlightRow();
  }

  function highlightRow() {
    $$(".paper-stack .practice-row").forEach((group) => {
      group.classList.toggle("selected", Number(group.dataset.row) === activeRow);
    });
  }

  function changed() {
    dirty = true;
    template = "custom";
    updatePresets();
    renderRowList();
    scheduleRender();
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    // Ignore earlier font-loading work as soon as a newer edit is scheduled.
    renderVersion += 1;
    previewReady = false;
    $("#print-button").disabled = true;
    renderTimer = setTimeout(() => { pendingRender = renderPreview(); }, 160);
  }

  function createPreview(worksheet) {
    return LetterLines.renderWorksheet(worksheet);
  }

  async function loadPracticeFonts() {
    const needsZhuyin = state.rows.some((row) => ["zhuyin", "kai"].includes(row.font));
    const families = ["Patrick Hand", "Caveat", ...(needsZhuyin ? ["Bpmf Zihi Kai"] : [])];
    const results = await Promise.all(families.map((family) => {
      if (!fontLoads.has(family)) {
        fontLoads.set(family, document.fonts.load(`16px '${family}'`).then(() => true, () => {
          fontLoads.delete(family);
          return false;
        }));
      }
      return fontLoads.get(family);
    }));
    if (needsZhuyin && !results[2]) throw new Error("注音字型未載入，不能正確顯示注音。請用本機預覽或網站網址開啟後重試。");
    return results.every(Boolean);
  }

  async function renderPreview(precomputed = null) {
    clearTimeout(renderTimer);
    const version = ++renderVersion;
    previewReady = false;
    $("#print-button").disabled = true;
    try {
      const result = precomputed || createPreview(state);
      if (version !== renderVersion) return false;
      lastResult = result;
      const stack = $("#paper-stack");
      const oldScroll = $("#paper-viewport").scrollTop;
      const fragment = document.createDocumentFragment();
      result.pages.forEach((svg, pageIndex) => {
        const page = document.createElement("article");
        page.className = "paper-page";
        page.setAttribute("aria-label", `第 ${pageIndex + 1} 頁`);
        // The renderer validates settings and XML-escapes all user text.
        page.innerHTML = svg;
        page.querySelectorAll(".practice-row").forEach((group) => {
          group.setAttribute("tabindex", "0");
          group.setAttribute("role", "button");
          group.setAttribute("aria-label", `編輯第 ${Number(group.dataset.row) + 1} 行；按 Enter 編輯文字`);
          group.addEventListener("click", (event) => onPaperClick(group, event));
          group.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (Number(group.dataset.row) >= 200) { toast("最多可建立 200 行練習"); return; }
              selectRow(Number(group.dataset.row));
              $("#row-text").focus();
              $("#row-text").select();
              $("#row-text").scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
          });
        });
        fragment.append(page);
      });
      stack.replaceChildren(fragment);
      const fontsLoaded = await loadPracticeFonts();
      if (version !== renderVersion) return false;
      // Use real glyph widths so wide letters and long strings stay inside their cells.
      stack.querySelectorAll("text[data-max-width]").forEach((text) => {
        text.removeAttribute("textLength");
        text.removeAttribute("lengthAdjust");
        const maximum = Number(text.dataset.maxWidth);
        if (text.getComputedTextLength() > maximum) {
          text.setAttribute("textLength", String(maximum));
          text.setAttribute("lengthAdjust", "spacingAndGlyphs");
        }
      });
      // Separate clip IDs keep the print copy independent of hidden screen definitions.
      $("#print-pages").innerHTML = [...stack.children].map((page) => {
        const svg = page.innerHTML.replaceAll('id="row-', 'id="print-row-').replaceAll('url(#row-', 'url(#print-row-');
        return `<div class="print-page" style="width:${result.width_mm}mm;height:${result.height_mm}mm">${svg}</div>`;
      }).join("");
      $("#print-pages").querySelectorAll(".practice-row").forEach((group) => {
        group.removeAttribute("tabindex");
        group.classList.remove("selected");
      });
      let printStyle = $("#dynamic-print-style");
      if (!printStyle) { printStyle = document.createElement("style"); printStyle.id = "dynamic-print-style"; document.head.append(printStyle); }
      printStyle.textContent = `@page { size: ${result.width_mm}mm ${result.height_mm}mm; margin: 0; }`;
      $("#page-count").textContent = `${result.pages.length} 頁`;
      $("#paper-summary").textContent = `${state.paper_size} · ${state.orientation === "portrait" ? "直向" : "橫向"} · ${result.rows_per_page} 行 × ${result.columns} 格`;
      $("#actual-layout").textContent = `實際配置：每頁 ${result.rows_per_page} 行 × ${result.columns} 格`;
      $("#warning").classList.remove("error");
      const warnings = [...result.warnings];
      if (!fontsLoaded) warnings.push("手寫字型載入失敗，暫以系統字型顯示。可使用本機預覽或網站網址開啟以載入完整字型。");
      $("#warning").textContent = warnings.join(" ");
      $("#warning").hidden = warnings.length === 0;
      resizePaper();
      highlightRow();
      $("#paper-viewport").scrollTop = oldScroll;
      saveLocal();
      previewReady = true;
      $("#print-button").disabled = false;
      return true;
    } catch (error) {
      if (error.name === "AbortError" || version !== renderVersion) return false;
      $("#warning").hidden = false;
      $("#warning").classList.add("error");
      $("#warning").textContent = `無法更新練習紙：${error.message} 請修正設定後再試一次。`;
      $("#print-pages").replaceChildren();
      return false;
    }
  }

  function resizePaper() {
    if (!lastResult) return;
    const viewport = $("#paper-viewport");
    const style = getComputedStyle(viewport);
    const available = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 2;
    const zoom = $("#zoom").value;
    const width = zoom === "fit" ? Math.min(available, lastResult.width_mm * 3.3) : lastResult.width_mm * (96 / 25.4) * Number(zoom);
    $$(".paper-page").forEach((page) => {
      page.style.width = `${width}px`;
      page.style.height = `${width * lastResult.height_mm / lastResult.width_mm}px`;
    });
    $("#paper-stack").style.alignItems = width > available ? "flex-start" : "center";
  }

  function onPaperClick(group, event) {
    const index = Number(group.dataset.row);
    if (index >= 200) { toast("最多可建立 200 行練習"); return; }
    const wasNew = index >= state.rows.length;
    selectRow(index);
    if (wasNew) scheduleRender();
    const row = state.rows[index];
    if (row.placement === "flow") {
      $("#row-text").focus();
      $("#row-text").select();
      $("#row-text").scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    const svg = group.ownerSVGElement;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const column = Math.max(0, Math.min(lastResult.columns - 1, Math.floor((point.x - Number(group.dataset.x)) / state.cell_width_mm)));
    cellTarget = { row: index, column };
    const chars = LetterLines.splitText(row.text);
    const generated = chars.length ? (row.repeat ? chars[column % chars.length] : chars[column] || "") : "";
    $("#cell-title").textContent = `第 ${index + 1} 行・第 ${column + 1} 格`;
    $("#cell-text").value = row.cells[column] ?? generated;
    $("#cell-text").style.fontFamily = row.font === "kai" ? "'DFKai-SB', 'BiauKai', serif" : FONTS[row.font].css;
    renderReadingOptions();
    $("#cell-dialog").showModal();
    $("#cell-text").focus();
    $("#cell-text").select();
  }

  function renderReadingOptions() {
    const panel = $("#cell-reading-panel");
    const row = cellTarget && state.rows[cellTarget.row];
    panel.hidden = row?.font !== "zhuyin";
    $("#reading-options").replaceChildren();
    if (panel.hidden) return;
    const text = $("#cell-text").value;
    const options = LetterLines.getReadingOptions(text);
    $("#reading-help").textContent = options.length ? "選擇符合詞義的注音。預設讀音不一定適合每個詞，多音字請自行確認。" : "請輸入單一國字以選擇讀音；未收錄的字或多字字串不提供讀音選項。";
    for (const option of options) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "reading-option";
      button.setAttribute("aria-label", option.label);
      button.setAttribute("aria-pressed", String(text === option.value));
      const specimen = document.createElement("span");
      specimen.className = "reading-glyph";
      specimen.textContent = option.value;
      const label = document.createElement("small");
      label.textContent = option.label;
      button.append(specimen, label);
      button.addEventListener("click", () => { $("#cell-text").value = option.value; renderReadingOptions(); });
      $("#reading-options").append(button);
    }
  }

  function updateCell(reset = false) {
    if (!cellTarget) return;
    const { row, column } = cellTarget;
    while (state.rows[row].cells.length <= column) state.rows[row].cells.push(null);
    state.rows[row].cells[column] = reset ? null : $("#cell-text").value;
    if (!reset && state.rows[row].style === "blank" && $("#cell-text").value) {
      state.rows[row].style = "dashed";
      renderEditor();
    }
    $("#cell-dialog").close();
    cellTarget = null;
    changed();
  }

  async function printWorksheet() {
    if (printing) return;
    printing = true;
    try {
      const valid = await renderPreview();
      if (!valid) return;
      $("#print-button").disabled = true;
      await loadPracticeFonts();
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.print();
    } catch (error) { toast(`無法列印：${error.message}`); }
    finally { printing = false; $("#print-button").disabled = !previewReady; }
  }

  function applyTemplate(name) {
    if (dirty && !window.confirm("套用範本會取代目前的練習內容。已儲存的編排檔不會受影響。確定套用？")) return;
    if (name === "chinese") state = LetterLines.createChineseWorksheet();
    if (name === "alphabet") state = englishDefaults();
    if (name === "words") state = { ...state, grid_style: "english" };
    if (name === "words") state.rows = [
      makeRow("apple", { placement: "flow", style: "solid", repeat_count: 3 }),
      makeRow("apple", { placement: "flow", repeat_count: 3 }),
      makeRow("beautiful", { placement: "flow", font: "cursive", repeat_count: 2 }),
      makeRow("Keep growing, one day at a time.", { placement: "flow", font: "cursive", style: "solid", font_size_mm: 10 }),
      makeRow("The quick brown fox jumps over the lazy dog.", { placement: "flow", font: "serif", style: "light", font_size_mm: 8 }),
      makeRow("Practice makes progress.", { placement: "flow", font: "sans", font_size_mm: 9 }),
      makeRow("", { placement: "flow", style: "blank" }),
    ];
    if (name === "blank") state.rows = Array.from({ length: lastResult?.rows_per_page || state.rows_per_page }, () => ({ ...newRow(), style: "blank" }));
    activeRow = 0;
    template = name;
    dirty = false;
    updatePresets();
    renderSettings();
    renderRowList();
    renderEditor();
    pendingRender = renderPreview();
  }

  function downloadProject() {
    const blob = new Blob([JSON.stringify({ version: 1, worksheet: state }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "letter-lines-worksheet.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("已儲存編排檔，下次可載入繼續編輯");
  }

  function validateProject(data) {
    if (!data || data.version !== 1 || !data.worksheet || !Array.isArray(data.worksheet.rows) || !data.worksheet.rows.length) throw new Error("請選擇本工具儲存的 v1 編排檔");
    return LetterLines.normalizeWorksheet(data.worksheet);
  }

  async function importProject(file) {
    if (!file) return;
    try {
      if (file.size > 512 * 1024) throw new Error("編排檔不可超過 512 KB");
      const candidate = validateProject(JSON.parse(await file.text()));
      const preview = createPreview(candidate);
      if (dirty && !window.confirm("載入編排將取代目前內容，是否繼續？")) return;
      state = candidate;
      activeRow = 0;
      template = "custom";
      dirty = false;
      renderSettings(); renderRowList(); renderEditor(); updatePresets();
      await renderPreview(preview);
      toast("編排已載入");
    } catch (error) { toast(`無法載入：${error.message}`); }
    finally { $("#import-file").value = ""; }
  }

  $("#row-text").addEventListener("input", (event) => {
    const previouslyEmpty = !state.rows[activeRow].text;
    state.rows[activeRow].text = event.target.value.replace(/[\r\n]+/g, " ");
    if (previouslyEmpty && state.rows[activeRow].text && state.rows[activeRow].style === "blank") {
      state.rows[activeRow].style = "dashed";
      $$("[data-style]").forEach((button) => {
        button.classList.toggle("active", button.dataset.style === "dashed");
        button.setAttribute("aria-pressed", String(button.dataset.style === "dashed"));
      });
    }
    $("#text-length").textContent = `${Array.from(state.rows[activeRow].text).length} / 500`;
    changed();
  });
  [["#row-font", "font"], ["#row-placement", "placement"], ["#row-font-size", "font_size_mm"], ["#row-repeat", "repeat"]].forEach(([selector, key]) => {
    $(selector).addEventListener("change", (event) => {
      if (event.target.type === "number" && !event.target.checkValidity()) { event.target.reportValidity(); return; }
      state.rows[activeRow][key] = event.target.type === "checkbox" ? event.target.checked : event.target.type === "number" ? Number(event.target.value) : event.target.value;
      $("#font-specimen").style.fontFamily = FONTS[state.rows[activeRow].font].css;
      if (key === "font") renderEditor();
      if (key === "placement") renderRepeatControls();
      changed();
    });
  });
  function updateRepeatCount(event) {
    const raw = Number(event.target.value);
    const count = Number.isFinite(raw) ? Math.max(1, Math.min(100, Math.trunc(raw))) : 1;
    event.target.value = count;
    state.rows[activeRow].repeat_count = count;
    changed();
  }
  $("#row-repeat-count").addEventListener("input", (event) => {
    if (event.target.checkValidity()) updateRepeatCount(event);
  });
  $("#row-repeat-count").addEventListener("change", updateRepeatCount);
  $$("[data-style]").forEach((button) => button.addEventListener("click", () => {
    state.rows[activeRow].style = button.dataset.style;
    changed(); renderEditor();
  }));
  $$("[data-setting]").forEach((input) => input.addEventListener(input.type === "text" ? "input" : "change", () => {
    if (!input.checkValidity()) { input.reportValidity(); return; }
    state[input.dataset.setting] = input.type === "checkbox" ? input.checked : input.type === "number" ? Number(input.value) : input.value;
    if (input.dataset.setting === "grid_style") {
      if (state.grid_style !== "english") state.rows.forEach((row) => { row.placement = "cells"; });
      renderSettings(); renderRowList(); renderEditor();
    }
    dirty = true;
    scheduleRender();
  }));
  $("#add-row").addEventListener("click", () => {
    if (state.rows.length >= 200) return;
    state.rows.push(newRow());
    activeRow = state.rows.length - 1;
    changed(); renderEditor();
    $("#row-list").scrollTop = $("#row-list").scrollHeight;
    $("#row-text").focus();
  });
  $("#duplicate-row").addEventListener("click", () => {
    if (state.rows.length >= 200) return;
    state.rows.splice(activeRow + 1, 0, clone(state.rows[activeRow]));
    activeRow += 1;
    changed(); renderEditor();
  });
  $("#delete-row").addEventListener("click", () => {
    state.rows.splice(activeRow, 1);
    if (!state.rows.length) state.rows.push(newRow());
    activeRow = Math.min(activeRow, state.rows.length - 1);
    changed(); renderEditor();
  });
  [["#move-up", -1], ["#move-down", 1]].forEach(([selector, direction]) => $(selector).addEventListener("click", () => {
    const next = activeRow + direction;
    if (next < 0 || next >= state.rows.length) return;
    [state.rows[activeRow], state.rows[next]] = [state.rows[next], state.rows[activeRow]];
    activeRow = next;
    changed(); renderEditor();
  }));
  $$("[data-template]").forEach((button) => button.addEventListener("click", () => applyTemplate(button.dataset.template)));
  $("#settings-toggle").addEventListener("click", () => $("#settings-dialog").showModal());
  $("#settings-done").addEventListener("click", () => {
    const invalid = $$("[data-setting]").find((input) => !input.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    $("#settings-dialog").close();
  });
  $("#cell-close").addEventListener("click", () => $("#cell-dialog").close());
  $("#cell-form").addEventListener("submit", (event) => { event.preventDefault(); updateCell(); });
  $("#cell-reset").addEventListener("click", () => updateCell(true));
  $("#cell-text").addEventListener("input", renderReadingOptions);
  $("#help-button").addEventListener("click", () => $("#help-dialog").showModal());
  $("#print-button").addEventListener("click", printWorksheet);
  $("#zoom").addEventListener("change", resizePaper);
  new ResizeObserver(resizePaper).observe($("#paper-viewport"));
  $("#export-project").addEventListener("click", downloadProject);
  $("#import-project").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", (event) => importProject(event.target.files[0]));
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
      event.preventDefault();
      if (!$$("dialog[open]").length) printWorksheet();
    }
  });
  window.addEventListener("beforeunload", () => { if (dirty) saveLocal(); });

  async function initialize() {
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); }
    catch { storageAvailable = false; }
    try {
      if (saved) {
        const data = JSON.parse(saved);
        const candidate = validateProject(data);
        const preview = createPreview(candidate);
        state = candidate;
        template = data.template || "custom";
        dirty = true;
        renderSettings(); renderRowList(); renderEditor(); updatePresets();
        await renderPreview(preview);
        return;
      }
    } catch { toast("先前的編排無法讀取，已開啟新的練習紙"); }
    renderSettings(); renderRowList(); renderEditor(); updatePresets();
    pendingRender = renderPreview();
    await pendingRender;
    if (!storageAvailable) toast("此瀏覽器未提供儲存空間，可以下載編排檔保留內容");
  }
  initialize();
})();
