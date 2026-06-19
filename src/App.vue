<template>
  <div class="app" :class="`theme-${theme_store.theme}`">
    <TopMenuBar @menu-action="handleMenuAction" />
    <div class="app-body" :class="{ 'sidebar-open': editor_store.show_sidebar }">
      <aside v-if="editor_store.show_sidebar" class="sidebar">
        <div class="sidebar-tabs">
          <button :class="{ active: sidebar_tab === 'file' }" @click="sidebar_tab = 'file'">📁 文件</button>
          <button :class="{ active: sidebar_tab === 'outline' }" @click="sidebar_tab = 'outline'">📋 大纲</button>
          <button :class="{ active: sidebar_tab === 'search' }" @click="sidebar_tab = 'search'">🔍 搜索</button>
        </div>
        <div class="sidebar-content">
          <FileTree v-if="sidebar_tab === 'file'" />
          <OutlinePanel v-else-if="sidebar_tab === 'outline'" @scroll-to="scrollToHeading" />
          <SearchPanel v-else-if="sidebar_tab === 'search'" @go-to-line="goToLine" />
        </div>
      </aside>
      <main class="app-main" :style="mainStyle">
        <div class="editor-tabs" v-if="file_store.open_files.length > 0">
          <div
            v-for="f in file_store.open_files" :key="f.path"
            class="editor-tab" :class="{ active: f.path === file_store.current_path }"
            @click="switchFile(f.path)"
          >
            {{ f.name }}
            <span class="tab-close" @click.stop="closeFileTab(f.path)">×</span>
          </div>
          <div class="editor-tab new-tab" @click="newFile">+</div>
        </div>
        <EditorArea />
      </main>
    </div>
    <StatusBar />

    <!-- Quick Open overlay -->
    <div v-if="show_quick_open" class="quick-open-overlay" @click.self="show_quick_open = false">
      <div class="quick-open-panel">
        <input ref="quickOpenInput" v-model="quick_open_query" placeholder="搜索最近打开的文件..." @keydown="onQuickOpenKey" class="quick-open-input" />
        <div class="quick-open-list">
          <div
            v-for="(f, i) in filtered_recent"
            :key="f"
            class="quick-open-item"
            :class="{ active: i === quick_open_idx }"
            @click="openRecentFile(f)"
            @mouseenter="quick_open_idx = i"
          >
            {{ f.split(/[\\/]/).pop() }}
            <span class="quick-open-path">{{ f }}</span>
          </div>
          <div v-if="filtered_recent.length === 0" class="quick-open-empty">无匹配文件</div>
        </div>
      </div>
    </div>

    <PageSettingsDialog />
    <PreferencesDialog :visible="show_preferences" @close="show_preferences = false" />
    <AboutDialog :visible="show_about" @close="show_about = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { loadPreferences, applyPreferences } from './utils/settings';
import * as monaco from 'monaco-editor';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open, message as dialogMessage } from '@tauri-apps/plugin-dialog';
import { useEditorStore } from './store/editor-store';
import { usePageStore } from './store/page-store';
import { useThemeStore } from './store/theme-store';
import { useFileStore } from './store/file-store';
import { export_file } from './utils/export';
import { getActiveEditor } from './utils/editor-registry';
import TopMenuBar from './components/top-menu-bar.vue';
import EditorArea from './components/editor-area.vue';
import StatusBar from './components/status-bar.vue';
import PageSettingsDialog from './components/page-settings-dialog.vue';
import FileTree from './components/file-tree.vue';
import OutlinePanel from './components/outline-panel.vue';
import SearchPanel from './components/search-panel.vue';
import PreferencesDialog from './components/preferences-dialog.vue';
import AboutDialog from './components/about-dialog.vue';

const editor_store = useEditorStore();
const page_store = usePageStore();
const theme_store = useThemeStore();
const file_store = useFileStore();

const sidebar_tab = ref<'file' | 'outline' | 'search'>('file');
const show_preferences = ref(false);
const show_about = ref(false);
const show_quick_open = ref(false);
const quick_open_query = ref('');
const quick_open_idx = ref(0);
const quickOpenInput = ref<HTMLInputElement | null>(null);
let untitled_counter = 0;

const mainStyle = computed(() => ({
  fontSize: editor_store.zoom + '%',
}));

const filtered_recent = computed(() => {
  const q = quick_open_query.value.toLowerCase();
  return file_store.recent_files.filter(f => f.toLowerCase().includes(q));
});

function newFile() {
  untitled_counter++;
  const name = `untitled-${untitled_counter}.md`;
  const path = `untitled://${name}`;
  file_store.open_files.push({ path, name });
  file_store.current_path = path;
  editor_store.set_source('');
  editor_store.mark_clean();
}

function closeFileTab(path: string) {
  file_store.close_file(path);
  if (file_store.current_path === path) {
    const last = file_store.open_files[file_store.open_files.length - 1];
    if (last) {
      file_store.current_path = last.path;
      if (!last.path.startsWith('untitled://')) {
        file_store.open_file_by_path(last.path).then(r => { if (r) editor_store.set_source(r.content); });
      }
    } else {
      editor_store.set_source('');
    }
  }
}

async function switchFile(path: string) {
  if (path.startsWith('untitled://')) {
    file_store.current_path = path;
    return;
  }
  const result = await file_store.open_file_by_path(path);
  if (result) editor_store.set_source(result.content);
}

async function openRecentFile(path: string) {
  show_quick_open.value = false;
  const result = await file_store.open_file_by_path(path);
  if (result) {
    editor_store.set_source(result.content);
    editor_store.mark_clean();
  }
}

function scrollToHeading(_anchor: string) {}
function goToLine(_line: number) {
  editor_store.set_mode('source');
}

function onQuickOpenKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    quick_open_idx.value = Math.min(filtered_recent.value.length - 1, quick_open_idx.value + 1);
  } else if (e.key === 'ArrowUp') {
    quick_open_idx.value = Math.max(0, quick_open_idx.value - 1);
  } else if (e.key === 'Enter') {
    const f = filtered_recent.value[quick_open_idx.value];
    if (f) openRecentFile(f);
  } else if (e.key === 'Escape') {
    show_quick_open.value = false;
  }
}

async function handleMenuAction(action: string) {
  const el = document.activeElement;
  const in_textarea = el?.tagName === 'TEXTAREA';

  switch (action) {
    // === 文件 ===
    case 'file_new':
      newFile();
      break;
    case 'file_new_window':
      await invoke('plugin:shell|open', { path: '' }).catch(() => {});
      break;
    case 'file_open':
      await file_store.open_file_dialog();
      if (file_store.current_path) {
        const result = await file_store.open_file_by_path(file_store.current_path);
        if (result) editor_store.set_source(result.content);
      }
      break;
    case 'file_open_folder':
      await file_store.open_folder_dialog();
      break;
    case 'file_quick_open':
      show_quick_open.value = true;
      quick_open_query.value = '';
      quick_open_idx.value = 0;
      await nextTick();
      quickOpenInput.value?.focus();
      break;
    case 'file_save': {
      const ok = await file_store.save_current_file(editor_store.source);
      if (ok) editor_store.mark_clean();
      break;
    }
    case 'file_save_all':
      for (const f of file_store.open_files) {
        if (!f.path.startsWith('untitled://')) {
          await file_store.save_current_file(editor_store.source);
        }
      }
      break;
    case 'file_move_to': {
      const dst = await open({ directory: true, title: '选择目标文件夹' });
      if (dst && file_store.current_path && !file_store.current_path.startsWith('untitled://')) {
        const name = file_store.current_path.replace(/.*[/\\]/, '');
        const newPath = String(dst).replace(/[/\\]+$/, '') + '\\' + (name || 'untitled.md');
        await invoke('write_file', { path: newPath, content: editor_store.source });
        await invoke('delete_file', { path: file_store.current_path });
        file_store.current_path = newPath;
      }
      break;
    }
    case 'file_show_sidebar':
      editor_store.show_sidebar = true;
      sidebar_tab.value = 'file';
      break;
    case 'file_import':
      await file_store.open_file_dialog();
      if (file_store.current_path) {
        const result = await file_store.open_file_by_path(file_store.current_path);
        if (result) editor_store.set_source(result.content);
      }
      break;
    case 'file_save_as': {
      const ok = await file_store.save_as_file(editor_store.source);
      if (ok) editor_store.mark_clean();
      break;
    }
    case 'file_delete':
      await file_store.delete_current_file();
      editor_store.set_source('');
      break;
    case 'file_export_pdf':
      await export_file(editor_store.source, 'pdf');
      break;
    case 'file_export_html':
      await export_file(editor_store.source, 'html');
      break;
    case 'file_export_word':
      await export_file(editor_store.source, 'docx');
      break;
    case 'file_export_image':
      await export_file(editor_store.source, 'pdf');
      break;
    case 'file_export_md':
      await export_file(editor_store.source, 'md');
      break;
    case 'file_export_odt':
      await export_file(editor_store.source, 'odt');
      break;
    case 'file_export_rtf':
      await export_file(editor_store.source, 'rtf');
      break;
    case 'file_export_epub':
      await export_file(editor_store.source, 'epub');
      break;
    case 'file_export_latex':
      await export_file(editor_store.source, 'latex');
      break;
    case 'file_print':
      await printDocument();
      break;
    case 'file_preferences':
      show_preferences.value = true;
      break;
    case 'file_open_location':
      if (file_store.current_path && !file_store.current_path.startsWith('untitled://')) {
        const dir = file_store.current_path.replace(/[/\\][^/\\]+$/, '');
        await invoke('plugin:shell|open', { path: dir }).catch(() => {});
      }
      break;
    case 'file_properties': {
      const lines = editor_store.source.split('\n');
      const words = editor_store.source.trim() ? editor_store.source.trim().split(/\s+/).length : 0;
      alert(`文件: ${file_store.current_path || '未保存'}\n字数: ${editor_store.source.length}\n单词: ${words}\n行数: ${lines.length}\n大小: ${new Blob([editor_store.source]).size} bytes`);
      break;
    }

    // === 编辑 ===
    case 'edit_undo':
      if (!in_textarea) document.execCommand('undo');
      break;
    case 'edit_redo':
      if (!in_textarea) document.execCommand('redo');
      break;
    case 'edit_cut':
      document.execCommand('cut');
      break;
    case 'edit_copy':
      document.execCommand('copy');
      break;
    case 'edit_copy_md':
      await navigator.clipboard.writeText(editor_store.source);
      break;
    case 'edit_copy_html':
      await navigator.clipboard.writeText(editor_store.rendered_html);
      break;
    case 'edit_copy_plain':
      await copyPlainText();
      break;
    case 'edit_copy_simple':
      await copyPlainText();
      break;
    case 'edit_paste':
      document.execCommand('paste');
      break;
    case 'edit_paste_plain': {
      const text = await navigator.clipboard.readText();
      insertAtCursor(text);
      break;
    }
    case 'edit_copy_image':
      await navigator.clipboard.writeText(editor_store.source);
      break;
    case 'edit_select_line':
      performEdit((ed) => {
        const pos = ed.getPosition()!;
        const range = new monaco.Range(pos.lineNumber, 1, pos.lineNumber, ed.getModel()!.getLineMaxColumn(pos.lineNumber));
        ed.setSelection(range);
        ed.focus();
      });
      break;
    case 'edit_select_word':
      performEdit((ed) => {
        const pos = ed.getPosition()!;
        const model = ed.getModel()!;
        const line = model.getLineContent(pos.lineNumber);
        const wordMatch = line.slice(0, pos.column - 1).match(/([^\s]+)$/);
        const start = wordMatch ? pos.column - wordMatch[1].length - 1 : 0;
        const endMatch = line.slice(pos.column - 1).match(/^([^\s]+)/);
        const end = endMatch ? pos.column - 1 + endMatch[1].length : line.length;
        ed.setSelection(new monaco.Range(pos.lineNumber, start + 1, pos.lineNumber, end + 1));
        ed.focus();
      });
      break;
    case 'edit_math_inline':
      wrapSelection('$', '$');
      break;
    case 'edit_math_block':
      wrapSelection('$$\n', '\n$$');
      break;
    case 'edit_punct_quotes': {
      const text = editor_store.source.replace(/(?<=^|[-\s(])"(?=\S)/g, '\u201c').replace(/(?<=\S)"/g, '\u201d').replace(/'/g, '\u2019');
      editor_store.set_source(text);
      break;
    }
    case 'edit_punct_dashes': {
      const text = editor_store.source.replace(/---/g, '\u2014').replace(/--/g, '\u2013');
      editor_store.set_source(text);
      break;
    }
    case 'edit_find':
      editor_store.show_sidebar = true;
      sidebar_tab.value = 'search';
      editor_store.set_menu_checked('view_sidebar', true);
      break;
    case 'edit_replace':
      editor_store.show_sidebar = true;
      sidebar_tab.value = 'search';
      editor_store.set_menu_checked('view_sidebar', true);
      break;
    case 'edit_toggle_wrap': {
      editor_store.word_wrap = !editor_store.word_wrap;
      break;
    }
    case 'edit_select_all':
      document.execCommand('selectAll');
      break;
    case 'edit_delete':
      if (in_textarea) document.execCommand('delete');
      break;
    case 'edit_delete_line':
      deleteLine();
      break;
    case 'edit_delete_para': {
      const el = document.activeElement as HTMLTextAreaElement | null;
      if (el?.tagName === 'TEXTAREA') {
        const start = editor_store.source.lastIndexOf('\n\n', el.selectionStart - 2);
        const end = editor_store.source.indexOf('\n\n', el.selectionStart);
        const s = start < 0 ? 0 : start + 2;
        const e = end < 0 ? editor_store.source.length : end;
        editor_store.set_source(editor_store.source.slice(0, s) + editor_store.source.slice(e));
      }
      break;
    }

    // === 段落 ===
    case 'para_h1': insertPrefix('# '); break;
    case 'para_h2': insertPrefix('## '); break;
    case 'para_h3': insertPrefix('### '); break;
    case 'para_h4': insertPrefix('#### '); break;
    case 'para_h5': insertPrefix('##### '); break;
    case 'para_h6': insertPrefix('###### '); break;
    case 'para_paragraph': insertPrefix(''); break;
    case 'para_heading_up':
      headingUp();
      break;
    case 'para_heading_down':
      headingDown();
      break;
    case 'para_quote': insertPrefix('> '); break;
    case 'para_olist': insertPrefix('1. '); break;
    case 'para_ulist': insertPrefix('- '); break;
    case 'para_task': insertPrefix('- [ ] '); break;
    case 'para_code_block': wrapSelection('```\n', '\n```'); break;
    case 'para_math_block': wrapSelection('$$\n', '\n$$'); break;
    case 'para_table_insert': insertTable(); break;
    case 'para_table_row_add':
      performEdit((ed) => {
        const pos = ed.getPosition()!;
        ed.executeEdits('user', [{ range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1), text: '|   |   |\n' }]);
        ed.focus();
      });
      break;
    case 'para_table_col_add':
      performEdit((ed) => {
        const pos = ed.getPosition()!;
        const model = ed.getModel()!;
        const line = model.getLineContent(pos.lineNumber);
        const idx = line.indexOf('---');
        if (idx === -1) {
          const text = line + ' --- |';
          ed.executeEdits('user', [{ range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, line.length + 1), text }]);
        } else {
          ed.executeEdits('user', [{ range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, line.length + 1), text: line.replace(/---+/, '$&--- |') }]);
        }
        ed.focus();
      });
      break;
    case 'para_table_row_del':
      performEdit((ed) => {
        const pos = ed.getPosition()!;
        const model = ed.getModel()!;
        const range = new monaco.Range(pos.lineNumber, 1, pos.lineNumber, model.getLineMaxColumn(pos.lineNumber));
        ed.executeEdits('user', [{ range, text: '' }]);
        ed.focus();
      });
      break;
    case 'para_table_col_del':
      performEdit((ed) => {
        const pos = ed.getPosition()!;
        const model = ed.getModel()!;
        const line = model.getLineContent(pos.lineNumber);
        const cols = line.split('|');
        if (cols.length > 2) {
          const cursorCol = line.slice(0, pos.column - 1).split('|').length - 1;
          const idx = Math.min(cursorCol || 1, cols.length - 2);
          cols.splice(idx, 1);
          const newLine = cols.join('|');
          ed.executeEdits('user', [{ range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, line.length + 1), text: newLine }]);
        }
        ed.focus();
      });
      break;
    case 'para_code_run':
      if (file_store.current_path) {
        const ext = file_store.current_path.replace(/.*\./, '').toLowerCase();
        const cmd = ext === 'py' ? 'python' : ext === 'js' ? 'node' : ext === 'rs' ? 'cargo script' : '';
        if (cmd) {
          await invoke('plugin:shell|open', { path: cmd }).catch(() => {
            dialogMessage(`未找到 ${cmd}，请确保已安装`, { title: '提示', kind: 'info' });
          });
        }
      }
      break;
    case 'para_alert_info':
      insertAtCursor('::: note 提示\n内容\n:::\n');
      break;
    case 'para_alert_warn':
      insertAtCursor('::: warning 注意\n内容\n:::\n');
      break;
    case 'para_alert_error':
      insertAtCursor('::: danger 危险\n内容\n:::\n');
      break;

    // === 格式 ===
    case 'fmt_bold': wrapSelection('**', '**'); break;
    case 'fmt_italic': wrapSelection('*', '*'); break;
    case 'fmt_underline': wrapSelection('<u>', '</u>'); break;
    case 'fmt_code': wrapSelection('`', '`'); break;
    case 'fmt_strikethrough': wrapSelection('~~', '~~'); break;
    case 'fmt_highlight': wrapSelection('==', '=='); break;
    case 'fmt_inline_math': wrapSelection('$', '$'); break;
    case 'fmt_superscript': wrapSelection('<sup>', '</sup>'); break;
    case 'fmt_subscript': wrapSelection('<sub>', '</sub>'); break;
    case 'fmt_comment': insertAtCursor('<!--  -->'); break;
    case 'fmt_link': wrapSelection('[', '](url)'); break;
    case 'fmt_link_open':
      performEdit((ed) => {
        const sel = ed.getSelection()!;
        const model = ed.getModel()!;
        const text = model.getValueInRange(sel) || model.getLineContent(sel.startLineNumber);
        const match = text.match(/\[([^\]]*)\]\(([^)]+)\)/);
        if (match) {
          invoke('plugin:opener|open_url', { url: match[2] }).catch(() => {});
        }
      });
      break;
    case 'fmt_link_edit':
      performEdit((ed) => {
        const sel = ed.getSelection()!;
        const model = ed.getModel()!;
        const text = model.getValueInRange(sel) || model.getLineContent(sel.startLineNumber);
        const match = text.match(/\[([^\]]*)\]\(([^)]+)\)/);
        if (match) {
          const newUrl = prompt('修改链接 URL:', match[2]);
          if (newUrl !== null) {
            const newText = text.replace(match[0], `[${match[1]}](${newUrl})`);
            const range = new monaco.Range(sel.startLineNumber, 1, sel.startLineNumber, text.length + 1);
            ed.executeEdits('user', [{ range, text: newText }]);
          }
        } else {
          wrapSelection('[', '](url)');
        }
        ed.focus();
      });
      break;
    case 'fmt_link_remove':
      performEdit((ed) => {
        const sel = ed.getSelection()!;
        const model = ed.getModel()!;
        const text = model.getValueInRange(sel) || model.getLineContent(sel.startLineNumber);
        const match = text.match(/\[([^\]]*)\]\([^)]*\)/);
        if (match) {
          const range = new monaco.Range(sel.startLineNumber, 1, sel.startLineNumber, text.length + 1);
          ed.executeEdits('user', [{ range, text: text.replace(match[0], match[1]) }]);
        }
        ed.focus();
      });
      break;
    case 'fmt_image_insert': {
      const url = prompt('图像 URL:');
      if (url) insertAtCursor(`![](${url})`);
      break;
    }
    case 'fmt_image_local': {
      const sel = await open({ filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'] }] });
      if (sel) {
        let imgPath = String(sel).replace(/\\/g, '/');
        if (file_store.current_path && !file_store.current_path.startsWith('untitled://')) {
          const baseDir = file_store.current_path.replace(/[/\\][^/\\]+$/, '').replace(/\\/g, '/');
          const imgDir = imgPath.substring(0, imgPath.lastIndexOf('/'));
          if (baseDir && imgDir.startsWith(baseDir.replace(/\/+$/, ''))) {
            imgPath = imgPath.substring(baseDir.replace(/\/+$/, '').length + 1);
          }
        }
        insertAtCursor(`![](${imgPath})`);
      }
      break;
    }
    case 'fmt_clear': clearFormatting(); break;

    // === 视图 ===
    case 'view_split_mode':
      if (editor_store.mode === 'inline') {
        editor_store.set_mode('split');
      } else if (editor_store.mode === 'source') {
        editor_store.set_mode('split');
      } else {
        editor_store.set_mode('inline');
      }
      editor_store.set_menu_checked('view_split_mode', editor_store.mode === 'split');
      editor_store.set_menu_checked('view_source_mode', editor_store.mode === 'source');
      break;
    case 'view_source_mode':
      if (editor_store.mode === 'inline') {
        editor_store.set_mode('source');
      } else if (editor_store.mode === 'split') {
        editor_store.set_mode('source');
      } else {
        editor_store.set_mode('inline');
      }
      editor_store.set_menu_checked('view_split_mode', editor_store.mode === 'split');
      editor_store.set_menu_checked('view_source_mode', editor_store.mode === 'source');
      break;
    case 'view_sidebar':
      editor_store.show_sidebar = !editor_store.show_sidebar;
      editor_store.set_menu_checked('view_sidebar', editor_store.show_sidebar);
      break;
    case 'view_outline':
      editor_store.show_sidebar = true;
      editor_store.set_menu_checked('view_sidebar', true);
      sidebar_tab.value = 'outline';
      break;
    case 'view_file_tree':
      editor_store.show_sidebar = true;
      editor_store.set_menu_checked('view_sidebar', true);
      sidebar_tab.value = 'file';
      break;
    case 'view_search':
      editor_store.show_sidebar = true;
      editor_store.set_menu_checked('view_sidebar', true);
      sidebar_tab.value = 'search';
      break;
    case 'view_focus':
      editor_store.focus_mode = !editor_store.focus_mode;
      editor_store.set_menu_checked('view_focus', editor_store.focus_mode);
      break;
    case 'view_typewriter':
      editor_store.typewriter_mode = !editor_store.typewriter_mode;
      editor_store.set_menu_checked('view_typewriter', editor_store.typewriter_mode);
      break;
    case 'view_status_bar':
      editor_store.show_status_bar = !editor_store.show_status_bar;
      editor_store.set_menu_checked('view_status_bar', editor_store.show_status_bar);
      break;
    case 'view_fullscreen': {
      const win = getCurrentWindow();
      const isFull = await win.isFullscreen();
      await win.setFullscreen(!isFull);
      break;
    }
    case 'view_always_top': {
      const win = getCurrentWindow();
      await win.setAlwaysOnTop(!(await win.isAlwaysOnTop()));
      break;
    }
    case 'view_zoom_in':
      editor_store.zoom = Math.min(200, editor_store.zoom + 10);
      break;
    case 'view_zoom_out':
      editor_store.zoom = Math.max(50, editor_store.zoom - 10);
      break;
    case 'view_doc_list':
      editor_store.show_sidebar = true;
      sidebar_tab.value = 'file';
      editor_store.set_menu_checked('view_sidebar', true);
      break;
    case 'view_word_count': {
      const lines = editor_store.source.split('\n');
      const words = editor_store.source.trim() ? editor_store.source.trim().split(/\s+/).length : 0;
      await dialogMessage(`字符数: ${editor_store.source.length}\n单词数: ${words}\n行数: ${lines.length}`, { title: '字数统计', kind: 'info' });
      break;
    }
    case 'view_switch_window':
      await invoke('plugin:window|start').catch(() => {});
      break;
    case 'view_actual_size':
      editor_store.zoom = 100;
      break;
    case 'view_devtools':
      await invoke('plugin:window|open_devtools').catch(() => {});
      break;

    // === 页面 ===
    case 'page_size':
    case 'page_margins':
      page_store.show_settings = true;
      break;
    case 'page_toggle_break':
      page_store.toggle_page_break();
      break;
    case 'page_single':
      page_store.config.double_page = false;
      if (editor_store.mode === 'split') editor_store.set_mode('inline');
      break;
    case 'page_double':
      page_store.config.double_page = true;
      editor_store.set_mode('split');
      editor_store.set_menu_checked('view_split_mode', true);
      editor_store.set_menu_checked('view_source_mode', false);
      break;
    case 'page_reset':
      page_store.reset_config();
      break;
    case 'page_print_preview':
      await printDocument();
      break;

    // === 主题 ===
    case 'theme_light':
      theme_store.set_theme('light');
      break;
    case 'theme_dark':
      theme_store.set_theme('dark');
      break;
    case 'theme_custom':
      theme_store.set_theme('custom');
      break;

    // === 帮助 ===
    case 'help_about':
      show_about.value = true;
      break;
    case 'help_docs':
      await invoke('plugin:opener|open_url', { url: 'https://github.com/mcatstar/metamark' }).catch(() => {});
      break;
  }
}

// ---- Text manipulation (Monaco-based) ----
function getActiveMonaco(): monaco.editor.IStandaloneCodeEditor | null {
  const active = document.activeElement;
  if (active) {
    let el: HTMLElement | null = active as HTMLElement;
    while (el) {
      if (el.classList.contains('monaco-container')) break;
      el = el.parentElement;
    }
    if (el) {
      const views = (monaco as any).editor?.getEditors?.();
      if (views) {
        for (const v of views) {
          const dom = v.getContainerDomNode?.();
          if (dom && dom.contains(active)) return v;
        }
      }
    }
  }
  // Fallback: use the globally tracked active editor
  const fallback = getActiveEditor();
  if (fallback) {
    // Focus the editor so subsequent operations work
    fallback.focus();
    return fallback;
  }
  return null;
}

function performEdit(fn: (editor: monaco.editor.IStandaloneCodeEditor) => void) {
  const ed = getActiveMonaco();
  if (ed) {
    fn(ed);
  } else {
    editor_store.set_source(editor_store.source + ' ');
  }
}

function insertAtCursor(text: string) {
  performEdit((ed) => {
    const sel = ed.getSelection();
    if (sel) {
      const range = new monaco.Range(sel.startLineNumber, sel.startColumn, sel.endLineNumber, sel.endColumn);
      ed.executeEdits('user', [{ range, text, forceMoveMarkers: true }]);
      const pos = sel.getStartPosition();
      const newPos = pos.delta(0, text.length);
      ed.setPosition(newPos);
      ed.focus();
    } else {
      const pos = ed.getPosition() || { lineNumber: 1, column: 1 };
      const range = new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
      ed.executeEdits('user', [{ range, text, forceMoveMarkers: true }]);
      const newPos = { lineNumber: pos.lineNumber, column: pos.column + text.length };
      ed.setPosition(newPos);
      ed.focus();
    }
  });
}

function insertPrefix(prefix: string) {
  performEdit((ed) => {
    const sel = ed.getSelection()!;
    const startLine = ed.getModel()!.getLineContent(sel.startLineNumber);
    const newContent = prefix + startLine;
    const range = new monaco.Range(sel.startLineNumber, 1, sel.startLineNumber, startLine.length + 1);
    ed.executeEdits('user', [{ range, text: newContent }]);
    const col = prefix.length + (sel.startColumn - 1);
    ed.setPosition({ lineNumber: sel.startLineNumber, column: Math.max(col, prefix.length + 1) });
    ed.focus();
  });
}

function wrapSelection(before: string, after: string) {
  performEdit((ed) => {
    const sel = ed.getSelection()!;
    const model = ed.getModel()!;
    const selected = model.getValueInRange(sel);
    const text = before + (selected || 'text') + after;
    const range = new monaco.Range(sel.startLineNumber, sel.startColumn, sel.endLineNumber, sel.endColumn);
    ed.executeEdits('user', [{ range, text }]);
    const newStart = { lineNumber: sel.startLineNumber, column: sel.startColumn };
    const newEnd = ed.getModel()!.getPositionAt(
      model.getOffsetAt(newStart) + before.length + (selected || 'text').length
    );
    ed.setSelection(new monaco.Selection(newStart.lineNumber, newStart.column, newEnd.lineNumber, newEnd.column));
    ed.focus();
  });
}

function clearFormatting() {
  performEdit((ed) => {
    const sel = ed.getSelection()!;
    const model = ed.getModel()!;
    if (sel.isEmpty()) return;
    let selected = model.getValueInRange(sel);
    selected = selected
      .replace(/\*{1,2}(.+?)\*{1,2}/g, '$1')
      .replace(/_{1,2}(.+?)_{1,2}/g, '$1')
      .replace(/`{1,3}(.+?)`{1,3}/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/==(.+?)==/g, '$1')
      .replace(/\[(.+?)\]\(.*?\)/g, '$1')
      .replace(/<\/?[^>]+(>|$)/g, '');
    const range = new monaco.Range(sel.startLineNumber, sel.startColumn, sel.endLineNumber, sel.endColumn);
    ed.executeEdits('user', [{ range, text: selected }]);
    ed.focus();
  });
}

function deleteLine() {
  performEdit((ed) => {
    const pos = ed.getPosition()!;
    const model = ed.getModel()!;
    const lineCount = model.getLineCount();
    const range = new monaco.Range(pos.lineNumber, 1, pos.lineNumber, model.getLineMaxColumn(pos.lineNumber));
    let text = '';
    if (pos.lineNumber < lineCount) {
      text = '\n';
    }
    ed.executeEdits('user', [{ range, text }]);
    ed.focus();
  });
}

function insertTable() {
  performEdit((ed) => {
    const cols = prompt('列数:', '3');
    const rows = prompt('行数:', '3');
    if (!cols || !rows) return;
    const c = parseInt(cols);
    const r = parseInt(rows);
    if (c < 1 || r < 1) return;
    const header = '| ' + Array.from({ length: c }, () => '标题').join(' | ') + ' |\n';
    const divider = '| ' + Array.from({ length: c }, () => '---').join(' | ') + ' |\n';
    const body = Array.from({ length: r - 1 }, () =>
      '| ' + Array.from({ length: c }, () => '').join(' | ') + ' |'
    ).join('\n');
    const text = header + divider + body;
    const pos = ed.getPosition()!;
    const range = new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
    ed.executeEdits('user', [{ range, text, forceMoveMarkers: true }]);
    ed.focus();
  });
}

function headingUp() {
  performEdit((ed) => {
    const pos = ed.getPosition()!;
    const model = ed.getModel()!;
    const line = model.getLineContent(pos.lineNumber);
    const m = line.match(/^(#{1,6})\s/);
    if (m) {
      const cur = m[1].length;
      if (cur > 1) {
        const newPrefix = '#'.repeat(cur - 1) + ' ';
        const newLine = newPrefix + line.slice(m[0].length);
        ed.executeEdits('user', [{ range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, line.length + 1), text: newLine }]);
      } else {
        const newLine = line.slice(m[0].length);
        ed.executeEdits('user', [{ range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, line.length + 1), text: newLine }]);
      }
    } else {
      ed.executeEdits('user', [{ range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1), text: '# ', forceMoveMarkers: true }]);
    }
    ed.focus();
  });
}

function headingDown() {
  performEdit((ed) => {
    const pos = ed.getPosition()!;
    const model = ed.getModel()!;
    const line = model.getLineContent(pos.lineNumber);
    const m = line.match(/^(#{1,6})\s/);
    if (m) {
      const cur = m[1].length;
      if (cur < 6) {
        const newPrefix = '#'.repeat(cur + 1) + ' ';
        const newLine = newPrefix + line.slice(m[0].length);
        ed.executeEdits('user', [{ range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, line.length + 1), text: newLine }]);
      }
    } else {
      ed.executeEdits('user', [{ range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, 1), text: '## ', forceMoveMarkers: true }]);
    }
    ed.focus();
  });
}

async function copyPlainText() {
  const ed = getActiveMonaco();
  if (ed) {
    const sel = ed.getSelection();
    if (sel && !sel.isEmpty()) {
      const text = ed.getModel()!.getValueInRange(sel);
      await navigator.clipboard.writeText(text);
    } else {
      await navigator.clipboard.writeText(editor_store.source);
    }
  }
}

async function printDocument() {
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>打印</title>
<style>body { max-width: 210mm; margin: 0 auto; padding: 15mm; font-family: system-ui, sans-serif; line-height: 1.6; }
@media print { body { margin: 0; padding: 0; } }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd; padding: 8px; }
pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; }
code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
blockquote { border-left: 4px solid #ddd; padding-left: 16px; color: #666; }
</style></head><body>${editor_store.rendered_html}</body></html>`;
  const win2 = window.open('', '_blank');
  if (win2) {
    win2.document.write(html);
    win2.document.close();
    win2.print();
  }
}

// ---- Hotkey system ----
const NATIVE_EDIT_KEYS = new Set(['Ctrl+KeyZ', 'Ctrl+KeyY', 'Ctrl+KeyC', 'Ctrl+KeyX', 'Ctrl+KeyV', 'Ctrl+KeyA', 'Ctrl+Shift+KeyZ']);

const HOTKEY_MAP: Record<string, string> = {
  'Ctrl+KeyN': 'file_new',
  'Ctrl+Shift+KeyN': 'file_new_window',
  'Ctrl+KeyO': 'file_open',
  'Ctrl+KeyP': 'file_quick_open',
  'Ctrl+KeyS': 'file_save',
  'Ctrl+Shift+KeyS': 'file_save_as',
  'Alt+Shift+KeyP': 'file_print',
  'Ctrl+Comma': 'file_preferences',
  'Ctrl+KeyZ': 'edit_undo',
  'Ctrl+KeyY': 'edit_redo',
  'Ctrl+KeyX': 'edit_cut',
  'Ctrl+KeyC': 'edit_copy',
  'Ctrl+KeyV': 'edit_paste',
  'Ctrl+Shift+KeyC': 'edit_copy_md',
  'Ctrl+Shift+KeyV': 'edit_paste_plain',
  'Ctrl+KeyA': 'edit_select_all',
  'Ctrl+Digit1': 'para_h1',
  'Ctrl+Digit2': 'para_h2',
  'Ctrl+Digit3': 'para_h3',
  'Ctrl+Digit4': 'para_h4',
  'Ctrl+Digit5': 'para_h5',
  'Ctrl+Digit6': 'para_h6',
  'Ctrl+Digit0': 'para_paragraph',
  'Ctrl+Equal': 'para_heading_up',
  'Ctrl+Minus': 'para_heading_down',
  'Ctrl+Shift+KeyM': 'para_math_block',
  'Ctrl+Shift+KeyK': 'para_code_block',
  'Ctrl+Shift+KeyQ': 'para_quote',
  'Ctrl+Shift+BracketLeft': 'para_olist',
  'Ctrl+Shift+BracketRight': 'para_ulist',
  'Ctrl+Shift+KeyX': 'para_task',
  'Ctrl+KeyB': 'fmt_bold',
  'Ctrl+KeyI': 'fmt_italic',
  'Ctrl+KeyU': 'fmt_underline',
  'Ctrl+Shift+Backquote': 'fmt_code',
  'Alt+KeyZ': 'edit_toggle_wrap',
  'Alt+Shift+Digit5': 'fmt_strikethrough',
  'Ctrl+KeyK': 'fmt_link',
  'Ctrl+Backslash': 'fmt_clear',
  'Ctrl+Shift+KeyL': 'view_sidebar',
  'Ctrl+KeyF': 'edit_find',
  'Ctrl+KeyH': 'edit_replace',
  'Ctrl+Shift+KeyF': 'view_search',
  'Ctrl+Alt+KeyP': 'view_split_mode',
};

function matchCombo(e: KeyboardEvent): string | null {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  const code = e.code;
  if (!code || code.startsWith('Control') || code.startsWith('Shift') || code.startsWith('Alt') || code.startsWith('Meta')) return null;
  parts.push(code);
  return parts.join('+');
}

function onKeyDown(e: KeyboardEvent) {
  const combo = matchCombo(e);
  if (!combo) return;
  const action = HOTKEY_MAP[combo];
  if (!action) return;

  const in_textarea = document.activeElement?.tagName === 'TEXTAREA';
  // Let native undo/redo/cut/copy/paste/select-all work in textarea
  if (in_textarea && NATIVE_EDIT_KEYS.has(combo) && !['edit_copy_md', 'edit_paste_plain'].includes(action)) return;

  e.preventDefault();
  e.stopPropagation();
  handleMenuAction(action);
}

onMounted(() => {
  applyPreferences(loadPreferences());
  const savedTheme = localStorage.getItem('metamark_theme') as 'light' | 'dark' | 'custom' | null;
  if (savedTheme) {
    theme_store.set_theme(savedTheme);
  }
  window.addEventListener('keydown', onKeyDown);
});
onUnmounted(() => window.removeEventListener('keydown', onKeyDown));
</script>

<style>
:root {
  font-family: Inter, 'Segoe UI', Avenir, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 400;
  color: #333;
  background-color: #fafafa;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  --editor-font-size: 14px;
  --editor-line-height: 1.6;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { height: 100%; overflow: hidden; }

/* === Custom theme (user-defined variables) === */
.theme-custom {
  color: var(--text-primary);
  background-color: var(--bg-primary);
}
.theme-custom button {
  background: var(--btn-bg, #303030);
  color: var(--text-primary, #e8e8e8);
  border: 1px solid var(--btn-border, #505050);
  border-radius: 4px;
  padding: 5px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.12s;
}
.theme-custom button:hover {
  background: var(--btn-hover, #3c3c3c);
  border-color: var(--accent, #4fc1ff);
}
.theme-custom .btn-primary {
  background: var(--btn-primary-bg, #0078d4);
  color: var(--btn-primary-text, #fff);
  border-color: var(--btn-primary-bg, #0078d4);
}
.theme-custom .btn-primary:hover {
  background: var(--btn-primary-hover, #1a8ad4);
}
.theme-custom input, .theme-custom textarea, .theme-custom select {
  background: var(--input-bg, #3c3c3c);
  color: var(--text-primary, #e8e8e8);
  border: 1px solid var(--border-color, #404040);
}
.theme-custom ::-webkit-scrollbar { width: 10px; height: 10px; }
.theme-custom ::-webkit-scrollbar-track { background: transparent; }
.theme-custom ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb, #424242); border-radius: 5px; }
.theme-custom ::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover, #555); }
.theme-custom ::selection { background: #264f78; color: #fff; }

/* === Dark theme (GitHub Dark + VSCode 2026 blend) === */
.theme-dark {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d2d;
  --border-color: #404040;
  --text-primary: #e8e8e8;
  --text-secondary: #b4b4b4;
  --text-muted: #808080;
  --accent: #4fc1ff;
  --accent-hover: #6fcbff;
  --sidebar-bg: #252526;
  --input-bg: #3c3c3c;
  --hover-bg: #2e2e2e;
  --active-bg: #37373d;
  --menu-bg: #2d2d2d;
  --danger: #f14c4c;
  --success: #3fb950;
  --warning: #d29922;
  --btn-bg: #303030;
  --btn-hover: #3c3c3c;
  --btn-border: #505050;
  --btn-primary-bg: #0078d4;
  --btn-primary-hover: #1a8ad4;
  --btn-primary-text: #fff;
  --scrollbar-bg: transparent;
  --scrollbar-thumb: #424242;
  --scrollbar-thumb-hover: #555;
  color: var(--text-primary);
  background-color: var(--bg-primary);
}

/* Scrollbar */
.theme-dark ::-webkit-scrollbar { width: 10px; height: 10px; }
.theme-dark ::-webkit-scrollbar-track { background: var(--scrollbar-bg); }
.theme-dark ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 5px; }
.theme-dark ::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }

/* Menu bar */
.theme-dark .menu-bar { background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); }
.theme-dark .menu-bar-label { color: var(--text-primary); font-size: 13px; }
.theme-dark .menu-bar-item:hover { background: var(--hover-bg); }
.theme-dark .menu-dropdown { background: var(--menu-bg); border: 1px solid var(--border-color); box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
.theme-dark .menu-item { color: var(--text-primary); font-size: 13px; }
.theme-dark .menu-item:hover { background: var(--accent); color: #fff; }
.theme-dark .menu-item--disabled { color: var(--text-muted); }
.theme-dark .menu-separator { border-top: 1px solid var(--border-color); }
.theme-dark .menu-item-shortcut { color: var(--text-muted); }
.theme-dark .menu-submenu { background: var(--menu-bg); border: 1px solid var(--border-color); box-shadow: 0 4px 16px rgba(0,0,0,0.5); }

/* Sidebar */
.theme-dark .sidebar { background: var(--sidebar-bg); border-right: 1px solid var(--border-color); }
.theme-dark .sidebar-tabs { border-bottom: 1px solid var(--border-color); }
.theme-dark .sidebar-tabs button { color: var(--text-muted); font-size: 12px; padding: 8px 4px; border: none; background: transparent; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; }
.theme-dark .sidebar-tabs button:hover { color: var(--text-primary); }
.theme-dark .sidebar-tabs button.active { color: var(--accent); border-bottom-color: var(--accent); }
.theme-dark .sidebar-content { background: var(--sidebar-bg); }

/* App main */
.theme-dark .app-main { background: var(--bg-primary); }

/* Editor tabs */
.theme-dark .editor-tabs { background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); }
.theme-dark .editor-tab { background: var(--bg-tertiary); color: var(--text-muted); border-right: 1px solid var(--border-color); padding: 7px 14px; font-size: 13px; cursor: pointer; }
.theme-dark .editor-tab:hover { background: var(--hover-bg); color: var(--text-primary); }
.theme-dark .editor-tab.active { background: var(--bg-primary); color: var(--text-primary); border-bottom: 2px solid var(--accent); }
.theme-dark .new-tab { color: var(--accent); font-size: 18px; }
.theme-dark .tab-close { color: var(--text-muted); font-size: 14px; }
.theme-dark .tab-close:hover { color: var(--danger); }

/* Editor area */
.theme-dark .editor-area { background: var(--bg-primary); }
.theme-dark .inline-view { background: var(--bg-primary); padding: 0 16px; }
.theme-dark .source-view { background: var(--bg-primary); }
.theme-dark .source-textarea { background: var(--bg-primary); color: var(--text-primary); border: none; outline: none; font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace; font-size: 14px; line-height: 1.6; }
.theme-dark .inline-preview { color: var(--text-primary); }
.theme-dark .inline-preview:hover { background: var(--hover-bg); }
.theme-dark .inline-edit-area { background: var(--input-bg); color: var(--text-primary); border: 1px solid var(--accent); border-radius: 3px; }
.theme-dark .split-source { background: var(--bg-primary); color: var(--text-primary); }
.theme-dark .split-preview { background: var(--bg-primary); color: var(--text-primary); }
.theme-dark .split-divider { background: var(--border-color); width: 4px; cursor: col-resize; }
.theme-dark .split-divider:hover, .theme-dark .split-divider--dragging { background: var(--accent); }

/* Status bar */
.theme-dark .status-bar { background: var(--accent); color: #fff; border-top: none; font-size: 12px; padding: 3px 12px; }

/* Dialogs */
.theme-dark .dialog-overlay { background: rgba(0,0,0,0.65); }
.theme-dark .dialog-panel { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); box-shadow: 0 8px 32px rgba(0,0,0,0.5); border-radius: 8px; }
.theme-dark .dialog-title { color: var(--text-primary); font-size: 16px; font-weight: 600; }
.theme-dark .dialog-label { color: var(--text-secondary); font-size: 13px; }
.theme-dark .dialog-input, .theme-dark .dialog-select, .theme-dark .dialog-textarea { background: var(--input-bg); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px; padding: 6px 10px; font-size: 13px; }
.theme-dark .dialog-input:focus, .theme-dark .dialog-select:focus { border-color: var(--accent); outline: none; }
.theme-dark .dialog-checkbox, .theme-dark .dialog-radio { accent-color: var(--accent); }
.theme-dark .checkbox-label { color: var(--text-primary); font-size: 13px; }

/* Buttons — comprehensive */
.theme-dark button {
  background: var(--btn-bg);
  color: var(--text-primary);
  border: 1px solid var(--btn-border);
  border-radius: 4px;
  padding: 5px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.12s;
}
.theme-dark button:hover {
  background: var(--btn-hover);
  border-color: var(--accent);
  color: var(--text-primary);
}
.theme-dark button:active {
  background: var(--active-bg);
}
.theme-dark button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.theme-dark .btn-primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border-color: var(--btn-primary-bg);
  font-weight: 500;
}
.theme-dark .btn-primary:hover {
  background: var(--btn-primary-hover);
  border-color: var(--btn-primary-hover);
  color: #fff;
}
.theme-dark .btn-secondary {
  background: var(--btn-bg);
  color: var(--text-primary);
  border-color: var(--btn-border);
}
.theme-dark .btn-secondary:hover {
  background: var(--btn-hover);
  border-color: var(--accent);
}
.theme-dark .btn-danger {
  background: transparent;
  color: var(--danger);
  border-color: var(--danger);
}
.theme-dark .btn-danger:hover {
  background: var(--danger);
  color: #fff;
}
.theme-dark .btn-ghost {
  background: transparent;
  border: none;
  color: var(--text-secondary);
}
.theme-dark .btn-ghost:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}
.theme-dark .pref-btn {
  background: var(--btn-bg);
  color: var(--text-primary);
  border: 1px solid var(--btn-border);
  border-radius: 4px;
  padding: 5px 12px;
  font-size: 12px;
}
.theme-dark .pref-btn:hover {
  background: var(--btn-hover);
  border-color: var(--accent);
}

/* Inputs */
.theme-dark input[type="text"],
.theme-dark input[type="number"],
.theme-dark input[type="search"],
.theme-dark textarea,
.theme-dark select {
  background: var(--input-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 13px;
}
.theme-dark input:focus, .theme-dark textarea:focus, .theme-dark select:focus {
  border-color: var(--accent);
  outline: none;
}
.theme-dark input::placeholder, .theme-dark textarea::placeholder {
  color: var(--text-muted);
}

/* Quick open */
.theme-dark .quick-open-overlay { background: rgba(0,0,0,0.6); }
.theme-dark .quick-open-panel { background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; box-shadow: 0 8px 40px rgba(0,0,0,0.4); }
.theme-dark .quick-open-input { background: var(--input-bg); color: var(--text-primary); border: none; border-bottom: 1px solid var(--border-color); }
.theme-dark .quick-open-item { color: var(--text-primary); font-size: 13px; }
.theme-dark .quick-open-item:hover { background: var(--hover-bg); }
.theme-dark .quick-open-item.active { background: var(--accent); color: #fff; }
.theme-dark .quick-open-path { color: var(--text-muted); font-size: 11px; }
.theme-dark .quick-open-empty { color: var(--text-muted); }

/* File tree */
.theme-dark .file-tree { background: var(--sidebar-bg); }
.theme-dark .tree-btn { background: var(--btn-bg); color: var(--text-primary); border: 1px solid var(--btn-border); }
.theme-dark .tree-btn:hover { background: var(--btn-hover); border-color: var(--accent); }
.theme-dark .tree-empty { color: var(--text-muted); }
.theme-dark .tree-item { color: var(--text-primary); font-size: 13px; }
.theme-dark .tree-item:hover { background: var(--hover-bg); }
.theme-dark .tree-item--active { background: var(--active-bg); color: var(--accent); font-weight: 500; }
.theme-dark .tree-name { color: var(--text-primary); }
.theme-dark .tree-icon { color: var(--text-muted); }

/* Outline */
.theme-dark .outline-panel { background: var(--sidebar-bg); }
.theme-dark .panel-title { color: var(--text-secondary); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.theme-dark .panel-empty { color: var(--text-muted); font-size: 13px; }
.theme-dark .outline-item { color: var(--text-primary); font-size: 13px; padding: 4px 12px; }
.theme-dark .outline-item:hover { background: var(--hover-bg); }
.theme-dark .outline-level { color: var(--text-muted); font-size: 11px; }
.theme-dark .outline-text { color: var(--text-primary); }

/* Search */
.theme-dark .search-panel { background: var(--sidebar-bg); }
.theme-dark .search-input { background: var(--input-bg); color: var(--text-primary); border: 1px solid var(--border-color); }
.theme-dark .search-options label { color: var(--text-secondary); font-size: 12px; }
.theme-dark .search-info { color: var(--text-secondary); font-size: 12px; }
.theme-dark .search-match { color: var(--text-primary); }
.theme-dark .search-match:hover { background: var(--hover-bg); }
.theme-dark .search-match--active { background: var(--active-bg); }
.theme-dark .match-line { color: var(--text-muted); }
.theme-dark .match-preview { color: var(--text-primary); }

/* About */
.theme-dark .about-panel { background: var(--bg-secondary); color: var(--text-primary); }
.theme-dark .about-version { color: var(--text-secondary); }
.theme-dark .about-desc { color: var(--text-primary); }
.theme-dark .about-tech { color: var(--text-muted); }
.theme-dark .about-copy { color: var(--text-muted); }

/* Preferences */
.theme-dark .pref-section label { color: var(--text-secondary); font-size: 13px; }
.theme-dark .pref-nav-item { color: var(--text-primary); }
.theme-dark .pref-nav-item.active { background: var(--active-bg); color: var(--accent); }
.theme-dark .pref-select { background: var(--input-bg); color: var(--text-primary); border: 1px solid var(--border-color); }
.theme-dark .pref-input { background: var(--input-bg); color: var(--text-primary); border: 1px solid var(--border-color); }
.theme-dark .pref-textarea { background: var(--input-bg); color: var(--text-primary); border: 1px solid var(--border-color); }
.theme-dark .pref-hint { color: var(--text-muted); }
.theme-dark .indent-preview { background: var(--input-bg); border-color: var(--border-color); }
.theme-dark .indent-preview pre { color: var(--text-muted); }

/* Generic */
.theme-dark a { color: var(--accent); }
.theme-dark a:hover { color: var(--accent-hover); }
.theme-dark ::selection { background: #264f78; color: #fff; }

/* Status bar content */
.theme-dark .status-bar { background: var(--accent); color: #fff; border-top: none; }

/* Markdown alerts (container plugin) */
.markdown-alert { padding: 12px 16px; margin: 8px 0; border-radius: 4px; border-left: 4px solid; }
.markdown-alert-note { background: #ddf4ff; border-color: #0969da; }
.markdown-alert-tip { background: #dafbe1; border-color: #1a7f37; }
.markdown-alert-warning { background: #fff8c5; border-color: #9a6700; }
.markdown-alert-danger { background: #ffebe9; border-color: #cf222e; }
.markdown-alert-title { font-weight: 600; margin-bottom: 4px; }
.theme-dark .markdown-alert-note { background: #0c2d4b; border-color: #58a6ff; }
.theme-dark .markdown-alert-tip { background: #0d3a1e; border-color: #3fb950; }
.theme-dark .markdown-alert-warning { background: #3d2e00; border-color: #d29922; }
.theme-dark .markdown-alert-danger { background: #3d1114; border-color: #f85149; }

/* GitHub-style alerts */
.gh-alert { margin: 8px 0; }
.gh-alert p { margin: 0; }
.gh-alert-title { font-weight: 600; }

/* Mermaid */
.mermaid { text-align: center; margin: 16px 0; padding: 12px; background: #f9f9f9; border-radius: 4px; }
.theme-dark .mermaid { background: #1e1e1e; filter: invert(0.9) hue-rotate(180deg); }

/* TOC */
.toc { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 4px; padding: 12px 16px; margin: 8px 0; }
.toc-title { font-weight: 600; margin-bottom: 8px; font-size: 15px; }
.toc-list { list-style: none; padding: 0; margin: 0; }
.toc-item a { color: #0969da; text-decoration: none; font-size: 13px; line-height: 1.8; }
.toc-item a:hover { text-decoration: underline; }
.theme-dark .toc { background: #161b22; border-color: #30363d; }
.theme-dark .toc-item a { color: #58a6ff; }

/* Footnotes */
.footnotes { margin-top: 24px; padding-top: 12px; border-top: 1px solid #d0d7de; font-size: 13px; color: #57606a; }
.footnotes-sep { display: none; }
.footnote-ref { font-size: 12px; }
.footnote-backref { font-size: 12px; margin-left: 4px; text-decoration: none; }
.theme-dark .footnotes { border-top-color: #30363d; color: #8b949e; }

/* Light theme highlight.js overrides */
.source-highlight code { color: #333; }
.hljs { background: transparent !important; color: #333 !important; }
.hljs-section { color: #800 !important; }
.hljs-link { color: #800 !important; }
.hljs-title { color: #900 !important; font-weight: bold !important; }
.hljs-strong { font-weight: bold !important; }
.hljs-emphasis { font-style: italic !important; }
.hljs-bullet { color: #080 !important; }
.hljs-quote { color: #080 !important; }
.hljs-code { color: #00f !important; }
.hljs-meta { color: #00f !important; }
.hljs-string { color: #b84 !important; }
.hljs-literal { color: #b84 !important; }
.hljs-deletion { color: #d44 !important; }
.hljs-addition { color: #484 !important; }

.theme-dark .source-highlight code { color: #d4d4d4; }
.theme-dark .hljs { background: transparent !important; color: #d4d4d4 !important; }
.theme-dark .hljs-section { color: #ffc66d !important; }
.theme-dark .hljs-link { color: #ffc66d !important; }
.theme-dark .hljs-title { color: #ffc66d !important; font-weight: bold !important; }
.theme-dark .hljs-strong { font-weight: bold !important; }
.theme-dark .hljs-emphasis { font-style: italic !important; }
.theme-dark .hljs-bullet { color: #6a9955 !important; }
.theme-dark .hljs-quote { color: #6a9955 !important; }
.theme-dark .hljs-code { color: #569cd6 !important; }
.theme-dark .hljs-meta { color: #569cd6 !important; }
.theme-dark .hljs-string { color: #ce9178 !important; }
.theme-dark .hljs-literal { color: #ce9178 !important; }
.theme-dark .hljs-deletion { color: #f44747 !important; }
.theme-dark .hljs-addition { color: #4ec9b0 !important; }

/* Full dark theme coverage */
.theme-dark, .theme-dark .app, .theme-dark #app { background: var(--bg-primary); color: var(--text-primary); }
.theme-dark .sidebar { background: var(--sidebar-bg); border-right-color: var(--border-color); }
.theme-dark .sidebar-tabs { border-bottom-color: var(--border-color); }
.theme-dark .sidebar-tabs button { color: var(--text-secondary); }
.theme-dark .sidebar-tabs button:hover { color: var(--text-primary); }
.theme-dark .sidebar-tabs button.active { color: var(--accent); border-bottom-color: var(--accent); }
.theme-dark .sidebar-content { background: var(--sidebar-bg); }
.theme-dark .app-main { background: var(--bg-primary); }
.theme-dark .editor-tabs { background: var(--bg-secondary); border-bottom-color: var(--border-color); }
.theme-dark .editor-tab { background: var(--bg-tertiary); color: var(--text-secondary); border-right-color: var(--border-color); }
.theme-dark .editor-tab:hover { background: var(--hover-bg); }
.theme-dark .editor-tab.active { background: var(--bg-primary); color: var(--text-primary); }
.theme-dark .new-tab { color: var(--accent); }
.theme-dark .tab-close { color: var(--text-muted); }
.theme-dark .tab-close:hover { color: var(--danger); }
.theme-dark .editor-area { background: var(--bg-primary); }
.theme-dark .inline-view { background: var(--bg-primary); }
.theme-dark .source-view { background: var(--bg-primary); }
.theme-dark .source-textarea { background: var(--bg-primary); color: var(--text-primary); }
.theme-dark .inline-preview:hover { background: var(--hover-bg); }
.theme-dark .inline-edit-area { background: var(--input-bg); color: var(--text-primary); border-color: var(--accent); }
.theme-dark .split-source, .theme-dark .split-preview { background: var(--bg-primary); color: var(--text-primary); }
.theme-dark .split-divider { background: var(--border-color); }
.theme-dark .split-divider:hover, .theme-dark .split-divider--dragging { background: var(--accent); }
.theme-dark .status-bar { background: var(--accent); color: #fff; border-top: none; }
.theme-dark .dialog-overlay { background: rgba(0,0,0,0.6); }
.theme-dark .dialog-panel { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); }
.theme-dark .dialog-title { color: var(--text-primary); }
.theme-dark .dialog-label { color: var(--text-secondary); }
.theme-dark .dialog-input, .theme-dark .dialog-select { background: var(--input-bg); color: var(--text-primary); border-color: var(--border-color); }
.theme-dark .dialog-input:focus { border-color: var(--accent); }
.theme-dark .checkbox-label { color: var(--text-primary); }
.theme-dark button:not(.sidebar-tabs button):not(.btn-primary) { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); }
.theme-dark button:not(.sidebar-tabs button):not(.btn-primary):hover { background: var(--hover-bg); }
.theme-dark .btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.theme-dark .btn-primary:hover { background: var(--accent-hover); }
.theme-dark .btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); border-color: var(--border-color); }
.theme-dark .btn-secondary:hover { background: var(--hover-bg); }
.theme-dark .btn-preset { background: var(--bg-tertiary); color: var(--text-primary); border-color: var(--border-color); }
.theme-dark .btn-preset:hover { background: var(--hover-bg); }
.theme-dark input, .theme-dark textarea, .theme-dark select { background: var(--input-bg); color: var(--text-primary); border-color: var(--border-color); }
.theme-dark a { color: var(--accent); }
.theme-dark ::selection { background: #264f78; }
.theme-dark .quick-open-overlay { background: rgba(0,0,0,0.5); }
.theme-dark .quick-open-panel { background: var(--bg-tertiary); border: 1px solid var(--border-color); }
.theme-dark .quick-open-input { background: var(--input-bg); color: var(--text-primary); border-bottom-color: var(--border-color); }
.theme-dark .quick-open-item { color: var(--text-primary); }
.theme-dark .quick-open-item:hover { background: var(--hover-bg); }
.theme-dark .quick-open-item.active { background: var(--accent); color: #fff; }
.theme-dark .quick-open-path { color: var(--text-muted); }
.theme-dark .quick-open-empty { color: var(--text-muted); }
.theme-dark .file-tree { background: var(--sidebar-bg); }
.theme-dark .tree-btn { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); }
.theme-dark .tree-btn:hover { background: var(--hover-bg); }
.theme-dark .tree-empty { color: var(--text-muted); }
.theme-dark .tree-item { color: var(--text-primary); }
.theme-dark .tree-item:hover { background: var(--hover-bg); }
.theme-dark .tree-item--active { background: var(--active-bg); color: var(--accent); }
.theme-dark .tree-name { color: var(--text-primary); }
.theme-dark .outline-panel { background: var(--sidebar-bg); }
.theme-dark .panel-title { color: var(--text-secondary); }
.theme-dark .panel-empty { color: var(--text-muted); }
.theme-dark .outline-item { color: var(--text-primary); }
.theme-dark .outline-item:hover { background: var(--hover-bg); }
.theme-dark .outline-level { color: var(--text-muted); }
.theme-dark .outline-text { color: var(--text-primary); }
.theme-dark .search-panel { background: var(--sidebar-bg); }
.theme-dark .search-input { background: var(--input-bg); color: var(--text-primary); border: 1px solid var(--border-color); }
.theme-dark .search-options label { color: var(--text-secondary); }
.theme-dark .search-info { color: var(--text-secondary); }
.theme-dark .search-match { color: var(--text-primary); }
.theme-dark .search-match:hover { background: var(--hover-bg); }
.theme-dark .search-match--active { background: var(--active-bg); }
.theme-dark .match-line { color: var(--text-muted); }
.theme-dark .match-preview { color: var(--text-primary); }
.theme-dark .about-panel { background: var(--bg-secondary); color: var(--text-primary); }
.theme-dark .about-version { color: var(--text-secondary); }
.theme-dark .about-desc { color: var(--text-primary); }
.theme-dark .about-tech { color: var(--text-muted); }
.theme-dark .about-copy { color: var(--text-muted); }
.theme-dark .pref-section label { color: var(--text-secondary); }
</style>

<style scoped>
.app { display: flex; flex-direction: column; height: 100vh; background: #fafafa; }
.app-body { display: flex; flex: 1; overflow: hidden; }

.sidebar { width: 260px; background: #f0f0f0; border-right: 1px solid #d0d0d0; display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-tabs { display: flex; border-bottom: 1px solid #d0d0d0; flex-shrink: 0; }
.sidebar-tabs button { flex: 1; padding: 6px 4px; border: none; background: transparent; font-size: 12px; color: #888; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; }
.sidebar-tabs button:hover { color: #333; }
.sidebar-tabs button.active { color: #1976d2; border-bottom-color: #1976d2; }
.sidebar-content { flex: 1; overflow-y: auto; }
.app-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.editor-tabs { display: flex; background: #f5f5f5; border-bottom: 1px solid #d0d0d0; flex-shrink: 0; overflow-x: auto; }
.editor-tab { display: flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; color: #666; cursor: pointer; border-right: 1px solid #d0d0d0; user-select: none; white-space: nowrap; }
.editor-tab:hover { background: #e8e8e8; }
.editor-tab.active { background: #fff; color: #333; border-bottom: 2px solid #1976d2; }
.new-tab { font-size: 18px; font-weight: bold; padding: 2px 12px; color: #1976d2; }
.tab-close { font-size: 14px; color: #999; line-height: 1; }
.tab-close:hover { color: #e53935; }

/* Quick Open */
.quick-open-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 3000; display: flex; justify-content: center; padding-top: 80px; }
.quick-open-panel { width: 500px; max-height: 400px; background: #fff; border-radius: 6px; box-shadow: 0 8px 40px rgba(0,0,0,0.15); display: flex; flex-direction: column; overflow: hidden; }
.quick-open-input { width: 100%; padding: 12px 16px; font-size: 14px; border: none; border-bottom: 1px solid #e0e0e0; outline: none; }
.quick-open-list { flex: 1; overflow-y: auto; padding: 4px 0; }
.quick-open-item { padding: 8px 16px; cursor: pointer; font-size: 13px; display: flex; flex-direction: column; }
.quick-open-item:hover, .quick-open-item.active { background: #e8f0fe; }
.quick-open-path { font-size: 11px; color: #999; margin-top: 2px; }
.quick-open-empty { padding: 24px; text-align: center; color: #999; font-size: 13px; }
</style>
