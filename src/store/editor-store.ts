import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { EditorMode } from '../types';
import { md } from '../markdown';

export const useEditorStore = defineStore('editor', () => {
  const source = ref('');
  const mode = ref<EditorMode>('inline');
  const current_file = ref<string | null>(null);
  const is_dirty = ref(false);
  const zoom = ref(100);
  const show_sidebar = ref(true);
  const show_status_bar = ref(true);
  const focus_mode = ref(false);
  const typewriter_mode = ref(false);

  const rendered_html = computed(() => md.render(source.value));

  function set_source(text: string) {
    source.value = text;
    is_dirty.value = true;
  }

  function set_mode(m: EditorMode) {
    mode.value = m;
  }

  function mark_clean() {
    is_dirty.value = false;
  }

  return {
    source, mode, current_file, is_dirty, zoom,
    show_sidebar, show_status_bar, focus_mode, typewriter_mode,
    rendered_html, set_source, set_mode, mark_clean,
  };
});
