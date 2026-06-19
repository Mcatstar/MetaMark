const STORAGE_KEY = 'metamark_preferences';

export interface MetaMarkPreferences {
  editor: {
    defaultIndent: string;
    matchBrackets: boolean;
    matchMDChars: boolean;
    showBlockSource: boolean;
    copyPlainWithSource: boolean;
    copyWholeLine: boolean;
    lineEnding: string;
    spellCheck: string;
  };
  image: {
    insertAction: string;
    applyLocalRules: boolean;
    applyNetworkRules: boolean;
    imageSyntax: string;
  };
  md: {
    strictMode: boolean;
    headingStyle: string;
    listStyle: string;
    extAutoLink: boolean;
    extInlineLatex: boolean;
    extMathBlock: boolean;
    extSubscript: boolean;
    extSuperscript: boolean;
    extHighlight: boolean;
    extGithubAlerts: boolean;
    extMermaid: boolean;
    smartPunctuation: string;
    codeShowLineNumbers: boolean;
    codeWordWrap: boolean;
    codeIndentSize: string;
    codeDefaultLang: string;
    formulaPhysics: boolean;
    formulaAutoNumbering: string;
    firstLineIndent: boolean;
    showBr: boolean;
  };
  export: {
    defaultFolder: string;
    customFolderPath: string;
    pandocPath: string;
    afterOpenDir: boolean;
    afterOpenFile: boolean;
    afterRunCommand: boolean;
    afterCommand: string;
    customPandocArgs: string;
    formatArgs_pdf: string;
    formatArgs_html: string;
    formatArgs_docx: string;
    formatArgs_odt: string;
    formatArgs_rtf: string;
    formatArgs_epub: string;
    formatArgs_latex: string;
    formatArgs_md: string;
  };
  appearance: {
    windowStyle: string;
    fontSizeMode: string;
    customFontSize: number;
    zoom: string;
    ctrlScrollZoom: boolean;
    showStatusBar: boolean;
    readingSpeed: number;
    theme: string;
  };
  general: {
    language: string;
    autoUpdate: boolean;
    devBuild: boolean;
    licenseInfo: string;
  };
}

const defaults: MetaMarkPreferences = {
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

export function loadPreferences(): MetaMarkPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged: MetaMarkPreferences = { ...defaults };
      for (const key of Object.keys(defaults) as (keyof MetaMarkPreferences)[]) {
        if (parsed[key]) {
          (merged as any)[key] = { ...(defaults as any)[key], ...parsed[key] };
        }
      }
      const theme = localStorage.getItem('metamark_theme');
      if (theme) merged.appearance.theme = theme;
      return merged;
    }
  } catch { }
  return { ...defaults };
}

export function applyPreferences(prefs: MetaMarkPreferences): void {
  const root = document.documentElement;

  // Font size
  if (prefs.appearance.fontSizeMode === 'custom' && prefs.appearance.customFontSize) {
    root.style.setProperty('--editor-font-size', `${prefs.appearance.customFontSize}px`);
  } else {
    root.style.setProperty('--editor-font-size', '');
  }

  // Zoom
  const zoom = parseInt(prefs.appearance.zoom) || 100;
  root.style.setProperty('--app-zoom', `${zoom}%`);

  // Theme is handled by theme-store
}

export function getPandocPath(): string {
  const prefs = loadPreferences();
  return prefs.export.pandocPath;
}

export { defaults };
