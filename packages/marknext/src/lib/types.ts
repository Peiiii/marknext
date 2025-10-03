export type CommandContext = {
  // The editable root element
  root: HTMLElement
  // Current selection range within the root if available
  range: Range | null
}

export type EditorCommand = {
  id: string
  label?: string
  run: (ctx: CommandContext) => boolean
  isEnabled?: (ctx: CommandContext) => boolean
}

export type KeymapSpec = {
  keys: string // e.g. "Mod-b", "Shift-Ctrl-7"
  command: string // command id
}

export type EditorExtension = {
  name: string
  setup?: (editor: EditorLike) => void
  commands?: EditorCommand[]
  keymap?: KeymapSpec[]
}

export type EditorEventMap = {
  update: { markdown: string; html: string }
  focus: void
  blur: void
}

export type EditorOptions = {
  element: HTMLElement
  initialMarkdown?: string
  placeholder?: string
  extensions?: EditorExtension[]
}

// Lightweight interface to avoid circular import in types
export type EditorLike = {
  getRoot(): HTMLElement
  registerCommand(cmd: EditorCommand): void
  exec(id: string): boolean
  getMarkdown(): string
  setMarkdown(markdown: string): void
  on<K extends keyof EditorEventMap>(event: K, fn: (payload: EditorEventMap[K]) => void): () => void
}

