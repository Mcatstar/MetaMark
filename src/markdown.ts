import MarkdownIt from 'markdown-it';
import markdownItKatex from 'markdown-it-katex';
import 'katex/dist/katex.min.css';
import hljs from 'highlight.js';

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
    return '';
  }
})
  .use(markdownItKatex);

const defaultRender = md.renderer.rules.fence || ((tokens, idx, options, _env, self) => {
  return self.renderToken(tokens, idx, options);
});

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const lang = token.info.trim();
  const content = token.content;

  if (lang === 'html') {
    return `<div class="html-sandbox" data-code="${encodeURIComponent(content)}"></div>`;
  }

  return defaultRender(tokens, idx, options, env, self);
};
