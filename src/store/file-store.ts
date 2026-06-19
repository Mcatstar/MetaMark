import { defineStore } from 'pinia';
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { open, save, message } from '@tauri-apps/plugin-dialog';
import type { FileNode } from '../types';

export const useFileStore = defineStore('file', () => {
  const current_path = ref<string>('');
  const current_dir = ref<string>('');
  const file_tree = ref<FileNode[]>([]);
  const recent_files = ref<string[]>([]);

  // Load recent files from localStorage
  try {
    const saved = localStorage.getItem('metamark_recent');
    if (saved) recent_files.value = JSON.parse(saved);
  } catch {
    // ignore
  }
  const open_files = ref<{ path: string; name: string }[]>([]);

  function add_recent(path: string) {
    const list = recent_files.value.filter(p => p !== path);
    list.unshift(path);
    if (list.length > 20) list.pop();
    recent_files.value = list;
    localStorage.setItem('metamark_recent', JSON.stringify(list));
  }

  function clear_recent() {
    recent_files.value = [];
    localStorage.removeItem('metamark_recent');
  }

  async function load_file_tree(path: string) {
    try {
      const entries = await invoke<FileNode[]>('list_directory', { path });
      file_tree.value = entries;
      current_dir.value = path;
    } catch (e) {
      console.error('Failed to load file tree:', e);
    }
  }

  async function open_file_dialog() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Markdown',
          extensions: ['md', 'markdown', 'mdown', 'txt']
        }]
      });
      if (selected) {
        const path = selected as string;
        await open_file_by_path(path);
      }
    } catch (e) {
      console.error('Open dialog failed:', e);
    }
  }

  async function open_folder_dialog() {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        const path = selected as string;
        await load_file_tree(path);
      }
    } catch (e) {
      console.error('Open folder dialog failed:', e);
    }
  }

  async function open_file_by_path(path: string) {
    try {
      const content = await invoke<string>('read_file', { path });
      current_path.value = path;
      add_recent(path);
      const name = path.split(/[\\/]/).pop() || path;
      const existing = open_files.value.find(f => f.path === path);
      if (!existing) {
        open_files.value.push({ path, name });
      }
      return { path, content };
    } catch (e) {
      console.error('Failed to open file:', e);
      await message(`无法打开文件: ${e}`, { title: '错误', kind: 'error' });
      return null;
    }
  }

  async function save_current_file(content: string): Promise<boolean> {
    if (!current_path.value) {
      return save_as_file(content);
    }
    try {
      await invoke('write_file', { path: current_path.value, content });
      add_recent(current_path.value);
      return true;
    } catch (e) {
      console.error('Failed to save file:', e);
      await message(`保存失败: ${e}`, { title: '错误', kind: 'error' });
      return false;
    }
  }

  async function save_as_file(content: string): Promise<boolean> {
    try {
      const selected = await save({
        filters: [{
          name: 'Markdown',
          extensions: ['md', 'markdown']
        }],
        defaultPath: 'untitled.md'
      });
      if (selected) {
        const path = selected as string;
        await invoke('write_file', { path, content });
        current_path.value = path;
        add_recent(path);
        const name = path.split(/[\\/]/).pop() || path;
        const existing = open_files.value.find(f => f.path === path);
        if (!existing) {
          open_files.value.push({ path, name });
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Save as failed:', e);
      await message(`另存为失败: ${e}`, { title: '错误', kind: 'error' });
      return false;
    }
  }

  async function delete_current_file() {
    if (!current_path.value) return;
    try {
      await invoke('delete_file', { path: current_path.value });
      const name = current_path.value.split(/[\\/]/).pop() || '';
      open_files.value = open_files.value.filter(f => f.path !== current_path.value);
      current_path.value = '';
      return name;
    } catch (e) {
      console.error('Delete failed:', e);
      await message(`删除失败: ${e}`, { title: '错误', kind: 'error' });
      return null;
    }
  }

  function close_file(path: string) {
    open_files.value = open_files.value.filter(f => f.path !== path);
    if (current_path.value === path) {
      const prev = open_files.value[open_files.value.length - 1];
      current_path.value = prev?.path || '';
    }
  }

  return {
    current_path, current_dir, file_tree, recent_files, open_files,
    load_file_tree, open_file_dialog, open_folder_dialog, open_file_by_path,
    save_current_file, save_as_file, delete_current_file, close_file,
    add_recent, clear_recent,
  };
});
