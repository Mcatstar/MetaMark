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
      <textarea
        v-else
        :ref="(el) => setEditRef(idx, el as HTMLTextAreaElement | null)"
        v-model="block.raw"
        @blur="saveEdit(idx)"
        @keydown.ctrl.enter="saveEdit(idx)"
        class="inline-edit-area"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useEditorStore } from '../store/editor-store';
import { md } from '../markdown';

interface Block {
  raw: string;
  start: number;
  end: number;
  editing: boolean;
}

const editor_store = useEditorStore();

const blocks = ref<Block[]>([]);
const editRefs = ref<(HTMLTextAreaElement | null)[]>([]);

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
  for (const b of blocks.value) {
    editMap.set(b.raw, b.editing);
  }
  for (const b of newBlocks) {
    if (editMap.has(b.raw)) {
      b.editing = editMap.get(b.raw)!;
    }
  }
  blocks.value = newBlocks;
}

function renderBlock(raw: string): string {
  return md.render(raw);
}

function setEditRef(idx: number, el: HTMLTextAreaElement | null) {
  editRefs.value[idx] = el;
}

function startEdit(idx: number) {
  const block = blocks.value[idx];
  if (!block) return;
  for (const b of blocks.value) {
    if (b.editing && b !== block) {
      b.editing = false;
    }
  }
  block.editing = true;
  nextTick(() => {
    const el = editRefs.value[idx];
    if (el) {
      el.focus();
      el.select();
    }
  });
}

function saveEdit(idx: number) {
  const block = blocks.value[idx];
  if (!block) return;
  block.editing = false;
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
  background: #fff;
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

.inline-edit-area {
  width: 100%;
  padding: 6px 8px;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  border: 2px solid #1976d2;
  border-radius: 4px;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  background: #fff;
  color: #333;
}
</style>
