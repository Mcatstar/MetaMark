<template>
  <div class="split-view" ref="containerRef">
    <div class="split-left" :style="{ width: leftPercent + '%' }">
      <MonacoEditor
        ref="editorRef"
        v-model="editor_store.source"
        language="markdown"
        :theme="editorTheme"
        :font-size="14"
        :word-wrap="editor_store.word_wrap ? 'on' : 'off'"
        line-numbers="on"
        :minimap="false"
      />
    </div>
    <div
      class="split-divider"
      @mousedown="startDrag"
      :class="{ 'split-divider--dragging': dragging }"
    ></div>
    <div class="split-right" :style="{ width: (100 - leftPercent) + '%' }">
      <div
        class="split-preview"
        v-html="editor_store.rendered_html"
        ref="rightRef"
        @scroll="onPreviewScroll"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useEditorStore } from '../store/editor-store';
import { useThemeStore } from '../store/theme-store';
import * as monaco from 'monaco-editor';
import MonacoEditor from './MonacoEditor.vue';

const editor_store = useEditorStore();
const theme_store = useThemeStore();

const containerRef = ref<HTMLElement | null>(null);
const rightRef = ref<HTMLElement | null>(null);
const editorRef = ref<InstanceType<typeof MonacoEditor> | null>(null);
const leftPercent = ref(50);
const dragging = ref(false);

const editorTheme = computed(() => {
  if (theme_store.theme === 'dark' || theme_store.theme === 'custom') return 'vs-dark';
  return 'vs';
});

// Smooth bidirectional scroll sync with requestAnimationFrame
let scrollDisposable: monaco.IDisposable | null = null;
let rafId: number | null = null;
let lastRatio = -1;

function getEditorRatio(ed: monaco.editor.IStandaloneCodeEditor): number {
  const scrollTop = ed.getScrollTop();
  const scrollHeight = ed.getScrollHeight();
  const container = ed.getContainerDomNode();
  const clientHeight = container?.clientHeight ?? 300;
  const maxScroll = scrollHeight - clientHeight;
  if (maxScroll <= 0) return 0;
  return scrollTop / maxScroll;
}

function getPreviewRatio(preview: HTMLElement): number {
  const maxScroll = preview.scrollHeight - preview.clientHeight;
  if (maxScroll <= 0) return 0;
  return preview.scrollTop / maxScroll;
}

function syncPreview(ed: monaco.editor.IStandaloneCodeEditor) {
  const ratio = getEditorRatio(ed);
  const preview = rightRef.value;
  if (!preview || Math.abs(ratio - lastRatio) < 0.001) return;
  lastRatio = ratio;
  const maxScroll = preview.scrollHeight - preview.clientHeight;
  if (maxScroll > 0) {
    preview.scrollTop = ratio * maxScroll;
  }
}

function syncEditor(preview: HTMLElement) {
  const ratio = getPreviewRatio(preview);
  const ed = editorRef.value?.getEditor();
  if (!ed || Math.abs(ratio - lastRatio) < 0.001) return;
  lastRatio = ratio;
  const container = ed.getContainerDomNode();
  const clientHeight = container?.clientHeight ?? 300;
  const maxScroll = ed.getScrollHeight() - clientHeight;
  if (maxScroll > 0) {
    ed.setScrollPosition({ scrollTop: ratio * maxScroll });
  }
}

function scheduleSyncFromSource(e: any) {
  if (!e.scrollTopChanged) return;
  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    const ed = editorRef.value?.getEditor();
    if (ed) syncPreview(ed);
  });
}

function onPreviewScroll() {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    const preview = rightRef.value;
    if (preview) syncEditor(preview);
  });
}

function startDrag(e: MouseEvent) {
  e.preventDefault();
  dragging.value = true;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
}

function onDrag(e: MouseEvent) {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const pct = Math.max(20, Math.min(80, (x / rect.width) * 100));
  leftPercent.value = pct;
}

function stopDrag() {
  dragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

onMounted(() => {
  nextTick(() => {
    const ed = editorRef.value?.getEditor();
    if (!ed) return;
    scrollDisposable = ed.onDidScrollChange(scheduleSyncFromSource);
  });
});

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  scrollDisposable?.dispose();
  if (rafId !== null) cancelAnimationFrame(rafId);
});
</script>

<style scoped>
.split-view { display: flex; flex: 1; overflow: hidden; position: relative; }
.split-left, .split-right { display: flex; overflow: hidden; }
.split-preview {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 16px 24px;
  font-size: 14px;
  line-height: 1.6;
  box-sizing: border-box;
}
.split-divider {
  width: 5px;
  cursor: col-resize;
  background: #e0e0e0;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  transition: background 0.15s;
}
.split-divider:hover,
.split-divider--dragging { background: #1976d2; }
</style>
