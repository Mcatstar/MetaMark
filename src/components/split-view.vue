<template>
  <div class="split-view" ref="containerRef">
    <div class="split-left" :style="{ width: leftPercent + '%' }">
      <textarea
        class="split-source"
        :value="editor_store.source"
        @input="onSourceInput"
        @scroll="onLeftScroll"
        ref="leftRef"
        spellcheck="false"
      ></textarea>
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
        @scroll="onRightScroll"
        ref="rightRef"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { useEditorStore } from '../store/editor-store';

const editor_store = useEditorStore();

const containerRef = ref<HTMLElement | null>(null);
const leftRef = ref<HTMLTextAreaElement | null>(null);
const rightRef = ref<HTMLElement | null>(null);
const leftPercent = ref(50);
const dragging = ref(false);
const syncing = ref(false);

function onSourceInput(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  editor_store.set_source(target.value);
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

function calcRatio(el: HTMLElement): number {
  const { scrollTop, scrollHeight, clientHeight } = el;
  if (scrollHeight <= clientHeight) return 0;
  return scrollTop / (scrollHeight - clientHeight);
}

function setRatio(el: HTMLElement, ratio: number) {
  const { scrollHeight, clientHeight } = el;
  if (scrollHeight <= clientHeight) return;
  el.scrollTop = ratio * (scrollHeight - clientHeight);
}

function onLeftScroll() {
  if (syncing.value || !leftRef.value || !rightRef.value) return;
  syncing.value = true;
  const ratio = calcRatio(leftRef.value);
  setRatio(rightRef.value, ratio);
  syncing.value = false;
}

function onRightScroll() {
  if (syncing.value || !leftRef.value || !rightRef.value) return;
  syncing.value = true;
  const ratio = calcRatio(rightRef.value);
  setRatio(leftRef.value, ratio);
  syncing.value = false;
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
});
</script>

<style scoped>
.split-view {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.split-left,
.split-right {
  display: flex;
  overflow: hidden;
}

.split-source {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 16px;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  background: #fff;
  color: #333;
  box-sizing: border-box;
}

.split-preview {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  background: #fff;
  color: #333;
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
.split-divider--dragging {
  background: #1976d2;
}
</style>
