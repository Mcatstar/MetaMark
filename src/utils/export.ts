import { invoke } from '@tauri-apps/api/core';
import { save, message } from '@tauri-apps/plugin-dialog';
import { loadPreferences } from './settings';

const FORMAT_CONFIG: Record<string, { label: string; extensions: string[]; defaultExt: string }> = {
  pdf: { label: 'PDF', extensions: ['pdf'], defaultExt: 'document.pdf' },
  html: { label: 'HTML', extensions: ['html'], defaultExt: 'document.html' },
  docx: { label: 'Word (docx)', extensions: ['docx'], defaultExt: 'document.docx' },
  odt: { label: 'OpenOffice', extensions: ['odt'], defaultExt: 'document.odt' },
  rtf: { label: 'RTF', extensions: ['rtf'], defaultExt: 'document.rtf' },
  epub: { label: 'Epub', extensions: ['epub'], defaultExt: 'document.epub' },
  latex: { label: 'LaTeX', extensions: ['tex'], defaultExt: 'document.tex' },
  md: { label: 'Markdown', extensions: ['md'], defaultExt: 'document.md' },
};

function getExtraArgs(format: string): string[] {
  const prefs = loadPreferences();
  const argsKey = `formatArgs_${format}`;
  const raw = (prefs.export as any)[argsKey];
  if (!raw || typeof raw !== 'string') return [];
  return raw.split('\n').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('#'));
}

export async function export_file(content: string, format: string): Promise<boolean> {
  const cfg = FORMAT_CONFIG[format];
  if (!cfg) {
    await message(`不支持的导出格式: ${format}`, { title: '错误', kind: 'error' });
    return false;
  }

  try {
    const path = await save({
      filters: [{ name: cfg.label, extensions: cfg.extensions }],
      defaultPath: cfg.defaultExt,
    });
    if (!path) return false;

    const prefs = loadPreferences();
    const pandocPath = prefs.export.pandocPath || 'pandoc';
    const extraArgs = getExtraArgs(format);

    await invoke('export_with_pandoc', {
      content,
      path: path as string,
      format,
      pandocPath,
      extraArgs,
    });
    return true;
  } catch (e) {
    await message(`导出 ${cfg.label} 失败: ${e}`, { title: '错误', kind: 'error' });
    return false;
  }
}
