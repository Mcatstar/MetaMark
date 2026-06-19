<template>
  <div class="search-panel">
    <h3 class="panel-title">{{ showReplace ? '查找替换' : '查找' }}</h3>
    <div class="search-input-wrap">
      <input
        ref="searchInput"
        v-model="query"
        type="text"
        :placeholder="showReplace ? '查找...' : '搜索...'"
        class="search-input"
        @input="doSearch"
        @keydown.enter.prevent="nextMatch"
        @keydown.shift.enter.prevent="prevMatch"
        @keydown.escape="clearSearch"
      />
      <button v-if="query" class="search-clear" @click="clearSearch">✕</button>
    </div>
    <div v-if="showReplace" class="search-input-wrap">
      <input
        v-model="replaceText"
        type="text"
        placeholder="替换为..."
        class="search-input"
        @keydown.enter.prevent="replaceCurrent"
      />
    </div>
    <div class="search-options">
      <label class="search-option">
        <input type="checkbox" v-model="caseSensitive" @change="doSearch" />
        <span>Aa</span>
      </label>
      <label class="search-option">
        <input type="checkbox" v-model="useRegex" @change="doSearch" />
        <span>.*</span>
      </label>
      <button class="search-mode-btn" @click="showReplace = !showReplace">
        {{ showReplace ? '🔍' : '✏️' }}
      </button>
    </div>
    <div v-if="matches.length > 0" class="search-info">
      <span class="search-count">{{ currentIdx + 1 }}/{{ matches.length }}</span>
      <div class="search-nav">
        <button @click="prevMatch" class="nav-btn" title="上一个">▲</button>
        <button @click="nextMatch" class="nav-btn" title="下一个">▼</button>
        <button v-if="showReplace" @click="replaceAll" class="nav-btn" title="全部替换">全部</button>
      </div>
    </div>
    <div v-if="showReplace && query" class="replace-actions">
      <button @click="replaceCurrent" class="replace-btn">替换</button>
    </div>
    <div v-if="query && matches.length === 0" class="panel-empty">无匹配</div>
    <div class="search-results" ref="resultsRef">
      <div
        v-for="(m, i) in matches"
        :key="i"
        class="search-match"
        :class="{ 'search-match--active': i === currentIdx }"
        @click="goToMatch(i)"
      >
        <span class="match-line">第 {{ m.line + 1 }} 行</span>
        <span class="match-preview">{{ m.preview }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from '../store/editor-store';

const emit = defineEmits<{ 'go-to-line': [line: number] }>();
const editor_store = useEditorStore();

const query = ref('');
const replaceText = ref('');
const caseSensitive = ref(false);
const useRegex = ref(false);
const showReplace = ref(false);
const matches = ref<{ line: number; col: number; preview: string }[]>([]);
const currentIdx = ref(0);
const resultsRef = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function doSearch() {
  if (!query.value) { matches.value = []; return; }
  const lines = editor_store.source.split('\n');
  const results: { line: number; col: number; preview: string }[] = [];
  let flags = 'g';
  if (!caseSensitive.value) flags += 'i';
  try {
    const re = useRegex.value ? new RegExp(query.value, flags) : new RegExp(escapeRegex(query.value), flags);
    for (let i = 0; i < lines.length; i++) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(lines[i])) !== null) {
        const preview = lines[i].trim().substring(0, 80);
        results.push({ line: i, col: match.index, preview });
      }
    }
  } catch { }
  matches.value = results;
  currentIdx.value = 0;
}

function nextMatch() {
  if (matches.value.length === 0) return;
  currentIdx.value = (currentIdx.value + 1) % matches.value.length;
  scrollToCurrent();
  emitGoToLine();
}

function prevMatch() {
  if (matches.value.length === 0) return;
  currentIdx.value = (currentIdx.value - 1 + matches.value.length) % matches.value.length;
  scrollToCurrent();
  emitGoToLine();
}

function goToMatch(i: number) {
  currentIdx.value = i;
  emitGoToLine();
}

function emitGoToLine() {
  const m = matches.value[currentIdx.value];
  if (m) emit('go-to-line', m.line);
}

function scrollToCurrent() {
  const el = resultsRef.value?.children[currentIdx.value] as HTMLElement | undefined;
  el?.scrollIntoView({ block: 'nearest' });
}

function clearSearch() {
  query.value = '';
  matches.value = [];
  currentIdx.value = 0;
  searchInput.value?.focus();
}

function replaceCurrent() {
  if (matches.value.length === 0) return;
  const m = matches.value[currentIdx.value];
  const lines = editor_store.source.split('\n');
  const line = lines[m.line];
  const before = line.slice(0, m.col);
  const after = line.slice(m.col);
  const searchStr = useRegex.value ? query.value : escapeRegex(query.value);
  const re = new RegExp(searchStr, caseSensitive.value ? '' : 'i');
  const replaced = after.replace(re, replaceText.value);
  lines[m.line] = before + replaced;
  editor_store.set_source(lines.join('\n'));
  doSearch();
}

function replaceAll() {
  if (!query.value) return;
  let flags = 'g';
  if (!caseSensitive.value) flags += 'i';
  try {
    const searchStr = useRegex.value ? query.value : escapeRegex(query.value);
    const re = new RegExp(searchStr, flags);
    editor_store.set_source(editor_store.source.replace(re, replaceText.value));
    doSearch();
  } catch { }
}

defineExpose({ focus: () => searchInput.value?.focus() });
</script>

<style scoped>
.search-panel { display: flex; flex-direction: column; height: 100%; }
.panel-title { font-size: 11px; text-transform: uppercase; color: #888; padding: 8px 12px 4px; letter-spacing: 0.5px; flex-shrink: 0; }
.search-input-wrap { display: flex; align-items: center; margin: 0 12px 6px; position: relative; }
.search-input { width: 100%; padding: 5px 24px 5px 8px; font-size: 13px; border: 1px solid #d0d0d0; border-radius: 4px; outline: none; color: #333; background: #fff; }
.search-input:focus { border-color: #1976d2; }
.search-clear { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); border: none; background: none; cursor: pointer; font-size: 12px; color: #999; padding: 2px 4px; }
.search-clear:hover { color: #333; }
.search-options { display: flex; gap: 8px; padding: 0 12px 8px; flex-shrink: 0; align-items: center; }
.search-option { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666; cursor: pointer; }
.search-option input { accent-color: #1976d2; }
.search-mode-btn { margin-left: auto; border: none; background: none; cursor: pointer; font-size: 14px; padding: 2px 4px; }
.search-info { display: flex; align-items: center; justify-content: space-between; padding: 4px 12px; background: #f5f5f5; border-top: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0; flex-shrink: 0; }
.search-count { font-size: 12px; color: #666; }
.search-nav { display: flex; gap: 2px; }
.nav-btn { padding: 2px 6px; font-size: 11px; border: 1px solid #d0d0d0; border-radius: 3px; background: #fff; cursor: pointer; color: #555; line-height: 1; }
.nav-btn:hover { background: #e8e8e8; }
.replace-actions { padding: 0 12px 6px; }
.replace-btn { padding: 3px 10px; font-size: 12px; border: 1px solid #1976d2; border-radius: 3px; background: #1976d2; color: #fff; cursor: pointer; }
.replace-btn:hover { background: #1565c0; }
.panel-empty { padding: 16px 12px; text-align: center; font-size: 13px; color: #aaa; }
.search-results { flex: 1; overflow-y: auto; padding: 4px 0; }
.search-match { display: flex; flex-direction: column; padding: 4px 12px; cursor: pointer; border-left: 3px solid transparent; }
.search-match:hover { background: #e8e8e8; }
.search-match--active { background: #d4e3f7; border-left-color: #1976d2; }
.match-line { font-size: 11px; color: #999; margin-bottom: 1px; }
.match-preview { font-size: 12px; color: #444; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace; }
</style>
