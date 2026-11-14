// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
use serde::{Deserialize, Serialize};
use std::fmt::Write;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default, deny_unknown_fields)]
pub struct Worksheet {
    pub title: String,
    pub show_header: bool,
    pub paper_size: PaperSize,
    pub orientation: Orientation,
    pub print_mode: PrintMode,
    pub margin_mm: f64,
    pub rows_per_page: usize,
    pub columns: usize,
    pub cell_width_mm: f64,
    pub cell_height_mm: f64,
    pub row_gap_mm: f64,
    pub vertical_guides: bool,
    pub rows: Vec<Row>,
}

impl Default for Worksheet {
    fn default() -> Self {
        Self {
            title: "A little practice, every day.".into(),
            show_header: true,
            paper_size: PaperSize::A4,
            orientation: Orientation::Portrait,
            print_mode: PrintMode::Color,
            margin_mm: 14.0,
            rows_per_page: 10,
            columns: 12,
            cell_width_mm: 15.0,
            cell_height_mm: 16.0,
            row_gap_mm: 5.0,
            vertical_guides: true,
            rows: vec![],
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize)]
pub enum PaperSize {
    #[default]
    A4,
    A5,
    Letter,
}
#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Orientation {
    #[default]
    Portrait,
    Landscape,
}
#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PrintMode {
    #[default]
    Color,
    Grayscale,
}
#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Font {
    #[default]
    Hand,
    Cursive,
    Sans,
    Serif,
    Mono,
}
#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TextStyle {
    Solid,
    #[default]
    Dashed,
    Light,
    Blank,
}
#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Placement {
    #[default]
    Cells,
    Flow,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default, deny_unknown_fields)]
pub struct Row {
    pub text: String,
    pub font: Font,
    pub style: TextStyle,
    pub font_size_mm: f64,
    pub placement: Placement,
    pub repeat: bool,
    pub repeat_count: usize,
    pub cells: Vec<Option<String>>,
}
impl Default for Row {
    fn default() -> Self {
        Self {
            text: String::new(),
            font: Font::Hand,
            style: TextStyle::Dashed,
            font_size_mm: 10.5,
            placement: Placement::Cells,
            repeat: false,
            repeat_count: 1,
            cells: vec![],
        }
    }
}

#[derive(Debug, Serialize)]
pub struct RenderResult {
    pub pages: Vec<String>,
    pub width_mm: f64,
    pub height_mm: f64,
    pub rows_per_page: usize,
    pub columns: usize,
    pub warnings: Vec<String>,
}

fn escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn range(value: f64, min: f64, max: f64, label: &str) -> Result<(), String> {
    if !value.is_finite() || !(min..=max).contains(&value) {
        return Err(format!("{label}須介於 {min} 與 {max} 之間。"));
    }
    Ok(())
}

pub fn render(config: &Worksheet) -> Result<RenderResult, String> {
    range(config.margin_mm, 8.0, 30.0, "邊界 (mm)")?;
    range(config.cell_width_mm, 8.0, 35.0, "格寬 (mm)")?;
    range(config.cell_height_mm, 10.0, 30.0, "格高 (mm)")?;
    range(config.row_gap_mm, 2.0, 12.0, "行距 (mm)")?;
    if !(1..=30).contains(&config.rows_per_page) || !(1..=40).contains(&config.columns) {
        return Err("每頁行數須為 1–30，每行格數須為 1–40。".into());
    }
    if config.rows.len() > 200 || config.title.chars().count() > 80 {
        return Err("最多可建立 200 行；標題上限為 80 個字元。".into());
    }
    for row in &config.rows {
        range(row.font_size_mm, 4.0, 22.0, "字級 (mm)")?;
        if !(1..=100).contains(&row.repeat_count) {
            return Err("重複次數須為 1–100 的整數。".into());
        }
        if row.text.chars().count() > 500
            || row.cells.len() > 40
            || row.cells.iter().flatten().any(|s| s.chars().count() > 80)
        {
            return Err("每行文字上限 500 字元，每格上限 80 字元。".into());
        }
    }
    let (mut width, mut height) = match config.paper_size {
        PaperSize::A4 => (210.0, 297.0),
        PaperSize::A5 => (148.0, 210.0),
        PaperSize::Letter => (215.9, 279.4),
    };
    if matches!(config.orientation, Orientation::Landscape) {
        std::mem::swap(&mut width, &mut height);
    }
    let margin = config.margin_mm;
    let header_height = if config.show_header { 28.0 } else { 0.0 };
    let start_y = margin + header_height;
    let row_pitch = config.cell_height_mm + config.row_gap_mm;
    // Reserve a small footer and include the final row without an unnecessary trailing gap.
    let fit_rows =
        ((height - start_y - margin - 6.0 + config.row_gap_mm) / row_pitch).floor() as usize;
    let fit_columns = ((width - 2.0 * margin) / config.cell_width_mm).floor() as usize;
    let rows_per_page = config.rows_per_page.min(fit_rows.max(1));
    let columns = config.columns.min(fit_columns.max(1));
    let mut warnings = vec![];
    if rows_per_page != config.rows_per_page {
        warnings.push(format!(
            "依目前紙張與格高，每頁最多容納 {rows_per_page} 行，已自動分頁。"
        ));
    }
    if columns != config.columns {
        warnings.push(format!(
            "依目前紙張與格寬，每行最多容納 {columns} 格；未顯示的格子內容仍會保留。"
        ));
    }
    let mut hidden_cells = false;
    for row in &config.rows {
        if matches!(row.placement, Placement::Cells)
            && (row.text.chars().count() > columns
                || row
                    .cells
                    .iter()
                    .skip(columns)
                    .flatten()
                    .any(|s| !s.is_empty()))
        {
            hidden_cells = true;
        }
    }
    if hidden_cells {
        warnings.push(
            "部分逐格文字超出每行格數，列印僅顯示可見的格子。可增加格數、縮小格寬或切換整句模式。"
                .into(),
        );
    }
    let page_count = config.rows.len().max(1).div_ceil(rows_per_page);
    let gray = matches!(config.print_mode, PrintMode::Grayscale);
    let ink = if gray { "#363636" } else { "#334943" };
    let rule = if gray { "#8a8a8a" } else { "#a3bbb0" };
    let light = if gray { "#b5b5b5" } else { "#b5c5bc" };
    let grid_width = columns as f64 * config.cell_width_mm;
    let grid_x = (width - grid_width) / 2.0;
    let mut pages = vec![];
    for page_index in 0..page_count {
        let mut svg = format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" class="worksheet-svg" viewBox="0 0 {width} {height}" width="{width}mm" height="{height}mm" role="group" aria-label="英文練習紙，第 {} 頁"><rect width="{width}" height="{height}" fill="white"/>"#,
            page_index + 1
        );
        if config.show_header {
            let title_y = margin + 6.0;
            let _ = write!(
                svg,
                r#"<text x="{margin}" y="{title_y}" font-family="'Patrick Hand', sans-serif" font-size="7" fill="{ink}" data-max-width="{}">{}</text><text x="{margin}" y="{}" font-family="Arial, sans-serif" font-size="2.7" letter-spacing=".65" fill="{ink}">NAME</text><line x1="{}" y1="{}" x2="{}" y2="{}" stroke="{rule}" stroke-width=".2"/><text x="{}" y="{}" font-family="Arial, sans-serif" font-size="2.7" letter-spacing=".65" fill="{ink}">DATE</text><line x1="{}" y1="{}" x2="{}" y2="{}" stroke="{rule}" stroke-width=".2"/>"#,
                width - 2.0 * margin,
                escape(&config.title),
                margin + 19.0,
                margin + 13.0,
                margin + 19.6,
                width * 0.52,
                margin + 19.6,
                width * 0.64,
                margin + 19.0,
                width * 0.64 + 12.0,
                margin + 19.6,
                width - margin,
                margin + 19.6
            );
        }
        for slot in 0..rows_per_page {
            let index = page_index * rows_per_page + slot;
            let y = start_y + slot as f64 * row_pitch;
            let row_height = config.cell_height_mm;
            let top = y + row_height * 0.27;
            let baseline = y + row_height * 0.76;
            let bottom = y + row_height;
            let right = grid_x + grid_width;
            let clip_id = format!("row-{page_index}-{slot}");
            let _ = write!(
                svg,
                r#"<defs><clipPath id="{clip_id}"><rect x="{grid_x}" y="{y}" width="{grid_width}" height="{row_height}"/></clipPath></defs><g class="practice-row" data-row="{index}" data-x="{grid_x}" data-y="{y}" data-width="{grid_width}" data-height="{row_height}" data-cell-width="{}"><rect class="row-hit" x="{grid_x}" y="{y}" width="{grid_width}" height="{row_height}" fill="transparent"/><line x1="{grid_x}" y1="{top}" x2="{right}" y2="{top}" stroke="{rule}" stroke-width=".22"/><line x1="{grid_x}" y1="{baseline}" x2="{right}" y2="{baseline}" stroke="{rule}" stroke-width=".3"/>"#,
                config.cell_width_mm
            );
            if config.vertical_guides {
                for col in 0..=columns {
                    let x = grid_x + col as f64 * config.cell_width_mm;
                    let _ = write!(
                        svg,
                        r#"<line x1="{x}" y1="{y}" x2="{x}" y2="{bottom}" stroke="{rule}" stroke-width=".16" stroke-dasharray=".5 1.2" opacity=".65"/>"#
                    );
                }
            }
            let _ = write!(
                svg,
                r#"<g clip-path="url(#{clip_id})" pointer-events="none">"#
            );
            if let Some(row) = config.rows.get(index) {
                if !matches!(row.style, TextStyle::Blank) {
                    match row.placement {
                        Placement::Flow => {
                            let text = if !row.text.is_empty() {
                                std::iter::repeat_n(row.text.as_str(), row.repeat_count)
                                    .collect::<Vec<_>>()
                                    .join("   ")
                            } else {
                                row.text.clone()
                            };
                            draw_text(
                                &mut svg,
                                row,
                                &text,
                                grid_x + 1.8,
                                baseline,
                                grid_width - 3.6,
                                false,
                                row_height,
                                ink,
                                light,
                            );
                        }
                        Placement::Cells => {
                            let chars = row.text.chars().collect::<Vec<_>>();
                            for col in 0..columns {
                                let text = row
                                    .cells
                                    .get(col)
                                    .and_then(|s| s.as_ref())
                                    .cloned()
                                    .unwrap_or_else(|| {
                                        if chars.is_empty() {
                                            String::new()
                                        } else if row.repeat {
                                            chars[col % chars.len()].to_string()
                                        } else {
                                            chars.get(col).map(char::to_string).unwrap_or_default()
                                        }
                                    });
                                draw_text(
                                    &mut svg,
                                    row,
                                    &text,
                                    grid_x + (col as f64 + 0.5) * config.cell_width_mm,
                                    baseline,
                                    config.cell_width_mm - 2.0,
                                    true,
                                    row_height,
                                    ink,
                                    light,
                                );
                            }
                        }
                    }
                }
            }
            svg.push_str("</g></g>");
        }
        let _ = write!(
            svg,
            r#"<text x="{margin}" y="{}" font-family="Arial, sans-serif" font-size="2.2" letter-spacing=".45" fill="{rule}">A LITTLE PRACTICE GOES A LONG WAY.</text><text x="{}" y="{}" text-anchor="end" font-family="Arial, sans-serif" font-size="2.5" fill="{rule}">{} / {page_count}</text></svg>"#,
            height - margin + 2.0,
            width - margin,
            height - margin + 2.0,
            page_index + 1
        );
        pages.push(svg);
    }
    Ok(RenderResult {
        pages,
        width_mm: width,
        height_mm: height,
        rows_per_page,
        columns,
        warnings,
    })
}

#[allow(clippy::too_many_arguments)]
fn draw_text(
    svg: &mut String,
    row: &Row,
    text: &str,
    x: f64,
    y: f64,
    available_width: f64,
    centered: bool,
    row_height: f64,
    ink: &str,
    light: &str,
) {
    if text.is_empty() {
        return;
    }
    let family = match row.font {
        Font::Hand => "'Patrick Hand', sans-serif",
        Font::Cursive => "'Caveat', cursive",
        Font::Sans => "Arial, sans-serif",
        Font::Serif => "Georgia, serif",
        Font::Mono => "'Courier New', monospace",
    };
    let size = row.font_size_mm.min(row_height * 0.88);
    let estimated_width = text.chars().count() as f64 * size * 0.67;
    let fitting = if estimated_width > available_width {
        format!(r#" textLength="{available_width}" lengthAdjust="spacingAndGlyphs""#)
    } else {
        String::new()
    };
    let anchor = if centered { "middle" } else { "start" };
    let style = match row.style {
        TextStyle::Solid => format!(r#"fill="{ink}""#),
        TextStyle::Light => format!(r#"fill="{light}""#),
        TextStyle::Dashed => format!(
            r#"fill="none" stroke="{ink}" stroke-width=".2" stroke-dasharray=".55 .5" stroke-linecap="round" stroke-linejoin="round""#
        ),
        TextStyle::Blank => return,
    };
    let _ = write!(
        svg,
        r#"<text x="{x}" y="{y}" font-family="{family}" font-size="{size}" text-anchor="{anchor}" data-max-width="{available_width}" {style}{fitting}>{}</text>"#,
        escape(text)
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flow_repeats_exactly_the_requested_number_of_times() {
        for (text, count, expected) in [
            ("apple", 1, "apple"),
            ("apple", 3, "apple   apple   apple"),
            ("Keep growing.", 2, "Keep growing.   Keep growing."),
        ] {
            let config = Worksheet {
                rows: vec![Row {
                    text: text.into(),
                    placement: Placement::Flow,
                    repeat_count: count,
                    ..Default::default()
                }],
                ..Default::default()
            };
            let result = render(&config).unwrap();
            assert!(result.pages[0].contains(&format!(">{expected}</text>")));
        }
    }

    #[test]
    fn repeat_counts_are_bounded_and_default_to_one() {
        let default_row: Row =
            serde_json::from_str(r#"{"text":"apple","placement":"flow"}"#).unwrap();
        assert_eq!(default_row.repeat_count, 1);
        for count in [0, 101] {
            let config = Worksheet {
                rows: vec![Row {
                    repeat_count: count,
                    ..Default::default()
                }],
                ..Default::default()
            };
            assert!(render(&config).is_err());
        }
        assert!(serde_json::from_str::<Row>(r#"{"repeat_count":1.5}"#).is_err());
        let config = Worksheet {
            rows: vec![Row {
                text: "apple".into(),
                placement: Placement::Flow,
                repeat_count: 100,
                ..Default::default()
            }],
            ..Default::default()
        };
        assert!(render(&config).is_ok());
    }

    #[test]
    fn a4_paginates_and_keeps_two_horizontal_lines_per_row() {
        let config = Worksheet {
            rows: vec![Row::default(); 23],
            ..Default::default()
        };
        let result = render(&config).unwrap();
        assert_eq!((result.width_mm, result.height_mm), (210.0, 297.0));
        assert_eq!(result.pages.len(), 3);
        // 2 header underlines, 2 writing lines per row. Vertical guides have a dash pattern.
        let svg = &result.pages[0];
        assert_eq!(svg.matches("class=\"practice-row\"").count(), 10);
        assert_eq!(svg.matches("stroke-width=\".3\"").count(), 10);
        assert_eq!(svg.matches("stroke-width=\".22\"").count(), 10);
    }

    #[test]
    fn small_landscape_paper_reduces_grid_without_overflow() {
        let config = Worksheet {
            paper_size: PaperSize::A5,
            orientation: Orientation::Landscape,
            rows_per_page: 30,
            columns: 40,
            ..Default::default()
        };
        let result = render(&config).unwrap();
        assert_eq!((result.width_mm, result.height_mm), (210.0, 148.0));
        assert_eq!(result.rows_per_page, 4);
        assert_eq!(result.columns, 12);
        assert_eq!(result.warnings.len(), 2);
    }

    #[test]
    fn untrusted_text_is_escaped_in_svg() {
        let config = Worksheet {
            title: "<script>&\"'".into(),
            rows: vec![Row {
                text: "<img onerror='x'>".into(),
                placement: Placement::Flow,
                ..Default::default()
            }],
            ..Default::default()
        };
        let result = render(&config).unwrap();
        assert!(!result.pages[0].contains("<script>"));
        assert!(!result.pages[0].contains("<img"));
        assert!(result.pages[0].contains("&lt;img onerror=&apos;x&apos;&gt;"));
    }

    #[test]
    fn cell_overrides_and_per_row_styles_are_independent() {
        let row = Row {
            text: "Aa".into(),
            cells: vec![Some("Hello".into())],
            ..Default::default()
        };
        let config = Worksheet {
            rows: vec![
                row,
                Row {
                    text: "World".into(),
                    font: Font::Cursive,
                    style: TextStyle::Solid,
                    placement: Placement::Flow,
                    ..Default::default()
                },
            ],
            ..Default::default()
        };
        let result = render(&config).unwrap();
        assert!(result.pages[0].contains(">Hello</text>"));
        assert!(result.pages[0].contains("'Caveat', cursive"));
        assert!(result.pages[0].contains("stroke-dasharray=\".55 .5\""));
    }

    #[test]
    fn rejects_invalid_sizes_and_excessive_content() {
        let config = Worksheet {
            cell_height_mm: f64::NAN,
            ..Default::default()
        };
        assert!(render(&config).is_err());
        let config = Worksheet {
            rows: vec![Row::default(); 201],
            ..Default::default()
        };
        assert!(render(&config).is_err());
        let config = Worksheet {
            columns: 0,
            ..Default::default()
        };
        assert!(render(&config).is_err());
    }
}
