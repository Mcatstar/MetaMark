export interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  checked?: boolean;
  children?: MenuItem[];
  action?: string;
}

export interface MenuGroup {
  id: string;
  label: string;
  shortcut_key: string;
  items: MenuItem[];
}

export type EditorMode = 'inline' | 'source' | 'split';

export interface PageSize {
  width: number;
  height: number;
  unit: 'mm' | 'inch';
  label: string;
}

export interface PageMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PageConfig {
  size: PageSize;
  margins: PageMargins;
  show_page_break: boolean;
  double_page: boolean;
}

export interface PaperPreset {
  label: string;
  width_mm: number;
  height_mm: number;
}

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
}

export interface EditorState {
  source: string;
  mode: EditorMode;
  current_file: string | null;
  is_dirty: boolean;
  zoom: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'custom';
  page_config: PageConfig;
  menu_shortcuts: Record<string, string>;
  window_size: { width: number; height: number };
  split_ratio: number;
}
