# Marknext

Reusable WYSIWYG Markdown editor library with a React component and an imperative Editor API. Now powered by TipTap (ProseMirror) for schema/commands/keymaps, targeting Typora/Notion‑like UX.

Structure
- packages/marknext: library source (`@marknext/editor`, dev alias `marknext`) — TipTap v3 core + StarterKit
- src: playground app using Vite + React

Quickstart
- Dev: pnpm dev
- Lint: pnpm lint
- Build: pnpm build (builds the library via TypeScript project references and the playground app via Vite)
 - Test: pnpm test

Playground Usage (src/App.tsx)
```tsx
import { MarkdownEditor } from 'marknext'

export default function App() {
  return <MarkdownEditor defaultMarkdown={'# Hello Marknext'} />
}
```

Library API (packages/marknext, TipTap‑based)
- Editor class (wraps TipTap Editor)
  - constructor({ element, initialMarkdown?, placeholder?, extensions? })
  - getMarkdown() / setMarkdown(markdown) [uses HTML <-> Markdown converter]
  - getHTML() [delegates to TipTap]
  - exec(commandId) [delegates to TipTap chain]
  - on('update'|'focus'|'blur', handler)
- React component: `MarkdownEditor`
  - Props: `defaultMarkdown?`, `onChange?`, `placeholder?`
  - Ref: `getEditor()` to access underlying Editor instance
  - Extension API
  - Provide commands and keymaps via `{ name, commands: [], keymap: [], setup(editor) }`
  - Example: `linksExtension` adds `Mod-k` to insert links

TipTap Notes
- Core editing behaviors, schema, and keymaps come from TipTap StarterKit and extensions (link, task list)
- Markdown <-> HTML conversion stays minimal and can be extended; TipTap content is driven by HTML provided by the converter
- Extensibility: you can add TipTap extensions by passing via `extensions` in our React component or wrapping Editor API

Features (so far)
- Blocks: paragraph, headings (H1–H3), blockquote, code block (Lowlight highlighting), HR, tables (insert/add row/col/delete), lists (bullet/ordered/task)
- Inline: bold, italic, underline, strike, code, links (Mod-K)
- Images: insert via URL，支持粘贴/拖拽图片（base64 占位，可替换为上传回调）
- Shortcuts: Mod-B/I/U/`，Shift-Ctrl-7/8/9（有序/无序/任务），Mod-Shift-> 引用，Mod-Shift-- 分割线
- Slash 菜单（输入 / 打开，支持筛选）

Roadmap
- 更完善的 Slash 菜单（键盘导航、最近项、分组、图标化）
- 粘贴 Markdown/HTML 归一化、导出 Markdown 使用 ProseMirror Markdown 映射
- 图片上传钩子（支持异步上传、占位/进度）、文件/附件
- 表格工具条（合并单元格/更多操作）
- 更丰富的块：Callout、公式、分栏、折叠、内嵌代码沙盒等

Code Quality
- TypeScript `strict` enabled; `no-explicit-any` enforced by ESLint
- Flat ESLint config at repo root covers packages and app
