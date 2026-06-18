import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PageConfig, PageMargins } from '../types';
import { PAPER_PRESETS } from '../utils/page-layout';

const DEFAULT_MARGINS: PageMargins = { top: 25.4, bottom: 25.4, left: 31.7, right: 31.7 };

export const usePageStore = defineStore('page', () => {
  const config = ref<PageConfig>({
    size: { width: PAPER_PRESETS[0].width_mm, height: PAPER_PRESETS[0].height_mm, unit: 'mm', label: PAPER_PRESETS[0].label },
    margins: { ...DEFAULT_MARGINS },
    show_page_break: true,
    double_page: false,
  });
  const show_settings = ref(false);

  function set_paper(index: number, unit: 'mm' | 'inch' = 'mm') {
    const preset = PAPER_PRESETS[index];
    config.value.size = {
      width: unit === 'inch' ? preset.width_mm / 25.4 : preset.width_mm,
      height: unit === 'inch' ? preset.height_mm / 25.4 : preset.height_mm,
      unit,
      label: preset.label,
    };
  }

  function set_custom_size(width: number, height: number, unit: 'mm' | 'inch') {
    config.value.size = { width, height, unit, label: '自定义' };
  }

  function set_margins(m: Partial<PageMargins>) {
    Object.assign(config.value.margins, m);
  }

  function apply_preset(preset: 'standard' | 'narrow' | 'wide') {
    const presets = {
      standard: { top: 25.4, bottom: 25.4, left: 31.7, right: 31.7 },
      narrow: { top: 12.7, bottom: 12.7, left: 12.7, right: 12.7 },
      wide: { top: 25.4, bottom: 25.4, left: 50.8, right: 50.8 },
    };
    config.value.margins = { ...presets[preset] };
  }

  function toggle_page_break() {
    config.value.show_page_break = !config.value.show_page_break;
  }

  function toggle_double_page() {
    config.value.double_page = !config.value.double_page;
  }

  function reset_config() {
    config.value = {
      size: { width: PAPER_PRESETS[0].width_mm, height: PAPER_PRESETS[0].height_mm, unit: 'mm', label: PAPER_PRESETS[0].label },
      margins: { ...DEFAULT_MARGINS },
      show_page_break: true,
      double_page: false,
    };
  }

  return {
    config, show_settings,
    set_paper, set_custom_size, set_margins, apply_preset,
    toggle_page_break, toggle_double_page, reset_config,
  };
});
