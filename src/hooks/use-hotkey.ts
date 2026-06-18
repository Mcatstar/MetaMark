import { onMounted, onUnmounted } from 'vue';

type HotkeyHandler = (e: KeyboardEvent) => void;

const hotkey_map = new Map<string, HotkeyHandler>();

export function useHotkey() {
  function register(shortcut: string, handler: HotkeyHandler) {
    hotkey_map.set(shortcut, handler);
  }

  function unregister(shortcut: string) {
    hotkey_map.delete(shortcut);
  }

  function parse_shortcut(shortcut: string): { ctrl: boolean; shift: boolean; alt: boolean; key: string } {
    const parts = shortcut.split('+');
    return {
      ctrl: parts.includes('Ctrl'),
      shift: parts.includes('Shift'),
      alt: parts.includes('Alt'),
      key: parts[parts.length - 1].toLowerCase(),
    };
  }

  function match_shortcut(e: KeyboardEvent): string | null {
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    return parts.join('+');
  }

  function handle_keydown(e: KeyboardEvent) {
    const combo = match_shortcut(e);
    if (combo && hotkey_map.has(combo)) {
      e.preventDefault();
      e.stopPropagation();
      hotkey_map.get(combo)!(e);
    }
  }

  onMounted(() => window.addEventListener('keydown', handle_keydown));
  onUnmounted(() => window.removeEventListener('keydown', handle_keydown));

  return { register, unregister, parse_shortcut };
}
