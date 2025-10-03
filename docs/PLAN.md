# Marknext Plan & Design

Goals
- Typora/Notion-grade editing UX with TipTap (ProseMirror) core
- Reusable Editor class API + React component
- Extensible commands/keymaps/extensions; strict TypeScript & ESLint

Architecture
- Core: TipTap Editor instance wrapped by `Editor` class providing commands, events, Markdown I/O
- React: `MarkdownEditor` mounts editor; composable UI (toolbar, selection bubble, slash menu)
- Markdown I/O: light HTML<->MD layer now; plan to adopt ProseMirror Markdown mapping

Backlog (snapshot)
- Slash Menu v2: grouping/icons/keyboard polish; caret-based positioning (in progress)
- Selection Bubble v2: active state, link editor UI, remove-link
- Input Rules: strict patterns for lists/tasks/quote/hr/heading; unit tests
- Clipboard: full HTML clean pipeline; range-only Markdown export; paste mode toggle
- Images: upload hook (`onUpload`), base64 placeholder->URL replacement
- Table toolbar: merge/split cells, column/row ops, alignments
- A11y: ARIA roles, focus management, keyboard navigation across menus
- Markdown mapping: switch to tiptap-markdown or pm-markdown with custom schema mapping
- Theming: tokens, light/dark switch, CSS vars

Testing
- node:test for HTML<->MD; add tiptap transaction tests (jsdom) later

Contributing
- ESLint strict; no any; small, documented PRs; keep UI decoupled from core

