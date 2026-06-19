<template>
  <div ref="container" class="monaco-container" :style="containerStyle"></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, shallowRef } from 'vue';
import * as monaco from 'monaco-editor';
import { registerEditor, unregisterEditor, setActiveEditor } from '../utils/editor-registry';

const props = defineProps<{
  modelValue: string;
  language?: string;
  theme?: string;
  readOnly?: boolean;
  minimap?: boolean;
  lineNumbers?: 'on' | 'off' | 'relative';
  fontSize?: number;
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  automaticLayout?: boolean;
  autoHeight?: boolean;
  maxHeight?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  close: [];
}>();

const container = ref<HTMLElement | null>(null);
const editor = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null);

const containerStyle = computed(() => {
  if (props.autoHeight) {
    return { height: 'auto', minHeight: '0px' };
  }
  return {};
});

onMounted(() => {
  if (!container.value) return;
  const ed = monaco.editor.create(container.value, {
    value: props.modelValue,
    language: props.language || 'markdown',
    theme: props.theme || 'vs-dark',
    readOnly: props.readOnly ?? false,
    minimap: { enabled: props.minimap ?? false },
    lineNumbers: props.lineNumbers ?? 'on',
    fontSize: props.fontSize ?? 14,
    wordWrap: props.wordWrap ?? 'on',
    automaticLayout: props.automaticLayout ?? true,
    scrollBeyondLastLine: !props.autoHeight,
    renderWhitespace: 'selection',
    tabSize: 2,
    cursorBlinking: 'smooth',
    smoothScrolling: true,
    fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace",
    fontLigatures: true,
    padding: { top: 12, bottom: 12 },
    bracketPairColorization: { enabled: true },
    suggest: { showWords: false },
    quickSuggestions: false,
    scrollbar: props.autoHeight && !props.maxHeight
      ? { vertical: 'hidden', horizontal: 'auto', alwaysConsumeMouseWheel: false }
      : { alwaysConsumeMouseWheel: false },
  });

  ed.onDidChangeModelContent(() => {
    emit('update:modelValue', ed.getValue());
    if (props.autoHeight) resizeToContent(ed);
  });

  if (props.autoHeight) {
    ed.onDidContentSizeChange(() => resizeToContent(ed));
  }

  editor.value = ed;
  registerEditor(ed);

  ed.onDidFocusEditorText(() => setActiveEditor(ed));
  ed.onDidFocusEditorWidget(() => setActiveEditor(ed));

  ed.onKeyDown((e) => {
    if (e.keyCode === monaco.KeyCode.Escape) {
      emit('close');
    }
  });

  if (props.autoHeight) resizeToContent(ed);
});

onUnmounted(() => {
  const ed = editor.value;
  if (ed) {
    unregisterEditor(ed);
    ed.dispose();
  }
  editor.value = null;
});

function resizeToContent(ed: monaco.editor.IStandaloneCodeEditor) {
  const el = container.value;
  if (!el) return;
  const contentHeight = Math.max(60, ed.getContentHeight());
  const height = props.maxHeight ? Math.min(contentHeight, props.maxHeight) : contentHeight;
  el.style.height = height + 'px';
  ed.layout({ width: el.clientWidth, height });
}

watch(() => props.modelValue, (val) => {
  const ed = editor.value;
  if (ed && val !== ed.getValue()) {
    ed.setValue(val);
  }
});

watch(() => props.theme, (theme) => {
  if (theme) monaco.editor.setTheme(theme);
});

watch(() => props.readOnly, (val) => {
  editor.value?.updateOptions({ readOnly: !!val });
});

watch(() => props.fontSize, (val) => {
  if (val) editor.value?.updateOptions({ fontSize: val });
});

watch(() => props.language, (lang) => {
  const ed = editor.value;
  if (ed && lang) {
    const model = ed.getModel();
    if (model) monaco.editor.setModelLanguage(model, lang);
  }
});

watch(() => props.wordWrap, (val) => {
  if (val) editor.value?.updateOptions({ wordWrap: val });
});

function toggleWordWrap() {
  const ed = editor.value;
  if (!ed) return;
  const current = ed.getOption(monaco.editor.EditorOption.wordWrap);
  const next = current === 'on' ? 'off' : 'on';
  ed.updateOptions({ wordWrap: next as 'on' | 'off' });
}

function getEditor(): monaco.editor.IStandaloneCodeEditor | null {
  return editor.value;
}

function focus() {
  editor.value?.focus();
}

defineExpose({ getEditor, focus, toggleWordWrap });
</script>

<style scoped>
.monaco-container {
  width: 100%;
  min-height: 100px;
}
</style>
