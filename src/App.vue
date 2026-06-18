<template>
  <div class="app" :class="`theme-${theme_store.theme}`">
    <TopMenuBar @menu-action="handleMenuAction" />
    <div class="app-body" :class="{ 'sidebar-open': editor_store.show_sidebar }">
      <aside v-if="editor_store.show_sidebar" class="sidebar">
        <div class="sidebar-section">
          <h3>文件</h3>
          <div class="sidebar-file-list">
            <div class="sidebar-empty">暂无打开的文件</div>
          </div>
        </div>
      </aside>
      <main class="app-main">
        <EditorArea />
      </main>
    </div>
    <StatusBar />
    <PageSettingsDialog />
  </div>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { useEditorStore } from './store/editor-store';
import { usePageStore } from './store/page-store';
import { useThemeStore } from './store/theme-store';
import TopMenuBar from './components/top-menu-bar.vue';
import EditorArea from './components/editor-area.vue';
import StatusBar from './components/status-bar.vue';
import PageSettingsDialog from './components/page-settings-dialog.vue';

const editor_store = useEditorStore();
const page_store = usePageStore();
const theme_store = useThemeStore();

// Set default content
editor_store.set_source(`# 欢迎使用 MetaMark

## 所见即所得 Markdown 编辑器

支持 **LaTeX** 行内公式 $E=mc^2$ 和块级公式：

$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

### 功能特性

- 原位实时编辑（双击渲染内容修改）
- 分页双栏同步编辑
- 纯源码模式
- Word 级纸面分页排版
- 多格式导出（PDF / HTML / Word）

\`\`\`python
def hello():
    print("Hello, MetaMark!")
\`\`\`

> Markdown 让写作更专注。
`);

function handleMenuAction(action: string) {
  switch (action) {
    case 'file_new':
      editor_store.set_source('');
      editor_store.current_file = null;
      editor_store.mark_clean();
      break;
    case 'file_save':
      // TODO: invoke Tauri save
      editor_store.mark_clean();
      break;
    case 'file_export_pdf':
    case 'file_export_html':
    case 'file_export_word':
      invoke('export_document', { content: editor_store.source, format: action.split('_').pop() });
      break;
    case 'view_split_mode':
      editor_store.set_mode(editor_store.mode === 'split' ? 'inline' : 'split');
      break;
    case 'view_source_mode':
      editor_store.set_mode(editor_store.mode === 'source' ? 'inline' : 'source');
      break;
    case 'view_sidebar':
      editor_store.show_sidebar = !editor_store.show_sidebar;
      break;
    case 'view_focus':
      editor_store.focus_mode = !editor_store.focus_mode;
      break;
    case 'view_typewriter':
      editor_store.typewriter_mode = !editor_store.typewriter_mode;
      break;
    case 'view_status_bar':
      editor_store.show_status_bar = !editor_store.show_status_bar;
      break;
    case 'page_size':
    case 'page_margins':
      page_store.show_settings = true;
      break;
    case 'page_toggle_break':
      page_store.toggle_page_break();
      break;
    case 'page_single':
      page_store.config.double_page = false;
      break;
    case 'page_double':
      page_store.config.double_page = true;
      break;
    case 'page_reset':
      page_store.reset_config();
      break;
    case 'theme_light':
      theme_store.set_theme('light');
      break;
    case 'theme_dark':
      theme_store.set_theme('dark');
      break;
    case 'view_fullscreen':
      invoke('tauri', { cmd: 'toggleFullscreen' }).catch(() => {});
      break;
    case 'view_zoom_in':
      editor_store.zoom = Math.min(200, editor_store.zoom + 10);
      break;
    case 'view_zoom_out':
      editor_store.zoom = Math.max(50, editor_store.zoom - 10);
      break;
    case 'view_actual_size':
      editor_store.zoom = 100;
      break;
  }
}
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
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  overflow: hidden;
}

.theme-dark {
  color: #e0e0e0;
  background-color: #1e1e1e;
}

.theme-dark .menu-bar { background: #2d2d2d; border-bottom-color: #404040; }
.theme-dark .menu-bar-label { color: #e0e0e0; }
.theme-dark .menu-dropdown { background: #2d2d2d; border-color: #404040; }
.theme-dark .status-bar { background: #2d2d2d; border-top-color: #404040; color: #999; }
.theme-dark .split-source, .theme-dark .split-preview { background: #1e1e1e; color: #e0e0e0; }
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fafafa;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  background: #f0f0f0;
  border-right: 1px solid #d0d0d0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
}

.sidebar-section {
  padding: 8px;
}

.sidebar-section h3 {
  font-size: 11px;
  text-transform: uppercase;
  color: #888;
  padding: 4px 8px;
  letter-spacing: 0.5px;
}

.sidebar-empty {
  font-size: 13px;
  color: #aaa;
  padding: 16px 8px;
  text-align: center;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
