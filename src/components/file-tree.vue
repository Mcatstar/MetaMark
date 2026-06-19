<template>
  <div class="file-tree">
    <div class="file-tree-header">
      <button @click="file_store.open_folder_dialog()" class="tree-btn">📂 打开文件夹</button>
      <span v-if="file_store.current_dir" class="tree-current-dir" :title="file_store.current_dir">
        {{ dirName }}
      </span>
    </div>
    <div v-if="loading" class="tree-loading">加载中...</div>
    <div v-else-if="file_store.file_tree.length === 0" class="tree-empty">未打开文件夹</div>
    <div v-else class="tree-list">
      <div
        v-for="item in flatTree"
        :key="item.path"
        class="tree-item"
        :class="{
          'tree-item--dir': item.is_dir,
          'tree-item--active': item.path === file_store.current_path
        }"
        :style="{ paddingLeft: 8 + item.depth * 18 + 'px' }"
        @click="item.is_dir ? toggleExpand(item.path) : openFile(item.path)"
      >
        <span class="tree-arrow" :class="{ 'tree-arrow--hidden': !item.is_dir }">
          {{ item.is_dir ? (expanded.has(item.path) ? '▾' : '▸') : '' }}
        </span>
        <span class="tree-icon">{{ item.is_dir ? (expanded.has(item.path) ? '📂' : '📁') : '📄' }}</span>
        <span class="tree-name">{{ item.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useFileStore } from '../store/file-store';
import type { FileNode } from '../types';

const file_store = useFileStore();
const expanded = ref(new Set<string>());
const childrenMap = ref<Record<string, FileNode[]>>({});
const loading = ref(false);

interface FlatItem {
  name: string;
  path: string;
  is_dir: boolean;
  depth: number;
}

const dirName = computed(() => {
  const dir = file_store.current_dir;
  if (!dir) return '';
  const parts = dir.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || dir;
});

const flatTree = computed(() => {
  const result: FlatItem[] = [];
  function walk(nodes: FileNode[], depth: number) {
    for (const node of nodes) {
      result.push({ name: node.name, path: node.path, is_dir: node.is_dir, depth });
      if (node.is_dir && expanded.value.has(node.path)) {
        const children = node.children || childrenMap.value[node.path] || [];
        walk(children, depth + 1);
      }
    }
  }
  walk(file_store.file_tree, 0);
  return result;
});

async function toggleExpand(path: string) {
  if (expanded.value.has(path)) {
    const s = new Set(expanded.value);
    s.delete(path);
    expanded.value = s;
    return;
  }
  if (!childrenMap.value[path]) {
    try {
      const entries = await invoke<FileNode[]>('list_directory', { path });
      childrenMap.value = { ...childrenMap.value, [path]: entries };
    } catch (e) {
      console.error('Failed to load directory:', e);
      return;
    }
  }
  const s = new Set(expanded.value);
  s.add(path);
  expanded.value = s;
}

async function openFile(path: string) {
  loading.value = true;
  await file_store.open_file_by_path(path);
  loading.value = false;
}

watch(() => file_store.file_tree, () => {
  expanded.value = new Set();
  childrenMap.value = {};
});
</script>

<style scoped>
.file-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  user-select: none;
}

.file-tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.tree-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  color: #333;
  cursor: pointer;
  white-space: nowrap;
}

.tree-btn:hover {
  background: #e8e8e8;
}

.tree-current-dir {
  font-size: 11px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: 8px;
}

.tree-loading,
.tree-empty {
  padding: 24px 12px;
  text-align: center;
  font-size: 13px;
  color: #aaa;
}

.tree-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.tree-item {
  display: flex;
  align-items: center;
  padding: 3px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #444;
  border-radius: 0;
  transition: background 0.1s;
  gap: 2px;
}

.tree-item:hover {
  background: #e8e8e8;
}

.tree-item--active {
  background: #d4e3f7;
  color: #1a1a1a;
}

.tree-item--active:hover {
  background: #c8ddf5;
}

.tree-arrow {
  display: inline-block;
  width: 14px;
  font-size: 10px;
  color: #888;
  flex-shrink: 0;
  text-align: center;
}

.tree-arrow--hidden {
  visibility: hidden;
}

.tree-icon {
  margin-right: 4px;
  font-size: 13px;
  flex-shrink: 0;
}

.tree-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
