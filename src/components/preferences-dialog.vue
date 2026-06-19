<template>
  <div v-if="visible" class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-panel">
      <div class="dialog-header">
        <h3 class="dialog-title">偏好设置</h3>
        <button class="dialog-close" @click="$emit('close')">×</button>
      </div>

      <div class="pref-search">
        <input v-model="searchQuery" placeholder="搜索设置..." class="pref-search-input" />
      </div>

      <div class="pref-body">
        <aside class="pref-sidebar">
          <button
            v-for="cat in categories"
            :key="cat.key"
            class="pref-nav-item"
            :class="{ active: activeCategory === cat.key }"
            @click="activeCategory = cat.key"
          >
            <span class="pref-nav-icon">{{ cat.icon }}</span>
            {{ cat.label }}
          </button>
        </aside>
        <section class="pref-content">
          <!-- 编辑器 -->
          <div v-if="activeCategory === 'editor'" class="pref-scroll">
            <div class="pref-section">
              <label class="pref-label">默认缩进</label>
              <div class="pref-row">
                <select v-model="editor.defaultIndent" class="pref-select" @change="saveSettings">
                  <option value="2">2 空格</option>
                  <option value="4">4 空格</option>
                </select>
                <div class="indent-preview">
                  <pre v-for="n in 3" :key="n" :class="{ 'indent-4': editor.defaultIndent === '4', 'indent-2': editor.defaultIndent === '2' }">{{ ' '.repeat(Number(editor.defaultIndent) * n) }}{ '.' + n }}</pre>
                </div>
              </div>
            </div>
            <div class="pref-section">
              <label class="checkbox-label">
                <input type="checkbox" v-model="editor.matchBrackets" @change="saveSettings" class="dialog-checkbox" />
                自动匹配括号/引号
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="editor.matchMDChars" @change="saveSettings" class="dialog-checkbox" />
                自动匹配 Markdown 符号
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="editor.showBlockSource" @change="saveSettings" class="dialog-checkbox" />
                显示当前块的 Markdown 源码
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="editor.copyPlainWithSource" @change="saveSettings" class="dialog-checkbox" />
                复制纯文本时附带 Markdown 源码
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="editor.copyWholeLine" @change="saveSettings" class="dialog-checkbox" />
                未选择时复制整行
              </label>
            </div>
            <div class="pref-section">
              <label class="pref-label">换行符</label>
              <div class="pref-radio-group">
                <label class="radio-label">
                  <input type="radio" v-model="editor.lineEnding" value="LF" @change="saveSettings" class="dialog-radio" /> LF
                </label>
                <label class="radio-label">
                  <input type="radio" v-model="editor.lineEnding" value="CRLF" @change="saveSettings" class="dialog-radio" /> CRLF
                </label>
              </div>
            </div>
            <div class="pref-section">
              <label class="pref-label">拼写检查语言</label>
              <select v-model="editor.spellCheck" class="pref-select" @change="saveSettings">
                <option value="auto">自动检测</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          <!-- 图像 -->
          <div v-if="activeCategory === 'image'" class="pref-scroll">
            <div class="pref-section">
              <label class="pref-label">插入图片时</label>
              <select v-model="image.insertAction" class="pref-select" @change="saveSettings">
                <option value="upload">上传图片</option>
                <option value="copy">复制到素材文件夹</option>
                <option value="link">使用原路径链接</option>
                <option value="none">不处理</option>
              </select>
            </div>
            <div class="pref-section">
              <label class="checkbox-label">
                <input type="checkbox" v-model="image.applyLocalRules" @change="saveSettings" class="dialog-checkbox" />
                对本地图片应用上述规则
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="image.applyNetworkRules" @change="saveSettings" class="dialog-checkbox" />
                对网络图片应用上述规则
              </label>
            </div>
            <div class="pref-section">
              <label class="pref-label">图片语法偏好</label>
              <div class="pref-radio-group vertical">
                <label class="radio-label">
                  <input type="radio" v-model="image.imageSyntax" value="relative" @change="saveSettings" class="dialog-radio" />
                  相对路径: <code>![](image.png)</code>
                </label>
                <label class="radio-label">
                  <input type="radio" v-model="image.imageSyntax" value="relative-with-dot" @change="saveSettings" class="dialog-radio" />
                  带 ./ 的相对路径: <code>![](./image.png)</code>
                </label>
                <label class="radio-label">
                  <input type="radio" v-model="image.imageSyntax" value="url-encoded" @change="saveSettings" class="dialog-radio" />
                  自动 URL 编码
                </label>
              </div>
            </div>
          </div>

          <!-- Markdown -->
          <div v-if="activeCategory === 'markdown'" class="pref-scroll">
            <div class="pref-section">
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.strictMode" @change="saveSettings" class="dialog-checkbox" />
                严格模式
              </label>
            </div>
            <div class="pref-section">
              <label class="pref-label">标题样式</label>
              <select v-model="md.headingStyle" class="pref-select" @change="saveSettings">
                <option value="atx">ATX (# ##)</option>
                <option value="setext">Setext (=== ---)</option>
              </select>
            </div>
            <div class="pref-section">
              <label class="pref-label">列表样式</label>
              <select v-model="md.listStyle" class="pref-select" @change="saveSettings">
                <option value="dash-star-plus">- / * / +</option>
                <option value="numbered-dot">1. / 2.</option>
                <option value="numbered-paren">1) / 2)</option>
              </select>
            </div>
            <div class="pref-section">
              <label class="pref-label">扩展语法</label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.extAutoLink" @change="saveSettings" class="dialog-checkbox" />
                自动链接识别
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.extInlineLatex" @change="saveSettings" class="dialog-checkbox" />
                行内 LaTeX ($...$)
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.extMathBlock" @change="saveSettings" class="dialog-checkbox" />
                数学块 ($$...$$)
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.extSubscript" @change="saveSettings" class="dialog-checkbox" />
                下标 (~...~)
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.extSuperscript" @change="saveSettings" class="dialog-checkbox" />
                上标 (^...^)
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.extHighlight" @change="saveSettings" class="dialog-checkbox" />
                高亮 (==...==)
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.extGithubAlerts" @change="saveSettings" class="dialog-checkbox" />
                GitHub 警告 (Github alerts)
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.extMermaid" @change="saveSettings" class="dialog-checkbox" />
                Mermaid 图表
              </label>
            </div>
            <div class="pref-section">
              <label class="pref-label">智能标点</label>
              <select v-model="md.smartPunctuation" class="pref-select" @change="saveSettings">
                <option value="none">不转换</option>
                <option value="all">全部转换</option>
                <option value="quotes">仅引号</option>
                <option value="dashes">仅破折号</option>
              </select>
            </div>
            <div class="pref-section">
              <label class="pref-label">代码设置</label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.codeShowLineNumbers" @change="saveSettings" class="dialog-checkbox" />
                显示行号
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.codeWordWrap" @change="saveSettings" class="dialog-checkbox" />
                自动换行
              </label>
              <div class="pref-row">
                <label class="pref-label sm">缩进大小</label>
                <select v-model="md.codeIndentSize" class="pref-select" @change="saveSettings">
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="8">8</option>
                </select>
              </div>
              <div class="pref-row">
                <label class="pref-label sm">默认语言</label>
                <select v-model="md.codeDefaultLang" class="pref-select" @change="saveSettings">
                  <option value="">无</option>
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="rust">Rust</option>
                  <option value="java">Java</option>
                  <option value="c">C</option>
                  <option value="cpp">C++</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="sql">SQL</option>
                  <option value="bash">Bash</option>
                </select>
              </div>
            </div>
            <div class="pref-section">
              <label class="pref-label">公式</label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.formulaPhysics" @change="saveSettings" class="dialog-checkbox" />
                启用物理包 (physics)
              </label>
              <div class="pref-row">
                <label class="pref-label sm">自动编号</label>
                <select v-model="md.formulaAutoNumbering" class="pref-select" @change="saveSettings">
                  <option value="none">不编号</option>
                  <option value="section">按章节编号</option>
                  <option value="global">全局编号</option>
                </select>
              </div>
            </div>
            <div class="pref-section">
              <label class="pref-label">空格与换行</label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.firstLineIndent" @change="saveSettings" class="dialog-checkbox" />
                首行缩进
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="md.showBr" @change="saveSettings" class="dialog-checkbox" />
                显示 &lt;br/&gt; 标记
              </label>
            </div>
          </div>

          <!-- 导出 -->
          <div v-if="activeCategory === 'export'" class="pref-scroll">
            <div class="pref-section">
              <label class="pref-label">Pandoc 路径</label>
              <div class="pref-row">
                <input v-model="exportPrefs.pandocPath" placeholder="pandoc" class="pref-input flex" @change="saveSettings" />
                <button class="pref-btn" @click="browsePandoc">浏览...</button>
              </div>
            </div>
            <div class="pref-export-layout">
              <div class="pref-export-formats">
                <button
                  v-for="fmt in exportFormats"
                  :key="fmt.key"
                  class="pref-export-format-item"
                  :class="{ active: exportSelectedFormat === fmt.key }"
                  @click="exportSelectedFormat = fmt.key"
                >{{ fmt.label }}</button>
              </div>
              <div class="pref-export-config">
                <div class="pref-section">
                  <label class="pref-label">{{ currentFormatLabel }} Pandoc 参数（每行一个）</label>
                  <textarea
                    :value="currentFormatArgs"
                    @input="updateFormatArgs($event)"
                    :placeholder="currentFormatPlaceholder"
                    class="pref-textarea"
                    rows="8"
                  ></textarea>
                  <span class="pref-hint">每行一个参数，以 # 开头的行会被忽略</span>
                </div>
                <div class="pref-section">
                  <label class="pref-label">默认导出目录</label>
                  <select v-model="exportPrefs.defaultFolder" class="pref-select" @change="saveSettings">
                    <option value="auto">自动 （与源文件相同）</option>
                    <option value="custom">自定义</option>
                  </select>
                  <input v-if="exportPrefs.defaultFolder === 'custom'" v-model="exportPrefs.customFolderPath" placeholder="选择目录..." class="pref-input" @change="saveSettings" />
                </div>
                <div class="pref-section">
                  <label class="pref-label">导出完成后</label>
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="exportPrefs.afterOpenDir" @change="saveSettings" class="dialog-checkbox" />
                    打开所在目录
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="exportPrefs.afterOpenFile" @change="saveSettings" class="dialog-checkbox" />
                    打开文件
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="exportPrefs.afterRunCommand" @change="saveSettings" class="dialog-checkbox" />
                    运行自定义命令
                  </label>
                  <input v-if="exportPrefs.afterRunCommand" v-model="exportPrefs.afterCommand" placeholder="命令..." class="pref-input" @change="saveSettings" />
                </div>
              </div>
            </div>
          </div>

          <!-- 外观 -->
          <div v-if="activeCategory === 'appearance'" class="pref-scroll">
            <div class="pref-section">
              <label class="pref-label">窗口样式</label>
              <div class="pref-radio-group">
                <label class="radio-label">
                  <input type="radio" v-model="appearance.windowStyle" value="classic" @change="saveSettings" class="dialog-radio" /> 经典
                </label>
                <label class="radio-label">
                  <input type="radio" v-model="appearance.windowStyle" value="unified" @change="saveSettings" class="dialog-radio" /> 统一标题栏
                </label>
              </div>
              <span class="pref-hint">重启后生效</span>
            </div>
            <div class="pref-section">
              <label class="pref-label">字体大小</label>
              <div class="pref-radio-group">
                <label class="radio-label">
                  <input type="radio" v-model="appearance.fontSizeMode" value="recommended" @change="saveSettings" class="dialog-radio" /> 推荐
                </label>
                <label class="radio-label">
                  <input type="radio" v-model="appearance.fontSizeMode" value="custom" @change="saveSettings" class="dialog-radio" /> 自定义
                </label>
              </div>
              <input v-if="appearance.fontSizeMode === 'custom'" type="number" v-model.number="appearance.customFontSize" min="10" max="32" class="pref-input" @change="saveSettings" />
            </div>
            <div class="pref-section">
              <label class="pref-label">缩放</label>
              <div class="pref-row">
                <select v-model="appearance.zoom" class="pref-select" @change="saveSettings">
                  <option value="50">50%</option>
                  <option value="75">75%</option>
                  <option value="90">90%</option>
                  <option value="100">100%</option>
                  <option value="110">110%</option>
                  <option value="125">125%</option>
                  <option value="150">150%</option>
                  <option value="175">175%</option>
                  <option value="200">200%</option>
                </select>
                <button class="pref-btn" @click="resetZoom">重置</button>
              </div>
            </div>
            <div class="pref-section">
              <label class="checkbox-label">
                <input type="checkbox" v-model="appearance.ctrlScrollZoom" @change="saveSettings" class="dialog-checkbox" />
                Ctrl + 滚轮缩放
              </label>
            </div>
            <div class="pref-section">
              <label class="checkbox-label">
                <input type="checkbox" v-model="appearance.showStatusBar" @change="saveSettings" class="dialog-checkbox" />
                显示状态栏
              </label>
            </div>
            <div class="pref-section">
              <label class="pref-label">阅读速度</label>
              <div class="pref-row">
                <input type="number" v-model.number="appearance.readingSpeed" min="100" max="1000" step="50" class="pref-input" @change="saveSettings" />
                <span class="pref-unit">词/分钟</span>
                <button class="pref-btn" @click="resetReadingSpeed">重置</button>
              </div>
            </div>
            <div class="pref-section">
              <label class="pref-label">主题</label>
              <div class="pref-row">
                <select v-model="appearance.theme" class="pref-select" @change="applyTheme">
                  <option value="light">浅色</option>
                  <option value="dark">深色 (GitHub Dark + VSCode 2026)</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
            </div>
            <div v-if="appearance.theme === 'custom'" class="pref-section">
              <label class="pref-label">自定义主题变量 (CSS JSON)</label>
              <textarea v-model="customThemeJson" class="pref-textarea" rows="12" @input="applyCustomThemeFromJson"></textarea>
              <div class="pref-row" style="margin-top: 8px;">
                <button class="pref-btn" @click="loadCustomThemeExample">载入示例</button>
                <button class="pref-btn btn-primary" @click="saveCustomTheme">保存自定义主题</button>
              </div>
              <span class="pref-hint">可用的变量: --bg-primary, --bg-secondary, --bg-tertiary, --text-primary, --text-secondary, --text-muted, --accent, --border-color, --input-bg, --btn-bg, --btn-hover, --btn-border, --btn-primary-bg, --btn-primary-hover, --danger</span>
            </div>
          </div>

          <!-- 通用 -->
          <div v-if="activeCategory === 'general'" class="pref-scroll">
            <div class="pref-section">
              <label class="pref-label">语言</label>
              <select v-model="general.language" class="pref-select" @change="saveSettings">
                <option value="system">跟随系统</option>
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
              </select>
            </div>
            <div class="pref-section">
              <label class="pref-label">更新</label>
              <div class="pref-row">
                <button class="pref-btn" @click="checkUpdates">检查更新</button>
              </div>
              <label class="checkbox-label">
                <input type="checkbox" v-model="general.autoUpdate" @change="saveSettings" class="dialog-checkbox" />
                自动更新
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="general.devBuild" @change="saveSettings" class="dialog-checkbox" />
                使用开发版构建
              </label>
            </div>
            <div class="pref-section">
              <label class="pref-label">许可证</label>
              <div class="pref-row">
                <span class="pref-text">当前状态: {{ general.licenseInfo || '未激活' }}</span>
                <button class="pref-btn" @click="showLicenseDetails">许可证详情</button>
              </div>
            </div>
            <div class="pref-section">
              <label class="pref-label">快捷键</label>
              <button class="pref-btn" @click="customizeShortcuts">自定义快捷键</button>
            </div>
            <div class="pref-section">
              <label class="pref-label">Windows 资源管理器上下文菜单</label>
              <div class="pref-row">
                <button class="pref-btn" @click="addContextMenu">添加 .md 菜单</button>
                <button class="pref-btn" @click="removeContextMenu">移除 .md 菜单</button>
              </div>
            </div>
            <div class="pref-section">
              <button class="pref-btn" @click="resetDialogWarnings">重置对话框警告</button>
            </div>
          </div>

          <!-- 文件 -->
          <div v-if="activeCategory === 'file'" class="pref-scroll">
            <div class="pref-empty">
              <p>文件相关配置</p>
              <span class="pref-hint">此部分配置尚在开发中</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useThemeStore } from '../store/theme-store';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const themeStore = useThemeStore();

const searchQuery = ref('');
const activeCategory = ref('editor');

const categories = [
  { key: 'editor', label: '编辑器', icon: '✎' },
  { key: 'image', label: '图像', icon: '🖼' },
  { key: 'markdown', label: 'Markdown', icon: 'ℳ' },
  { key: 'export', label: '导出', icon: '⇧' },
  { key: 'appearance', label: '外观', icon: '🎨' },
  { key: 'general', label: '通用', icon: '⚙' },
  { key: 'file', label: '文件', icon: '📄' },
];

const exportFormats = [
  { key: 'pdf', label: 'PDF' },
  { key: 'html', label: 'HTML' },
  { key: 'image', label: 'Image' },
  { key: 'docx', label: 'Word(docx)' },
  { key: 'odt', label: 'OpenOffice' },
  { key: 'rtf', label: 'RTF' },
  { key: 'epub', label: 'Epub' },
  { key: 'latex', label: 'LaTeX' },
];

const STORAGE_KEY = 'metamark_preferences';

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

const defaults = {
  editor: {
    defaultIndent: '4',
    matchBrackets: true,
    matchMDChars: true,
    showBlockSource: false,
    copyPlainWithSource: false,
    copyWholeLine: true,
    lineEnding: 'LF',
    spellCheck: 'auto',
  },
  image: {
    insertAction: 'upload',
    applyLocalRules: true,
    applyNetworkRules: false,
    imageSyntax: 'relative',
  },
  md: {
    strictMode: false,
    headingStyle: 'atx',
    listStyle: 'dash-star-plus',
    extAutoLink: true,
    extInlineLatex: true,
    extMathBlock: true,
    extSubscript: true,
    extSuperscript: true,
    extHighlight: true,
    extGithubAlerts: true,
    extMermaid: true,
    smartPunctuation: 'none',
    codeShowLineNumbers: true,
    codeWordWrap: true,
    codeIndentSize: '4',
    codeDefaultLang: '',
    formulaPhysics: false,
    formulaAutoNumbering: 'none',
    firstLineIndent: false,
    showBr: false,
  },
  export: {
    defaultFolder: 'auto',
    customFolderPath: '',
    pandocPath: 'pandoc',
    afterOpenDir: true,
    afterOpenFile: false,
    afterRunCommand: false,
    afterCommand: '',
    customPandocArgs: '',
    formatArgs_pdf: '--pdf-engine=xelatex',
    formatArgs_html: '--standalone --toc',
    formatArgs_docx: '--reference-doc=',
    formatArgs_odt: '--reference-odt=',
    formatArgs_rtf: '',
    formatArgs_epub: '--toc --epub-cover-image=',
    formatArgs_latex: '--pdf-engine=xelatex',
    formatArgs_md: '--wrap=preserve',
  },
  appearance: {
    windowStyle: 'classic',
    fontSizeMode: 'recommended',
    customFontSize: 14,
    zoom: '100',
    ctrlScrollZoom: true,
    showStatusBar: true,
    readingSpeed: 300,
    theme: 'light',
  },
  general: {
    language: 'system',
    autoUpdate: true,
    devBuild: false,
    licenseInfo: '',
  },
};

const editor = reactive({ ...defaults.editor });
const image = reactive({ ...defaults.image });
const md = reactive({ ...defaults.md });
const exportPrefs = reactive({ ...defaults.export });
const appearance = reactive({ ...defaults.appearance });
const general = reactive({ ...defaults.general });
const exportSelectedFormat = ref('pdf');

const formatArgsMap = computed(() => {
  const key = `formatArgs_${exportSelectedFormat.value}`;
  return (exportPrefs as any)[key] || '';
});

const currentFormatLabel = computed(() => {
  const fmt = exportFormats.find(f => f.key === exportSelectedFormat.value);
  return fmt ? fmt.label : 'PDF';
});

const currentFormatArgs = computed({
  get: () => formatArgsMap.value,
  set: (val: string) => {
    const key = `formatArgs_${exportSelectedFormat.value}`;
    (exportPrefs as any)[key] = val;
    saveSettings();
  },
});

const currentFormatPlaceholder = computed(() => {
  const examples: Record<string, string> = {
    pdf: '--pdf-engine=xelatex\n# --toc',
    html: '--standalone\n--toc\n--mathjax',
    docx: '--reference-doc=template.docx\n--toc',
    odt: '--reference-odt=template.odt',
    rtf: '',
    epub: '--toc\n--epub-cover-image=cover.png',
    latex: '--pdf-engine=xelatex\n--toc',
    md: '--wrap=preserve\n--markdown-headings=atx',
  };
  return examples[exportSelectedFormat.value] || '';
});

function updateFormatArgs(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  currentFormatArgs.value = target.value;
}

onMounted(() => {
  const saved = loadSettings();
  if (saved) {
    if (saved.editor) Object.assign(editor, { ...defaults.editor, ...saved.editor });
    if (saved.image) Object.assign(image, { ...defaults.image, ...saved.image });
    if (saved.md) Object.assign(md, { ...defaults.md, ...saved.md });
    if (saved.export) Object.assign(exportPrefs, { ...defaults.export, ...saved.export });
    if (saved.appearance) Object.assign(appearance, { ...defaults.appearance, ...saved.appearance });
    if (saved.general) Object.assign(general, { ...defaults.general, ...saved.general });
  }
  const t = themeStore.theme || localStorage.getItem('metamark_theme') || 'light';
  appearance.theme = t;
  if (t === 'custom') {
    const saved = themeStore.load_custom_theme();
    if (Object.keys(saved).length > 0) {
      customThemeJson.value = JSON.stringify(saved, null, 2);
    } else {
      loadCustomThemeExample();
    }
  }
});

function saveSettings() {
  const data = {
    editor: { ...editor },
    image: { ...image },
    md: { ...md },
    export: { ...exportPrefs },
    appearance: { ...appearance },
    general: { ...general },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

watch(() => appearance.theme, (val) => {
  localStorage.setItem('metamark_theme', val);
});

function applyTheme() {
  themeStore.set_theme(appearance.theme as 'light' | 'dark' | 'custom');
  localStorage.setItem('metamark_theme', appearance.theme);
  saveSettings();
}

const customThemeJson = ref('');

function loadCustomThemeExample() {
  customThemeJson.value = JSON.stringify({
    '--bg-primary': '#0d1117',
    '--bg-secondary': '#161b22',
    '--bg-tertiary': '#21262d',
    '--border-color': '#30363d',
    '--text-primary': '#e6edf3',
    '--text-secondary': '#8b949e',
    '--text-muted': '#6e7681',
    '--accent': '#58a6ff',
    '--accent-hover': '#79c0ff',
    '--input-bg': '#21262d',
    '--btn-bg': '#21262d',
    '--btn-hover': '#30363d',
    '--btn-border': '#30363d',
    '--btn-primary-bg': '#238636',
    '--btn-primary-hover': '#2ea043',
    '--btn-primary-text': '#ffffff',
    '--danger': '#f85149',
    '--success': '#3fb950',
    '--warning': '#d29922',
  }, null, 2);
}

function applyCustomThemeFromJson() {
  try {
    const vars = JSON.parse(customThemeJson.value);
    for (const [key, val] of Object.entries(vars)) {
      if (typeof val === 'string' && key.startsWith('--')) {
        document.documentElement.style.setProperty(key, val);
      }
    }
  } catch { }
}

function saveCustomTheme() {
  try {
    const vars = JSON.parse(customThemeJson.value);
    themeStore.save_custom_theme(vars);
    appearance.theme = 'custom';
    applyTheme();
  } catch {
    alert('JSON 格式错误，请检查');
  }
}

function resetZoom() {
  appearance.zoom = '100';
  saveSettings();
}

function resetReadingSpeed() {
  appearance.readingSpeed = 300;
  saveSettings();
}

async function browsePandoc() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    filters: [{ name: '可执行文件', extensions: ['exe', 'cmd', 'bat', ''] }],
    multiple: false,
  });
  if (selected) {
    exportPrefs.pandocPath = selected as string;
    saveSettings();
  }
}

function checkUpdates() {
  // placeholder
}

function showLicenseDetails() {
  // placeholder
}

function customizeShortcuts() {
  // placeholder
}

function addContextMenu() {
  // placeholder
}

function removeContextMenu() {
  // placeholder
}

function resetDialogWarnings() {
  // placeholder
}

</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog-panel {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 720px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px 0;
}

.dialog-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.dialog-close:hover {
  color: #333;
}

.pref-search {
  padding: 12px 24px;
}

.pref-search-input {
  width: 100%;
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  outline: none;
  color: #333;
  box-sizing: border-box;
}

.pref-search-input:focus {
  border-color: #1976d2;
}

.pref-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.pref-sidebar {
  width: 140px;
  flex-shrink: 0;
  border-right: 1px solid #e8e8e8;
  padding: 8px 0;
  overflow-y: auto;
}

.pref-nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: none;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  text-align: left;
}

.pref-nav-item:hover {
  background: #f0f0f0;
}

.pref-nav-item.active {
  background: #e3f2fd;
  color: #1976d2;
  font-weight: 500;
}

.pref-nav-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
}

.pref-content {
  flex: 1;
  overflow: hidden;
}

.pref-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 16px 24px;
}

.pref-section {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #eee;
}

.pref-section:last-of-type {
  border-bottom: none;
}

.pref-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #555;
  margin-bottom: 8px;
}

.pref-label.sm {
  font-size: 12px;
  margin-bottom: 4px;
  margin-right: 8px;
  white-space: nowrap;
}

.pref-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pref-select {
  padding: 4px 8px;
  font-size: 13px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  color: #333;
  outline: none;
}

.pref-input {
  padding: 4px 8px;
  font-size: 13px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  outline: none;
  color: #333;
  box-sizing: border-box;
  width: 100px;
}

.pref-input.flex {
  flex: 1;
  width: auto;
}

.pref-input:focus {
  border-color: #1976d2;
}

.pref-textarea {
  width: 100%;
  min-height: 60px;
  padding: 6px 8px;
  font-size: 13px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  outline: none;
  color: #333;
  box-sizing: border-box;
  font-family: inherit;
  resize: vertical;
}

.pref-textarea:focus {
  border-color: #1976d2;
}

.pref-btn {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fafafa;
  cursor: pointer;
  color: #333;
  white-space: nowrap;
}

.pref-btn:hover {
  background: #e8e8e8;
}

.pref-hint {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.pref-text {
  font-size: 13px;
  color: #555;
}

.pref-unit {
  font-size: 12px;
  color: #888;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #333;
  margin-bottom: 6px;
  cursor: pointer;
}

.dialog-checkbox {
  accent-color: #1976d2;
}

.pref-radio-group {
  display: flex;
  gap: 16px;
}

.pref-radio-group.vertical {
  flex-direction: column;
  gap: 8px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
}

.dialog-radio {
  accent-color: #1976d2;
}

.indent-preview {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.6;
  min-width: 120px;
  margin-top: 6px;
}

.indent-preview pre {
  margin: 0;
  font-family: 'Consolas', 'Courier New', monospace;
  color: #888;
}

.indent-preview pre.indent-2 {
  padding-left: 0;
}

.indent-preview pre.indent-4 {
  padding-left: 0;
}

.pref-export-layout {
  display: flex;
  gap: 16px;
}

.pref-export-formats {
  width: 120px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pref-export-format-item {
  padding: 6px 12px;
  border: none;
  background: none;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  text-align: left;
  border-radius: 4px;
}

.pref-export-format-item:hover {
  background: #f0f0f0;
}

.pref-export-format-item.active {
  background: #e3f2fd;
  color: #1976d2;
  font-weight: 500;
}

.pref-export-config {
  flex: 1;
}

.pref-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.pref-empty p {
  font-size: 15px;
  margin: 0 0 4px;
  color: #666;
}
</style>
