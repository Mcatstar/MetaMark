import { ref, inject, type InjectionKey } from 'vue';
import type { MenuGroup } from '../types';
import menuConfig from '../config/menu-config.json';

export const MENU_ACTION_KEY: InjectionKey<(action_id: string) => void> = Symbol('menuAction');

const active_menu = ref<string | null>(null);
const active_submenu = ref<string | null>(null);

export function useMenu() {
  const menus = menuConfig as MenuGroup[];
  const on_action = inject(MENU_ACTION_KEY, (_id: string) => {});

  function toggle_menu(id: string) {
    active_menu.value = active_menu.value === id ? null : id;
    active_submenu.value = null;
  }

  function open_menu(id: string) {
    active_menu.value = id;
  }

  function close_all() {
    active_menu.value = null;
    active_submenu.value = null;
  }

  function set_submenu(id: string | null) {
    active_submenu.value = id;
  }

  function handle_action(action_id: string) {
    on_action(action_id);
    close_all();
  }

  return {
    menus,
    active_menu,
    active_submenu,
    toggle_menu,
    open_menu,
    close_all,
    set_submenu,
    handle_action,
  };
}
