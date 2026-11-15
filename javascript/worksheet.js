// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"use strict";
// Shared by the browser and Node tests. No network, DOM, or runtime dependencies.
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./zhuyin-data.js") : root.LetterLinesZhuyin);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LetterLines = api;
})(globalThis, function (zhuyinData) {
  const PAPER = Object.freeze({ A4: [210, 297], A5: [148, 210], Letter: [215.9, 279.4] });
  const FONTS = Object.freeze({ hand: "'Patrick Hand', sans-serif", cursive: "'Caveat', cursive", sans: "Arial, sans-serif", serif: "Georgia, serif", mono: "'Courier New', monospace", zhuyin: "'Bpmf Zihi Kai', serif", kai: "'Bpmf Zihi Kai', serif" });
  const covered = new Set(Array.from(zhuyinData?.supported || ""));
  const isHan = (text) => /^\p{Script=Han}/u.test(text);
  const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("zh-Hant", { granularity: "grapheme" }) : null;
  function splitText(text) {
    if (segmenter) return Array.from(segmenter.segment(text), (entry) => entry.segment);
    const result = [];
    for (const char of text) {
      if (result.length && /\p{Mark}/u.test(char)) result[result.length - 1] += char;
      else result.push(char);
    }
    return result;
  }
  function getReadingOptions(text) {
    const units = splitText(text);
    if (units.length !== 1 || !isHan(units[0])) return [];
    const char = Array.from(units[0])[0];
    if (!covered.has(char)) return [];
    return [{ value: char, label: "預設讀音" }, ...(zhuyinData.alternatives[char] || []).map((variant) => ({ value: char + String.fromCodePoint(0xe01e0 + variant), label: `讀音 ${variant + 1}` })), { value: char + String.fromCodePoint(0xe01e0), label: "不顯示注音" }];
  }
  function displayText(row, text) {
    return row.font === "kai" ? splitText(text).map((unit) => isHan(unit) && covered.has(Array.from(unit)[0]) ? Array.from(unit)[0] + String.fromCodePoint(0xe01e0) : unit).join("") : text;
  }
  const createRow = (text = "", extra = {}) => ({ text, font: "hand", style: "dashed", font_size_mm: 10.5, placement: "cells", repeat: false, repeat_count: 1, cells: [], ...extra });
  const createWorksheet = (rows = []) => ({ title: "A little practice, every day.", show_header: true, paper_size: "A4", orientation: "portrait", print_mode: "color", margin_mm: 8, rows_per_page: 15, columns: 16, cell_width_mm: 12, cell_height_mm: 14, row_gap_mm: 2, cell_gap_mm: 0, vertical_guides: true, grid_style: "english", rows });
  const createChineseWorksheet = () => ({ ...createWorksheet(), title: "每天一點，練出好字。", grid_style: "tian", rows_per_page: 13, columns: 8, cell_width_mm: 22.5, cell_height_mm: 17, cell_gap_mm: 2,
    rows: [createRow("一二三四五六", { font: "zhuyin", font_size_mm: 16, style: "solid" }), createRow("一二三四五六", { font: "zhuyin", font_size_mm: 16 }), createRow("日月山水田土", { font: "zhuyin", font_size_mm: 16 }), createRow("你我他她它好", { font: "zhuyin", font_size_mm: 16, style: "light" }), createRow("學校老師同學", { font: "zhuyin", font_size_mm: 16 }), createRow("春夏秋冬天地", { font: "kai", font_size_mm: 16, style: "solid" })] });
  const length = (text) => Array.from(text).length;
  const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const number = (value) => String(Number(value.toFixed(4)));

  function allowedKeys(value, defaults, label) {
    if (!record(value)) throw new Error(`${label}格式不正確。`);
    if (Object.keys(value).some((key) => !Object.hasOwn(defaults, key))) throw new Error(`${label}含不支援的設定。`);
  }
  function range(value, min, max, label, integer = false) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      throw new Error(`${label}須介於 ${min} 與 ${max} 之間${integer ? "，且必須為整數" : ""}。`);
    }
  }
  function choice(value, options, label) {
    if (!options.includes(value)) throw new Error(`${label}不正確。`);
  }
  function boolean(value, label) {
    if (typeof value !== "boolean") throw new Error(`${label}須為開啟或關閉。`);
  }
  function string(value, max, label) {
    if (typeof value !== "string" || length(value) > max) throw new Error(`${label}須為文字，且最多 ${max} 個字元。`);
  }

  function normalizeWorksheet(input = {}) {
    const defaults = createWorksheet();
    allowedKeys(input, defaults, "編排");
    const config = { ...defaults, ...input };
    string(config.title, 80, "標題");
    choice(config.paper_size, Object.keys(PAPER), "紙張大小");
    choice(config.orientation, ["portrait", "landscape"], "列印方向");
    choice(config.print_mode, ["color", "grayscale"], "列印色彩");
    choice(config.grid_style, ["english", "tian", "mi", "square"], "書寫格型");
    boolean(config.show_header, "紙張抬頭");
    boolean(config.vertical_guides, "直向分格輔助線");
    range(config.margin_mm, 8, 30, "邊界 (mm)");
    range(config.cell_width_mm, 8, 35, "格寬 (mm)");
    range(config.cell_height_mm, 10, 30, "格高 (mm)");
    range(config.row_gap_mm, 2, 12, "行距 (mm)");
    range(config.cell_gap_mm, 0, 12, "中文格間距 (mm)");
    range(config.rows_per_page, 1, 30, "每頁行數", true);
    range(config.columns, 1, 40, "每行格數", true);
    if (!Array.isArray(config.rows) || config.rows.length > 200) throw new Error("練習行格式不正確，最多可建立 200 行。");
    config.rows = config.rows.map((inputRow) => {
      const rowDefaults = createRow();
      allowedKeys(inputRow, rowDefaults, "練習行");
      const row = { ...rowDefaults, ...inputRow };
      string(row.text, 500, "每行文字");
      choice(row.font, Object.keys(FONTS), "字型");
      choice(row.style, ["solid", "dashed", "light", "blank"], "範字樣式");
      choice(row.placement, ["cells", "flow"], "排列方式");
      if (config.grid_style !== "english" && row.placement !== "cells") throw new Error("中文格型請使用逐格排列。");
      boolean(row.repeat, "逐格重複");
      range(row.font_size_mm, 4, 22, "字級 (mm)");
      // Preserve earlier Rust v1 projects that used automatic fill instead of a count.
      if (inputRow.repeat_count === undefined && row.placement === "flow" && row.repeat && row.text) {
        const width = PAPER[config.paper_size][config.orientation === "landscape" ? 1 : 0];
        const columns = Math.min(config.columns, Math.max(1, Math.floor((width - 2 * config.margin_mm) / config.cell_width_mm)));
        const estimate = length(row.text) * row.font_size_mm * 0.53 + row.font_size_mm;
        row.repeat_count = Math.max(1, Math.min(40, Math.floor(columns * config.cell_width_mm / estimate)));
      }
      range(row.repeat_count, 1, 100, "重複次數", true);
      if (!Array.isArray(row.cells) || row.cells.length > 40) throw new Error("自訂格子最多可有 40 格。");
      row.cells = Array.from(row.cells, (cell) => {
        if (cell === null) return null;
        string(cell, 80, "每格文字");
        return cell;
      });
      return row;
    });
    return config;
  }

  function escapeXml(text) {
    // Replace characters that XML 1.0 cannot represent, including unpaired surrogates.
    return Array.from(text, (char) => {
      const cp = char.codePointAt(0);
      return cp === 9 || cp === 10 || cp === 13 || (cp >= 0x20 && cp <= 0xd7ff) || (cp >= 0xe000 && cp <= 0xfffd) || cp >= 0x10000 ? char : "\ufffd";
    }).join("").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
  }

  function line(x1, y1, x2, y2, attributes) {
    return `<line x1="${number(x1)}" y1="${number(y1)}" x2="${number(x2)}" y2="${number(y2)}" ${attributes}/>`;
  }

  function drawText(row, text, x, y, availableWidth, centered, rowHeight, ink, light) {
    if (!text || row.style === "blank") return "";
    const size = Math.min(row.font_size_mm, rowHeight * 0.88);
    const fitting = splitText(text).length * size * (["zhuyin", "kai"].includes(row.font) ? 1.5 : 0.67) > availableWidth ? ` textLength="${number(availableWidth)}" lengthAdjust="spacingAndGlyphs"` : "";
    const style = {
      solid: `fill="${ink}"`, light: `fill="${light}"`,
      dashed: `fill="none" stroke="${ink}" stroke-width=".2" stroke-dasharray=".55 .5" stroke-linecap="round" stroke-linejoin="round"`,
    }[row.style];
    return `<text x="${number(x)}" y="${number(y)}" font-family="${FONTS[row.font]}" font-size="${number(size)}" text-anchor="${centered ? "middle" : "start"}" data-max-width="${number(availableWidth)}" xml:space="preserve" ${style}${fitting}>${escapeXml(displayText(row, text))}</text>`;
  }

  function drawChineseCell(config, row, text, x, y, ink, rule, light) {
    const size = Math.min(row.font_size_mm, config.cell_height_mm * .88, config.cell_height_mm - 2, (config.cell_width_mm - 2) / 1.5);
    const left = x + (config.cell_width_mm - size * 1.5) / 2;
    const top = y + (config.cell_height_mm - size) / 2;
    const guide = `stroke="${rule}" stroke-width=".17" stroke-dasharray=".6 1"`;
    let svg = `<rect class="han-grid" x="${number(left)}" y="${number(top)}" width="${number(size)}" height="${number(size)}" fill="none" stroke="${rule}" stroke-width=".22"/>`;
    if (config.grid_style !== "square") {
      svg += line(left + size / 2, top, left + size / 2, top + size, guide);
      svg += line(left, top + size / 2, left + size, top + size / 2, guide);
    }
    if (config.grid_style === "mi") {
      svg += line(left, top, left + size, top + size, guide);
      svg += line(left + size, top, left, top + size, guide);
    }
    if (config.vertical_guides) svg += `<rect class="zhuyin-grid" x="${number(left + size)}" y="${number(top)}" width="${number(size * .5)}" height="${number(size)}" fill="none" stroke="${rule}" stroke-width=".15" stroke-dasharray=".5 1"/>`;
    // Font metrics: 1024 units per em, ascent 900, Han+Zhuyin advance 1536.
    svg += drawText({ ...row, font_size_mm: size }, text, left, top + size * 900 / 1024, size * 1.5, false, config.cell_height_mm, ink, light);
    return svg;
  }

  function renderWorksheet(input) {
    const config = normalizeWorksheet(input);
    const [shortEdge, longEdge] = PAPER[config.paper_size];
    const [width, height] = config.orientation === "landscape" ? [longEdge, shortEdge] : [shortEdge, longEdge];
    const margin = config.margin_mm;
    const startY = margin + (config.show_header ? 28 : 0);
    const pitch = config.cell_height_mm + config.row_gap_mm;
    const cellGap = config.grid_style === "english" ? 0 : config.cell_gap_mm;
    const cellPitch = config.cell_width_mm + cellGap;
    const rowsPerPage = Math.min(config.rows_per_page, Math.max(1, Math.floor((height - startY - margin - 6 + config.row_gap_mm) / pitch)));
    const columns = Math.min(config.columns, Math.max(1, Math.floor((width - 2 * margin + cellGap) / cellPitch)));
    const warnings = [];
    if (rowsPerPage !== config.rows_per_page) warnings.push(`依目前紙張與格高，每頁最多容納 ${rowsPerPage} 行，已自動分頁。`);
    if (columns !== config.columns) warnings.push(`依目前紙張與格寬，每行最多容納 ${columns} 格；未顯示的格子內容仍會保留。`);
    if (config.rows.some((row) => row.placement === "cells" && (splitText(row.text).length > columns || row.cells.slice(columns).some((text) => text)))) {
      warnings.push("部分逐格文字超出每行格數，列印僅顯示可見的格子。可增加格數、縮小格寬或切換單字／句子模式。");
    }
    if (config.rows.some((row) => row.font === "zhuyin" && [row.text, ...row.cells.filter((cell) => cell !== null)].some((text) => splitText(text).some((unit) => isHan(unit) && !covered.has(Array.from(unit)[0]))))) {
      warnings.push("部分國字不在這款注音字型的注音字集內，可能僅顯示國字或替代字形，請確認列印內容。");
    }
    const pageCount = Math.ceil(Math.max(1, config.rows.length) / rowsPerPage);
    const gray = config.print_mode === "grayscale";
    const ink = gray ? "#363636" : "#334943";
    const rule = gray ? "#8a8a8a" : "#a3bbb0";
    const light = gray ? "#b5b5b5" : "#b5c5bc";
    const gridWidth = columns * config.cell_width_mm + (columns - 1) * cellGap;
    const gridX = (width - gridWidth) / 2;
    const pages = [];
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const svg = [`<svg xmlns="http://www.w3.org/2000/svg" class="worksheet-svg" viewBox="0 0 ${width} ${height}" width="${width}mm" height="${height}mm" role="group" aria-label="書寫練習紙，第 ${pageIndex + 1} 頁"><rect width="${width}" height="${height}" fill="white"/>`];
      if (config.show_header) {
        svg.push(`<text x="${margin}" y="${margin + 6}" font-family="'Patrick Hand', sans-serif" font-size="7" fill="${ink}" data-max-width="${number(width - 2 * margin)}">${escapeXml(config.title)}</text>`);
        svg.push(`<text x="${margin}" y="${margin + 19}" font-family="Arial, sans-serif" font-size="2.7" letter-spacing=".65" fill="${ink}">${config.grid_style === "english" ? "NAME" : "姓名"}</text>`);
        svg.push(line(margin + 13, margin + 19.6, width * 0.52, margin + 19.6, `stroke="${rule}" stroke-width=".2"`));
        svg.push(`<text x="${number(width * 0.64)}" y="${margin + 19}" font-family="Arial, sans-serif" font-size="2.7" letter-spacing=".65" fill="${ink}">${config.grid_style === "english" ? "DATE" : "日期"}</text>`);
        svg.push(line(width * 0.64 + 12, margin + 19.6, width - margin, margin + 19.6, `stroke="${rule}" stroke-width=".2"`));
      }
      for (let slot = 0; slot < rowsPerPage; slot++) {
        const index = pageIndex * rowsPerPage + slot;
        const y = startY + slot * pitch;
        const rowHeight = config.cell_height_mm;
        const top = y + rowHeight * 0.27;
        const baseline = y + rowHeight * 0.76;
        const clipId = `row-${pageIndex}-${slot}`;
        svg.push(`<defs><clipPath id="${clipId}"><rect x="${number(gridX)}" y="${number(y)}" width="${number(gridWidth)}" height="${rowHeight}"/></clipPath></defs>`);
        svg.push(`<g class="practice-row" data-row="${index}" data-x="${number(gridX)}" data-y="${number(y)}" data-width="${number(gridWidth)}" data-height="${rowHeight}" data-cell-width="${config.cell_width_mm}" data-cell-pitch="${number(cellPitch)}"><rect class="row-hit" x="${number(gridX)}" y="${number(y)}" width="${number(gridWidth)}" height="${rowHeight}" fill="transparent"/>`);
        if (config.grid_style === "english") {
          svg.push(line(gridX, top, gridX + gridWidth, top, `stroke="${rule}" stroke-width=".22"`));
          svg.push(line(gridX, baseline, gridX + gridWidth, baseline, `stroke="${rule}" stroke-width=".3"`));
        }
        if (config.vertical_guides && config.grid_style === "english") {
          for (let col = 0; col <= columns; col++) {
            const x = gridX + col * config.cell_width_mm;
            svg.push(line(x, y, x, y + rowHeight, `stroke="${rule}" stroke-width=".16" stroke-dasharray=".5 1.2" opacity=".65"`));
          }
        }
        svg.push(`<g clip-path="url(#${clipId})" pointer-events="none">`);
        const row = config.rows[index];
        if (config.grid_style !== "english") {
          const effectiveRow = row || createRow("", { font: "zhuyin", font_size_mm: 16, style: "blank" });
          const chars = splitText(effectiveRow.text);
          for (let col = 0; col < columns; col++) {
            const generated = chars.length ? (effectiveRow.repeat ? chars[col % chars.length] : chars[col] || "") : "";
            svg.push(drawChineseCell(config, effectiveRow, effectiveRow.cells[col] ?? generated, gridX + col * cellPitch, y, ink, rule, light));
          }
        } else if (row && row.style !== "blank") {
          if (row.placement === "flow") {
            const text = row.text ? Array(row.repeat_count).fill(row.text).join("   ") : "";
            svg.push(drawText(row, text, gridX + 1.8, baseline, gridWidth - 3.6, false, rowHeight, ink, light));
          } else {
            const chars = splitText(row.text);
            for (let col = 0; col < columns; col++) {
              const generated = chars.length ? (row.repeat ? chars[col % chars.length] : chars[col] || "") : "";
              const text = row.cells[col] ?? generated;
              svg.push(drawText(row, text, gridX + (col + 0.5) * config.cell_width_mm, baseline, config.cell_width_mm - 2, true, rowHeight, ink, light));
            }
          }
        }
        svg.push("</g></g>");
      }
      svg.push(`<text x="${margin}" y="${number(height - margin + 2)}" font-family="Arial, sans-serif" font-size="2.2" letter-spacing=".45" fill="${rule}">A LITTLE PRACTICE GOES A LONG WAY.</text><text x="${number(width - margin)}" y="${number(height - margin + 2)}" text-anchor="end" font-family="Arial, sans-serif" font-size="2.5" fill="${rule}">${pageIndex + 1} / ${pageCount}</text></svg>`);
      pages.push(svg.join(""));
    }
    return { pages, width_mm: width, height_mm: height, rows_per_page: rowsPerPage, columns, warnings };
  }

  return Object.freeze({ createRow, createWorksheet, createChineseWorksheet, splitText, getReadingOptions, displayText, normalizeWorksheet, renderWorksheet });
});
