<template>
  <div class="outline-panel">
    <h3 class="panel-title">大纲</h3>
    <div v-if="headings.length === 0" class="panel-empty">无标题</div>
    <div v-else class="outline-list">
      <div
        v-for="(h, i) in headings"
        :key="i"
        class="outline-item"
        :style="{ paddingLeft: (h.level - 1) * 16 + 8 + 'px' }"
        @click="$emit('scroll-to', h.anchor)"
      >
        <span class="outline-level">H{{ h.level }}</span>
        <span class="outline-text">{{ h.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '../store/editor-store';
import { get_headings } from '../utils/md-renderer';

const editor_store = useEditorStore();
defineEmits<{ 'scroll-to': [anchor: string] }>();

const headings = computed(() => get_headings(editor_store.source));
</script>

<style scoped>
.outline-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-title {
  font-size: 11px;
  text-transform: uppercase;
  color: #888;
  padding: 8px 12px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.panel-empty {
  padding: 24px 12px;
  text-align: center;
  font-size: 13px;
  color: #aaa;
}

.outline-list {
  flex: 1;
  overflow-y: auto;
  padding: 2px 0;
}

.outline-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #444;
  transition: background 0.1s;
}

.outline-item:hover {
  background: #e8e8e8;
}

.outline-level {
  font-size: 10px;
  color: #999;
  background: #e8e8e8;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
  font-weight: 600;
}

.outline-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #555;
}
</style>
