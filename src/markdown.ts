import MarkdownIt from 'markdown-it';
import markdownItKatex from 'markdown-it-katex';
import 'katex/dist/katex.min.css';
import hljs from 'highlight.js';
import markdownItFootnote from 'markdown-it-footnote';
import markdownItSub from 'markdown-it-sub';
import markdownItSup from 'markdown-it-sup';
import markdownItMark from 'markdown-it-mark';
import markdownItContainerPlugin from 'markdown-it-container';

export const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (_e) {}
    }
    return hljs.highlightAuto(str).value || '';
  },
})
  .use(markdownItKatex)
  .use(markdownItFootnote)
  .use(markdownItSub)
  .use(markdownItSup)
  .use(markdownItMark)
  .use(markdownItContainerPlugin, 'note', {
    validate: (params: string) => params.trim().match(/^note\s+(.*)$/),
    render: (tokens: any[], idx: number) => {
      const token = tokens[idx];
      if (token.nesting === 1) {
        const title = token.info.trim().replace(/^note\s+/i, '') || 'Note';
        return `<div class="markdown-alert markdown-alert-note"><p class="markdown-alert-title">${title}</p>\n`;
      }
      return '</div>\n';
    },
  })
  .use(markdownItContainerPlugin, 'tip', {
    validate: (params: string) => params.trim().match(/^tip\s+(.*)$/),
    render: (tokens: any[], idx: number) => {
      const token = tokens[idx];
      if (token.nesting === 1) {
        const title = token.info.trim().replace(/^tip\s+/i, '') || 'Tip';
        return `<div class="markdown-alert markdown-alert-tip"><p class="markdown-alert-title">${title}</p>\n`;
      }
      return '</div>\n';
    },
  })
  .use(markdownItContainerPlugin, 'warning', {
    validate: (params: string) => params.trim().match(/^warning\s+(.*)$/),
    render: (tokens: any[], idx: number) => {
      const token = tokens[idx];
      if (token.nesting === 1) {
        const title = token.info.trim().replace(/^warning\s+/i, '') || 'Warning';
        return `<div class="markdown-alert markdown-alert-warning"><p class="markdown-alert-title">${title}</p>\n`;
      }
      return '</div>\n';
    },
  })
  .use(markdownItContainerPlugin, 'danger', {
    validate: (params: string) => params.trim().match(/^danger\s+(.*)$/),
    render: (tokens: any[], idx: number) => {
      const token = tokens[idx];
      if (token.nesting === 1) {
        const title = token.info.trim().replace(/^danger\s+/i, '') || 'Danger';
        return `<div class="markdown-alert markdown-alert-danger"><p class="markdown-alert-title">${title}</p>\n`;
      }
      return '</div>\n';
    },
  });

// ---- GitHub-style alerts ( [!NOTE], [!WARNING], [!TIP], [!CAUTION] ) ----
const ghAlertRegex = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i;
const origBlockquoteRender = md.renderer.rules.blockquote_open;
md.renderer.rules.blockquote_open = (tokens, idx, options, env, self) => {
  const nextToken = tokens[idx + 1];
  if (nextToken && nextToken.type === 'inline' && nextToken.content) {
    const match = nextToken.content.match(ghAlertRegex);
    if (match) {
      const type = match[1].toLowerCase();
      const typeMap: Record<string, { color: string; icon: string }> = {
        note: { color: '#0969da', icon: 'ℹ️' },
        tip: { color: '#1a7f37', icon: '💡' },
        important: { color: '#8250df', icon: '❗' },
        warning: { color: '#9a6700', icon: '⚠️' },
        caution: { color: '#cf222e', icon: '🔥' },
      };
      const t = typeMap[type] || typeMap.note;
      // Remove the alert marker from content
      nextToken.content = nextToken.content.replace(match[0], '').trim();
      return `<div class="gh-alert gh-alert-${type}" style="border-left:4px solid ${t.color};padding:8px 12px;margin:8px 0;background:${t.color}10;border-radius:4px"><p class="gh-alert-title" style="font-weight:600;color:${t.color};margin-bottom:4px">${t.icon} ${type.toUpperCase()}</p>\n`;
    }
  }
  return origBlockquoteRender ? origBlockquoteRender(tokens, idx, options, env, self) : `<blockquote>\n`;
};

const origBlockquoteClose = md.renderer.rules.blockquote_close;
md.renderer.rules.blockquote_close = (tokens, idx, options, env, self) => {
  const prevToken = tokens[idx - 1];
  if (prevToken && prevToken.type === 'inline' && prevToken.content !== undefined) {
    const prev = tokens[idx - 2];
    if (prev && prev.type === 'inline' && prev.content && prev.content.match(ghAlertRegex)) {
      return '</div>\n';
    }
  }
  return origBlockquoteClose ? origBlockquoteClose(tokens, idx, options, env, self) : `</blockquote>\n`;
};

// ---- Mermaid fence handling ----
const origFenceRender = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const lang = token.info.trim();
  const content = token.content;

  if (lang === 'mermaid' || lang === 'mmd') {
    return `<div class="mermaid" data-processed="false">${content}</div>`;
  }

  if (lang === 'html') {
    return `<div class="html-sandbox" data-code="${encodeURIComponent(content)}"></div>`;
  }

  return origFenceRender ? origFenceRender(tokens, idx, options, env, self) : '';
};

// ---- TOC (Table of Contents) ----
md.core.ruler.push('toc', (state) => {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'inline' && token.content.trim() === '[TOC]') {
      // Generate TOC from headings
      const headings: { level: number; text: string; anchor: string }[] = [];
      for (let j = 0; j < tokens.length; j++) {
        if (tokens[j].type === 'heading_open') {
          const level = Number(tokens[j].tag.slice(1));
          const contentToken = tokens[j + 1];
          const text = contentToken?.content || '';
          const anchor = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '');
          headings.push({ level, text, anchor });
        }
      }

      let tocHtml = '<div class="toc"><div class="toc-title">Table of Contents</div><ul class="toc-list">';
      for (const h of headings) {
        tocHtml += `<li class="toc-item toc-item-h${h.level}" style="padding-left:${(h.level - 1) * 16}px"><a href="#${h.anchor}">${h.text}</a></li>`;
      }
      tocHtml += '</ul></div>';

      // Replace token
      const newToken = new state.Token('html_block', '', 0);
      newToken.content = tocHtml;
      tokens[i] = newToken;
    }
  }
});
