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
  const word_wrap = ref(true);

  const rendered_html = computed(() => md.render(source.value));

  // Dynamic checked states for menu items
  const menu_checked = ref<Record<string, boolean>>({
    view_sidebar: true,
    view_status_bar: true,
    view_actual_size: true,
    view_split_mode: false,
    view_source_mode: false,
    view_focus: false,
    view_typewriter: false,
    para_paragraph: true,
  });

  function set_menu_checked(id: string, val: boolean) {
    menu_checked.value[id] = val;
  }

  function toggle_menu_checked(id: string) {
    menu_checked.value[id] = !menu_checked.value[id];
  }

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
    show_sidebar, show_status_bar, focus_mode, typewriter_mode, word_wrap,
    rendered_html, menu_checked, set_menu_checked, toggle_menu_checked,
    set_source, set_mode, mark_clean,
  };
});
