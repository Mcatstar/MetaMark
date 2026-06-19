# MetaMark

A feature-rich Markdown editor built with **Tauri 2**, **Vue 3**, and **TypeScript** — inspired by Typora.

## Features

- **Three editing modes**: Inline (WYSIWYG-like), Source (code editor with Monaco), Split (live preview side-by-side)
- **Rich Markdown support**:
  - CommonMark / GFM
  - KaTeX math (inline `$...$` and block `$$...$$`)
  - Footnotes, Subscript, Superscript, Highlight (`==...==`)
  - Mermaid diagrams
  - Table of Contents (`[TOC]`)
  - GitHub-style alerts (`> [!NOTE]`, `> [!WARNING]`, etc.)
  - Custom alert containers (`::: note`, `::: tip`, `::: warning`, `::: danger`)
  - Syntax highlighting via highlight.js
- **Multi-format export** via Pandoc: PDF, HTML, DOCX, ODT, RTF, EPUB, LaTeX, Markdown
- **File management**: file tree sidebar, editor tabs, recent files quick open (`Ctrl+P`)
- **Page layout settings**: paper size presets (A4, Letter, etc.), custom margins, double-page mode
- **Themes**: Light, Dark, and fully customizable theme
- **Focus mode & Typewriter mode**
- **Search & Replace** across the current document
- **Outline panel** for document navigation
- **Comprehensive hotkey system**
- **Preferences panel** for editor, markdown, export, and appearance settings

## Tech Stack

| Layer       | Technology         |
| ----------- | ------------------ |
| Frontend    | Vue 3, Pinia, TypeScript |
| Editor      | Monaco Editor      |
| Markdown    | markdown-it + plugins |
| Diagrams    | Mermaid            |
| Desktop     | Tauri 2            |
| Backend     | Rust               |
| Export      | Pandoc             |
| Build       | Vite, bun          |

## Getting Started

### Prerequisites

- [bun](https://bun.sh/) or [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/) (for Tauri)
- [Pandoc](https://pandoc.org/) (optional, for document export)

### Development

```bash
# Install dependencies
bun install

# Start the Tauri development server
bun run tauri dev
```

### Build

```bash
bun run tauri build
```

The built application will be in `src-tauri/target/release/`.

## Project Structure

```
metamark/
├── src/                    # Vue frontend
│   ├── App.vue             # Root component
│   ├── main.ts             # Entry point
│   ├── markdown.ts         # markdown-it configuration
│   ├── components/         # Vue components
│   ├── store/              # Pinia stores
│   ├── utils/              # Utilities (export, renderer, settings, layout)
│   ├── types/              # TypeScript type definitions
│   ├── config/             # Menu configuration
│   └── hooks/              # Composable hooks
├── src-tauri/              # Tauri / Rust backend
│   └── src/
│       ├── lib.rs          # Tauri commands (file I/O, pandoc export)
│       └── main.rs         # Entry point
├── package.json
├── vite.config.ts
└── tauri.conf.json
```

## Keyboard Shortcuts

| Shortcut              | Action              |
| --------------------- | ------------------- |
| `Ctrl+N`              | New file            |
| `Ctrl+O`              | Open file           |
| `Ctrl+P`              | Quick open          |
| `Ctrl+S`              | Save                |
| `Ctrl+Shift+S`        | Save as             |
| `Ctrl+Z` / `Ctrl+Y`  | Undo / Redo         |
| `Ctrl+B`              | Bold                |
| `Ctrl+I`              | Italic              |
| `Ctrl+U`              | Underline           |
| `Ctrl+K`              | Link                |
| `Ctrl+1`-`Ctrl+6`    | Heading 1-6         |
| `Ctrl+F`              | Find                |
| `Ctrl+H`              | Replace             |
| `Ctrl+Shift+L`        | Toggle sidebar      |
| `Ctrl+Alt+P`          | Toggle split view   |
| `Alt+Z`               | Toggle word wrap    |

See `src/App.vue` (`HOTKEY_MAP`) for the full list.

## Export

Export requires [Pandoc](https://pandoc.org/) to be installed. Configure the Pandoc path and per-format arguments in Preferences → Export.

Supported formats: PDF, HTML, DOCX, ODT, RTF, EPUB, LaTeX, Markdown.

## License

MIT
