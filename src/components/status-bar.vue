<template>
  <div v-if="editor_store.show_status_bar" class="status-bar">
    <span class="status-left">
      <span v-if="editor_store.current_file">{{ editor_store.current_file }}</span>
      <span v-else>未保存</span>
      <span v-if="editor_store.is_dirty"> ● 已修改</span>
    </span>
    <span class="status-right">
      <span>字数: {{ wordCount }}</span>
      <span>行数: {{ lineCount }}</span>
      <span>{{ modeLabel }}</span>
      <span>{{ editor_store.zoom }}%</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '../store/editor-store';

const editor_store = useEditorStore();

const wordCount = computed(() => {
  const text = editor_store.source.trim();
  return text ? text.split(/\s+/).length : 0;
});

const lineCount = computed(() => {
  return editor_store.source ? editor_store.source.split('\n').length : 0;
});

const modeLabel = computed(() => {
  switch (editor_store.mode) {
    case 'split': return '分页双栏';
    case 'inline': return '原位编辑';
    case 'source': return '源码模式';
  }
});
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24px;
  padding: 0 12px;
  background: #f5f5f5;
  border-top: 1px solid #d0d0d0;
  font-size: 12px;
  color: #666;
  user-select: none;
  flex-shrink: 0;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-right {
  gap: 16px;
}
</style>
