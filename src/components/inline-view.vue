<template>
  <div class="inline-view">
    <div
      v-for="(block, idx) in blocks"
      :key="idx"
      class="inline-block"
    >
      <div
        v-if="!block.editing"
        class="inline-preview"
        v-html="renderBlock(block.raw)"
        @dblclick="startEdit(idx)"
      ></div>
      <MonacoEditor
        v-else
        :ref="(el) => setEditRef(idx, el)"
        :model-value="block.raw"
        @update:model-value="(v: string) => onBlockEdit(idx, v)"
        language="markdown"
        :theme="editorTheme"
        :font-size="14"
        :word-wrap="editor_store.word_wrap ? 'on' : 'off'"
        line-numbers="off"
        :minimap="false"
        auto-height
        :max-height="maxEditorHeight"
        @close="stopEdit(idx)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useEditorStore } from '../store/editor-store';
import { useThemeStore } from '../store/theme-store';
import { md } from '../markdown';
import MonacoEditor from './MonacoEditor.vue';

interface Block {
  raw: string;
  start: number;
  end: number;
  editing: boolean;
}

const editor_store = useEditorStore();
const theme_store = useThemeStore();

const blocks = ref<Block[]>([]);
const editRefs = ref<(typeof MonacoEditor | null)[]>([]);

const editorTheme = computed(() => {
  if (theme_store.theme === 'dark' || theme_store.theme === 'custom') return 'vs-dark';
  return 'vs';
});
const maxEditorHeight = computed(() => Math.min(400, window.innerHeight * 0.5));

function getBlocks(text: string): Block[] {
  const tokens = md.parse(text, {});
  const lines = text.split('\n');
  const result: Block[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.map && (token.nesting === 1 || token.type === 'fence' || token.type === 'code_block')) {
      let start = token.map[0];
      let end = token.map[1];
      if (token.nesting === 1) {
        let depth = 1;
        let j = i + 1;
        while (j < tokens.length) {
          if (tokens[j].nesting === 1) depth++;
          if (tokens[j].nesting === -1) depth--;
          if (depth === 0) {
            const m = tokens[j].map;
            if (m) end = m[1];
            break;
          }
          j++;
        }
        i = j;
      }
      const raw = lines.slice(start, end).join('\n');
      result.push({ raw, start, end, editing: false });
    }
    i++;
  }
  return result;
}

function rebuildBlocks() {
  const newBlocks = getBlocks(editor_store.source);
  const editMap = new Map<string, boolean>();
  for (const b of blocks.value) editMap.set(b.raw, b.editing);
  for (const b of newBlocks) {
    if (editMap.has(b.raw)) b.editing = editMap.get(b.raw)!;
  }
  blocks.value = newBlocks;
}

function renderBlock(raw: string): string {
  return md.render(raw);
}

function setEditRef(idx: number, el: any) {
  editRefs.value[idx] = el;
}

function onBlockEdit(idx: number, val: string) {
  const block = blocks.value[idx];
  if (block) block.raw = val;
}

function startEdit(idx: number) {
  const block = blocks.value[idx];
  if (!block) return;
  // Save any currently editing block first
  for (let i = 0; i < blocks.value.length; i++) {
    if (blocks.value[i].editing) {
      blocks.value[i].editing = false;
      commitBlock(i);
    }
  }
  block.editing = true;
  setTimeout(() => {
    const ref = editRefs.value[idx];
    if (ref && 'focus' in ref) (ref as any).focus();
  }, 50);
}

function stopEdit(idx: number) {
  const block = blocks.value[idx];
  if (!block) return;
  block.editing = false;
  commitBlock(idx);
}

function commitBlock(idx: number) {
  const block = blocks.value[idx];
  if (!block) return;
  const newSource = blocks.value.map(b => b.raw).join('\n');
  editor_store.set_source(newSource);
}

watch(() => editor_store.source, () => {
  rebuildBlocks();
}, { immediate: true });
</script>

<style scoped>
.inline-view {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}
.inline-block {
  margin: 2px 0;
}
.inline-preview {
  padding: 2px 8px;
  border-radius: 4px;
  cursor: text;
  min-height: 1.4em;
}
.inline-preview:hover {
  background: #f0f4ff;
}
</style>
