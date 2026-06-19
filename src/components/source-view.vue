<template>
  <div class="source-view">
    <MonacoEditor
      ref="editorRef"
      v-model="editor_store.source"
      language="markdown"
      :theme="editorTheme"
      :font-size="14"
      :word-wrap="editor_store.word_wrap ? 'on' : 'off'"
      line-numbers="on"
      :minimap="true"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from '../store/editor-store';
import { useThemeStore } from '../store/theme-store';
import MonacoEditor from './MonacoEditor.vue';

const editor_store = useEditorStore();
const theme_store = useThemeStore();
const editorRef = ref<InstanceType<typeof MonacoEditor> | null>(null);

const editorTheme = computed(() => {
  if (theme_store.theme === 'dark' || theme_store.theme === 'custom') return 'vs-dark';
  return 'vs';
});

function focus() {
  editorRef.value?.focus();
}

defineExpose({ focus });
</script>

<style scoped>
.source-view {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
