import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { FileNode } from '../types';

export const useFileStore = defineStore('file', () => {
  const current_path = ref<string>('');
  const file_tree = ref<FileNode[]>([]);
  const recent_files = ref<string[]>([]);
  const open_files = ref<string[]>([]);

  async function load_file_tree(_path: string) {
    // TODO: invoke Tauri command to list files
  }

  async function open_file(_path: string) {
    // TODO: invoke Tauri command to read file
  }

  async function save_file(_path: string, _content: string) {
    // TODO: invoke Tauri command to write file
  }

  return { current_path, file_tree, recent_files, open_files, load_file_tree, open_file, save_file };
});
