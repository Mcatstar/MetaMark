import { defineStore } from 'pinia';
import { ref } from 'vue';

type Theme = 'light' | 'dark' | 'custom';

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('light');

  function set_theme(t: Theme) {
    theme.value = t;
    apply_theme(t);
  }

  function apply_theme(t: Theme) {
    document.documentElement.setAttribute('data-theme', t);
  }

  apply_theme(theme.value);

  return { theme, set_theme };
});
