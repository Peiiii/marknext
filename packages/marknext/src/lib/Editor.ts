import { htmlToMarkdown, markdownToHtml } from './markdown'
import { Editor as TiptapEditor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
// import TaskItem from '@tiptap/extension-task-item'
import { TaskItemStrict } from './extensions/taskStrict'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight'
import TextAlign from '@tiptap/extension-text-align'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'

const lowlight = createLowlight()
lowlight.register({ javascript, typescript, json, xml, css, bash, python, go, rust })
lowlight.registerAlias({ javascript: ['js'], typescript: ['ts'] })
import type {
  EditorOptions,
  EditorEventMap,
  EditorExtension,
  EditorCommand,
  CommandContext,
  KeymapSpec,
} from './types'

// Very small event emitter with typed events
class Emitter<T extends Record<string, unknown>> {
  private listeners: Map<keyof T, Set<(payload: unknown) => void>> = new Map()
  on<K extends keyof T>(event: K, fn: (payload: T[K]) => void): () => void {
    const set = this.listeners.get(event) ?? new Set()
    set.add(fn as (payload: unknown) => void)
    this.listeners.set(event, set)
    return () => set.delete(fn as (payload: unknown) => void)
  }
  emit<K extends keyof T>(event: K, payload: T[K]): void {
    const set = this.listeners.get(event)
    if (!set) return
    set.forEach((fn) => fn(payload))
  }
}

// Normalize key combo to a canonical form like Mod-b, Shift-Ctrl-7
const normalizeKey = (e: KeyboardEvent): string => {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.metaKey) parts.push('Mod')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  parts.push(key)
  return parts.join('-')
}

export class Editor {
  #root: HTMLElement
  #editable: HTMLDivElement
  #tiptap!: TiptapEditor
  #emitter = new Emitter<EditorEventMap>()
  #commands: Map<string, EditorCommand> = new Map()
  #keymap: Map<string, string> = new Map() // key -> command id
  #extensions: EditorExtension[] = []

  constructor(options: EditorOptions) {
    this.#root = options.element
    this.#editable = document.createElement('div')
    this.#editable.className = 'mx-editor'
    this.#editable.spellcheck = true
    this.#editable.dataset.placeholder = options.placeholder ?? ''
    this.#root.appendChild(this.#editable)

    // Create TipTap editor mounted to editable container
    this.#tiptap = new TiptapEditor({
      element: this.#editable,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
        }),
        Link.configure({ openOnClick: false }),
        TaskList,
        TaskItemStrict.configure({ nested: true }),
        Underline,
        Strike,
        Image.configure({ inline: false }),
        Placeholder.configure({ placeholder: options.placeholder ?? 'Start typing...' }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        CodeBlockLowlight.configure({ lowlight }),
      ],
      content: markdownToHtml(options.initialMarkdown ?? ''),
      onUpdate: () => this.#onUpdate(),
      onFocus: () => this.#emitter.emit('focus', undefined),
      onBlur: () => this.#emitter.emit('blur', undefined),
    })

    // Extra key handling for custom combos
    this.#editable.addEventListener('keydown', (e) => this.#onKeydown(e))
    // Paste & drop support for images (base64 fallback)
    this.#editable.addEventListener('paste', (e) => this.#onPaste(e))
    this.#editable.addEventListener('drop', (e) => this.#onDrop(e))

    // Built-in minimal styling placeholder support
    this.#injectBaseStyles()

    // Register built-in commands
    this.#registerBuiltins()

    // Extensions
    if (options.extensions) {
      options.extensions.forEach((ext) => this.use(ext))
    }

    // Initial content is already set via TipTap
  }

  getRoot(): HTMLElement {
    return this.#editable
  }

  // Expose internal TipTap editor for advanced UI integrations (Bubble/Floating Menu)
  getTiptap(): TiptapEditor {
    return this.#tiptap
  }

  on<K extends keyof EditorEventMap>(event: K, fn: (payload: EditorEventMap[K]) => void): () => void {
    return this.#emitter.on(event, fn)
  }

  use(ext: EditorExtension): void {
    this.#extensions.push(ext)
    ext.commands?.forEach((c) => this.registerCommand(c))
    ext.keymap?.forEach((k) => this.bindKey(k))
    ext.setup?.(this)
  }

  registerCommand(cmd: EditorCommand): void {
    this.#commands.set(cmd.id, cmd)
  }

  bindKey(map: KeymapSpec): void {
    this.#keymap.set(map.keys, map.command)
  }

  exec(id: string): boolean {
    const cmd = this.#commands.get(id)
    if (!cmd) return false
    const ctx = this.#ctx()
    return cmd.run(ctx)
  }

  setMarkdown(markdown: string): void {
    const html = markdownToHtml(markdown)
    this.#tiptap.commands.setContent(html, { emitUpdate: false })
    this.#onUpdate()
  }

  getMarkdown(): string {
    return htmlToMarkdown(this.#tiptap.getHTML())
  }

  getHTML(): string {
    return this.#tiptap.getHTML()
  }

  destroy(): void {
    this.#tiptap.destroy()
    this.#editable.remove()
    // No global listeners attached
  }

  // Internal helpers
  #onUpdate(): void {
    const payload = { markdown: this.getMarkdown(), html: this.getHTML() }
    this.#emitter.emit('update', payload)
  }

  #onKeydown(e: KeyboardEvent): void {
    // Smart navigation: ArrowDown at end of blockquote -> insert empty paragraph after
    if (e.key === 'ArrowDown') {
      const { state } = this.#tiptap
      const { $from } = state.selection
      let depth: number | null = null
      for (let d = $from.depth; d > 0; d--) {
        if ($from.node(d).type.name === 'blockquote') { depth = d; break }
      }
      if (depth != null) {
        const atEnd = $from.parentOffset === $from.parent.content.size
        if (atEnd) {
          e.preventDefault()
          const insertPos = $from.after(depth)
          this.#tiptap
            .chain()
            .focus()
            .insertContentAt(insertPos, { type: 'paragraph' })
            .setTextSelection(insertPos + 1)
            .run()
          return
        }
      }
    }

    const combo = normalizeKey(e)
    const cmdId = this.#keymap.get(combo)
    if (!cmdId) return
    const ran = this.exec(cmdId)
    if (ran) {
      e.preventDefault()
      this.#onUpdate()
    }
  }

  #onPaste(e: ClipboardEvent): void {
    // Handle markdown text first
    const md = e.clipboardData?.getData('text/markdown')
    const text = e.clipboardData?.getData('text/plain')
    const maybe = (md && md.trim().length > 0) ? md : (text && isLikelyMarkdown(text) ? text : '')
    if (maybe) {
      e.preventDefault()
      const html = markdownToHtml(maybe)
      this.#tiptap.chain().focus().insertContent(html).run()
      this.#onUpdate()
      return
    }

    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file && file.type.startsWith('image/')) {
          e.preventDefault()
          this.#insertImageFile(file)
          return
        }
      }
    }
  }

  #onDrop(e: DragEvent): void {
    if (!e.dataTransfer) return
    const files = Array.from(e.dataTransfer.files)
    const img = files.find((f) => f.type.startsWith('image/'))
    if (img) {
      e.preventDefault()
      this.#insertImageFile(img)
    }
  }

  #insertImageFile(file: File): void {
    const reader = new FileReader()
    reader.onload = () => {
      const src = String(reader.result)
      this.#tiptap.chain().focus().setImage({ src }).run()
    }
    reader.readAsDataURL(file)
  }

  #ctx(): CommandContext {
    const sel = window.getSelection()
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null
    return { root: this.#editable, range }
  }

  #registerBuiltins(): void {
    // TipTap commands
    this.registerCommand({ id: 'toggleBold', label: 'Bold', run: () => this.#tiptap.chain().focus().toggleBold().run() })
    this.registerCommand({ id: 'toggleItalic', label: 'Italic', run: () => this.#tiptap.chain().focus().toggleItalic().run() })
    this.registerCommand({ id: 'toggleUnderline', label: 'Underline', run: () => this.#tiptap.chain().focus().toggleUnderline().run() })
    this.registerCommand({ id: 'toggleStrike', label: 'Strike', run: () => this.#tiptap.chain().focus().toggleStrike().run() })
    this.registerCommand({ id: 'toggleCode', label: 'Code', run: () => this.#tiptap.chain().focus().toggleCode().run() })
    this.registerCommand({ id: 'toggleCodeBlock', label: 'Code Block', run: () => this.#tiptap.chain().focus().toggleCodeBlock().run() })
    this.registerCommand({ id: 'toggleBulletList', label: 'Bullet List', run: () => this.#tiptap.chain().focus().toggleBulletList().run() })
    this.registerCommand({ id: 'toggleOrderedList', label: 'Ordered List', run: () => this.#tiptap.chain().focus().toggleOrderedList().run() })
    this.registerCommand({ id: 'toggleTaskList', label: 'Task List', run: () => this.#tiptap.chain().focus().toggleTaskList().run() })
    this.registerCommand({ id: 'toggleBlockquote', label: 'Blockquote', run: () => this.#tiptap.chain().focus().toggleBlockquote().run() })
    this.registerCommand({ id: 'insertHorizontalRule', label: 'Horizontal Rule', run: () => this.#tiptap.chain().focus().setHorizontalRule().run() })
    this.registerCommand({ id: 'alignLeft', label: 'Align Left', run: () => this.#tiptap.chain().focus().setTextAlign('left').run() })
    this.registerCommand({ id: 'alignCenter', label: 'Align Center', run: () => this.#tiptap.chain().focus().setTextAlign('center').run() })
    this.registerCommand({ id: 'alignRight', label: 'Align Right', run: () => this.#tiptap.chain().focus().setTextAlign('right').run() })
    this.registerCommand({ id: 'alignJustify', label: 'Align Justify', run: () => this.#tiptap.chain().focus().setTextAlign('justify').run() })
    this.registerCommand({ id: 'setHeading1', label: 'Heading 1', run: () => this.#tiptap.chain().focus().setHeading({ level: 1 }).run() })
    this.registerCommand({ id: 'setHeading2', label: 'Heading 2', run: () => this.#tiptap.chain().focus().setHeading({ level: 2 }).run() })
    this.registerCommand({ id: 'setHeading3', label: 'Heading 3', run: () => this.#tiptap.chain().focus().setHeading({ level: 3 }).run() })
    this.registerCommand({ id: 'setParagraph', label: 'Paragraph', run: () => this.#tiptap.chain().focus().setParagraph().run() })
    this.registerCommand({ id: 'insertImage', label: 'Insert Image', run: () => {
      const href = window.prompt('Image URL')
      if (!href) return false
      return this.#tiptap.chain().focus().setImage({ src: href }).run()
    } })
    this.registerCommand({ id: 'insertLink', label: 'Insert Link', run: () => {
      const href = window.prompt('Link URL')
      if (!href) return false
      return this.#tiptap.chain().focus().extendMarkRange('link').setLink({ href }).run()
    } })
    this.registerCommand({ id: 'unsetLink', label: 'Remove Link', run: () => this.#tiptap.chain().focus().unsetLink().run() })
    this.registerCommand({ id: 'insertTable', label: 'Insert Table', run: () => this.#tiptap.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() })
    this.registerCommand({ id: 'addRowAfter', label: 'Add Row After', run: () => this.#tiptap.chain().focus().addRowAfter().run() })
    this.registerCommand({ id: 'addColumnAfter', label: 'Add Column After', run: () => this.#tiptap.chain().focus().addColumnAfter().run() })
    this.registerCommand({ id: 'deleteTable', label: 'Delete Table', run: () => this.#tiptap.chain().focus().deleteTable().run() })

    // Clipboard helpers
    this.registerCommand({ id: 'copyAsMarkdown', label: 'Copy As Markdown', run: () => copyTextToClipboard(this.getMarkdown()) })
    this.registerCommand({ id: 'pasteMarkdown', label: 'Paste Markdown', run: () => {
      if (!('clipboard' in navigator) || typeof navigator.clipboard.readText !== 'function') return false
      void navigator.clipboard.readText().then((txt) => {
        if (!txt) return
        const html = markdownToHtml(txt)
        this.#tiptap.chain().focus().insertContent(html).run()
        this.#onUpdate()
      })
      return true
    } })

    // Keymap (avoid duplicating bold/italic which TipTap already handles)
    this.bindKey({ keys: 'Mod-b', command: 'toggleBold' })
    this.bindKey({ keys: 'Mod-i', command: 'toggleItalic' })
    this.bindKey({ keys: 'Mod-u', command: 'toggleUnderline' })
    this.bindKey({ keys: 'Mod-`', command: 'toggleCode' })
    this.bindKey({ keys: 'Shift-Ctrl-7', command: 'toggleOrderedList' })
    this.bindKey({ keys: 'Shift-Ctrl-8', command: 'toggleBulletList' })
    this.bindKey({ keys: 'Shift-Ctrl-9', command: 'toggleTaskList' })
    this.bindKey({ keys: 'Mod-Shift->', command: 'toggleBlockquote' })
    this.bindKey({ keys: 'Mod-Shift--', command: 'insertHorizontalRule' })
    this.bindKey({ keys: 'Mod-Shift-l', command: 'alignLeft' })
    this.bindKey({ keys: 'Mod-Shift-e', command: 'alignCenter' })
    this.bindKey({ keys: 'Mod-Shift-r', command: 'alignRight' })
    this.bindKey({ keys: 'Mod-Shift-j', command: 'alignJustify' })
    this.bindKey({ keys: 'Mod-Shift-c', command: 'copyAsMarkdown' })
    this.bindKey({ keys: 'Mod-Shift-v', command: 'pasteMarkdown' })
  }

  #injectBaseStyles(): void {
    if (document.getElementById('marknext-base-styles')) return
    const style = document.createElement('style')
    style.id = 'marknext-base-styles'
    style.textContent = `
      .mx-editor { min-height: 240px; outline: none; line-height: 1.7; font-size: 16px; color: #0f172a; background: #ffffff; text-align: left; padding: 16px 20px; max-width: 820px; margin: 24px auto; border: 1px solid #e5e7eb; border-radius: 8px; }
      .mx-editor:focus-within { border-color: transparent; box-shadow: none; }
      .mx-editor .ProseMirror { caret-color: #0f172a; }
      .mx-editor .ProseMirror:focus { outline: none; }
      .mx-editor .ProseMirror p:empty { min-height: 1.2em; }
      .mx-toolbar { display: flex; gap: 6px; }
      .mx-toolbar button { padding: 4px 8px; font-size: 12px; border: 1px solid #e5e7eb; background: #f9fafb; border-radius: 6px; }
      .mx-toolbar button:hover { background: #f3f4f6; }
      .mx-editor h1 { font-size: 1.8em; margin: 0.8em 0 0.4em; font-weight: 700; line-height: 1.2; }
      .mx-editor h2 { font-size: 1.5em; margin: 0.75em 0 0.4em; font-weight: 600; line-height: 1.3; }
      .mx-editor h3 { font-size: 1.25em; margin: 0.6em 0 0.3em; font-weight: 600; line-height: 1.35; }
      .mx-editor p { margin: 0.5em 0; }
      .mx-editor ul, .mx-editor ol { padding-left: 1.25em; margin: 0.4em 0; }
      .mx-editor ul ul, .mx-editor ul ol, .mx-editor ol ul, .mx-editor ol ol { padding-left: 1.25em; }
      .mx-editor a { color: #2563eb; text-decoration: none; }
      .mx-editor a:hover { text-decoration: underline; }
      .mx-editor pre { background: #f5f7fa; color: #0f172a; padding: 12px; border-radius: 8px; overflow: auto; }
      .mx-editor code { background: #f3f4f6; padding: 1px 4px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.95em; }
      .mx-editor hr { border: 0; height: 1px; background: #cbd5e1; margin: 16px 0; }
      .mx-editor blockquote { border-left: 4px solid #e5e7eb; padding-left: 12px; color: #475569; margin: 8px 0; background: #f9fafb; }
      .mx-editor ul.task-list { list-style: none; padding-left: 1.25em; }
      .mx-editor ul.task-list li { display: flex; gap: 8px; align-items: center; }
      .mx-editor ul[data-type="taskList"] { list-style: none; padding-left: 1.25em; }
      .mx-editor ul[data-type="taskList"] li { list-style: none; display: flex; gap: 8px; align-items: center; }
      .mx-editor li[data-type="taskItem"] > label { display: flex; align-items: center; gap: 8px; width: 100%; }
      .mx-editor li[data-type="taskItem"] > label > input[type="checkbox"] { margin: 0 6px 0 2px; }
      .mx-editor li[data-type="taskItem"] > label > div { flex: 1 1 auto; min-height: 1.4em; }
      .mx-editor table { border-collapse: collapse; width: 100%; margin: 8px 0; }
      .mx-editor th, .mx-editor td { border: 1px solid #e2e8f0; padding: 6px 8px; }
      .mx-editor th { background: #f1f5f9; }
      /* Lowlight (hljs) minimal colors for light theme */
      .mx-editor pre code.hljs { background: transparent; }
      .hljs-keyword, .hljs-selector-tag, .hljs-literal { color: #1d4ed8; }
      .hljs-name, .hljs-attr, .hljs-attribute { color: #b91c1c; }
      .hljs-string, .hljs-type, .hljs-number { color: #166534; }
      .hljs-title { color: #92400e; }
    `
    document.head.appendChild(style)
  }

}

function copyTextToClipboard(text: string): boolean {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    void navigator.clipboard.writeText(text)
    return true
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  try {
    const ok = document.execCommand('copy')
    return ok
  } finally {
    document.body.removeChild(ta)
  }
}

function isLikelyMarkdown(s: string): boolean {
  const t = s.trim()
  if (t.startsWith('#') || t.startsWith('>') || t.startsWith('```')) return true
  if (/^[-*+]\s+/.test(t)) return true
  if (/^\d+\.\s+/.test(t)) return true
  if (/(!?\[[^\]]+\]\([^)]+\))/.test(t)) return true
  return false
}

// TipTap provides commands; no DOM execCommand helpers needed here
