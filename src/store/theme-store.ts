import { defineStore } from 'pinia';
import { ref } from 'vue';

export type Theme = 'light' | 'dark' | 'custom';

const CUSTOM_THEME_KEY = 'metamark_custom_theme';

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('light');

  function set_theme(t: Theme) {
    theme.value = t;
    apply_theme(t);
  }

  function apply_theme(t: Theme) {
    document.documentElement.className = `theme-${t}`;
    if (t === 'custom') {
      apply_custom_theme();
    }
  }

  function apply_custom_theme() {
    const root = document.documentElement;
    try {
      const raw = localStorage.getItem(CUSTOM_THEME_KEY);
      if (raw) {
        const vars = JSON.parse(raw);
        for (const [key, val] of Object.entries(vars)) {
          if (typeof val === 'string') {
            root.style.setProperty(key, val);
          }
        }
      }
    } catch { /* ignore invalid JSON */ }
  }

  function save_custom_theme(vars: Record<string, string>) {
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(vars));
    if (theme.value === 'custom') {
      apply_custom_theme();
    }
  }

  function load_custom_theme(): Record<string, string> {
    try {
      const raw = localStorage.getItem(CUSTOM_THEME_KEY);
      if (raw) return JSON.parse(raw);
    } catch { }
    return {};
  }

  apply_theme(theme.value);

  return { theme, set_theme, save_custom_theme, load_custom_theme };
});
