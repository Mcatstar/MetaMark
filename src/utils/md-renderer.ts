import { md } from '../markdown';

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '');
}

export function md_render(text: string): string {
  return md.render(text);
}

export function md_parse_tokens(text: string): ReturnType<typeof md.parse> {
  return md.parse(text, {});
}

export function get_headings(text: string): { level: number; text: string; anchor: string }[] {
  const tokens = md.parse(text, {});
  const headings: { level: number; text: string; anchor: string }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'heading_open') {
      const level = Number(token.tag.slice(1));
      const content_token = tokens[i + 1];
      const text_content = content_token?.content ?? '';
      headings.push({
        level,
        text: text_content,
        anchor: slugify(text_content),
      });
    }
  }

  return headings;
}

export function compute_page_breaks(html: string, page_height_px: number): number[] {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.style.cssText = 'visibility:hidden;position:absolute;width:800px;left:-9999px;top:0';
  document.body.appendChild(div);

  const children = Array.from(div.children);
  const breaks: number[] = [];
  let cumulative = 0;

  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement;
    const h = child.offsetHeight;
    cumulative += h;
    if (cumulative > page_height_px && breaks[breaks.length - 1] !== i - 1) {
      breaks.push(i);
      cumulative = h;
    }
  }

  document.body.removeChild(div);
  return breaks;
}
