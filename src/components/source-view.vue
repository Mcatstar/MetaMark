<template>
  <div class="source-view">
    <textarea
      class="source-textarea"
      :value="editor_store.source"
      @input="onInput"
      spellcheck="false"
      placeholder="在此输入 Markdown..."
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '../store/editor-store';

const editor_store = useEditorStore();

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  editor_store.set_source(target.value);
}
</script>

<style scoped>
.source-view {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.source-textarea {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 24px 32px;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.8;
  background: #fff;
  color: #333;
  box-sizing: border-box;
}

.source-textarea::placeholder {
  color: #bdbdbd;
}
</style>
