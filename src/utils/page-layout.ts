import type { PaperPreset, PageMargins, PageConfig } from '../types';

export const PAPER_PRESETS: PaperPreset[] = [
  { label: 'A4', width_mm: 210, height_mm: 297 },
  { label: 'A3', width_mm: 297, height_mm: 420 },
  { label: 'A5', width_mm: 148, height_mm: 210 },
  { label: 'B5', width_mm: 176, height_mm: 250 },
  { label: '信纸', width_mm: 215.9, height_mm: 279.4 },
  { label: 'Letter', width_mm: 215.9, height_mm: 279.4 },
  { label: 'Legal', width_mm: 215.9, height_mm: 355.6 },
];

const MM_PER_INCH = 25.4;

export function mm_to_px(mm: number, dpi = 96): number {
  return Math.round((mm / MM_PER_INCH) * dpi);
}

export function inch_to_px(inch: number, dpi = 96): number {
  return Math.round(inch * dpi);
}

export function px_to_mm(px: number, dpi = 96): number {
  return (px / dpi) * MM_PER_INCH;
}

export function calc_page_content_height(page_height_mm: number, margins: PageMargins, dpi = 96): number {
  const usable_mm = page_height_mm - margins.top - margins.bottom;
  return mm_to_px(usable_mm, dpi);
}

export function get_page_css(page_config: PageConfig): string {
  const { size, margins, show_page_break } = page_config;
  const w = size.unit === 'inch' ? inch_to_px(size.width) : mm_to_px(size.width);
  const h = size.unit === 'inch' ? inch_to_px(size.height) : mm_to_px(size.height);
  const mt = mm_to_px(margins.top);
  const mb = mm_to_px(margins.bottom);
  const ml = mm_to_px(margins.left);
  const mr = mm_to_px(margins.right);

  return `
.editor-page {
  width: ${w}px;
  min-height: ${h}px;
  padding: ${mt}px ${mr}px ${mb}px ${ml}px;
  box-sizing: border-box;
  margin: 0 auto;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  position: relative;
  overflow: hidden;
}
.editor-page + .editor-page {
  margin-top: 16px;
}
${show_page_break ? `.page-break-indicator {
  page-break-after: always;
  border-bottom: 1px dashed #ccc;
  margin-bottom: 0;
}` : ''}
`.trim();
}
