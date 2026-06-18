import { invoke } from '@tauri-apps/api/core';
import { md } from '../markdown';

const HTML_TEMPLATE = (body: string): string => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Exported Document</title>
<style>
body { max-width: 800px; margin: 40px auto; padding: 0 20px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
img { max-width: 100%; }
code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
pre { background: #f5f5f5; padding: 16px; border-radius: 4px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background: #f5f5f5; }
</style>
</head>
<body>${body}</body>
</html>`;

export async function export_to_format(content: string, format: string): Promise<void> {
  await invoke('export_to_format', { content, format });
}

export async function print_document(content: string): Promise<void> {
  await invoke('print_document', { content });
}

export async function export_to_pdf(content: string): Promise<void> {
  const html = export_to_html(content);
  await invoke('export_to_pdf', { html });
}

export function export_to_html(content: string): string {
  return HTML_TEMPLATE(md.render(content));
}

export async function export_to_word(content: string): Promise<void> {
  const html = export_to_html(content);
  await invoke('export_to_word', { html });
}
