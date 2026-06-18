<template>
  <div class="editor-area" :class="{ 'editor-area--focus': editor_store.focus_mode }">
    <SplitView v-if="editor_store.mode === 'split'" />
    <InlineView v-else-if="editor_store.mode === 'inline'" />
    <SourceView v-else-if="editor_store.mode === 'source'" />
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '../store/editor-store';
import SplitView from './split-view.vue';
import InlineView from './inline-view.vue';
import SourceView from './source-view.vue';

const editor_store = useEditorStore();
</script>

<style scoped>
.editor-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #fafafa;
  transition: filter 0.2s ease;
}

.editor-area--focus {
  filter: brightness(0.98);
}
</style>
