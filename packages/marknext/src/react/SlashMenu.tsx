import { useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '../lib/Editor'

type SlashMenuProps = {
  editor: Editor
}

type Option = {
  id: string
  label: string
}

const OPTIONS: Option[] = [
  { id: 'setParagraph', label: 'Paragraph' },
  { id: 'setHeading1', label: 'Heading 1' },
  { id: 'setHeading2', label: 'Heading 2' },
  { id: 'setHeading3', label: 'Heading 3' },
  { id: 'toggleBulletList', label: 'Bullet List' },
  { id: 'toggleOrderedList', label: 'Ordered List' },
  { id: 'toggleTaskList', label: 'Task List' },
  { id: 'toggleBlockquote', label: 'Blockquote' },
  { id: 'toggleCodeBlock', label: 'Code Block' },
  { id: 'setCodeBlockLanguage', label: 'Set Code Language' },
  { id: 'insertHorizontalRule', label: 'Horizontal Rule' },
  { id: 'insertImage', label: 'Image (URL)' },
  { id: 'insertTable', label: 'Table 3x3' },
]

export function SlashMenu({ editor }: SlashMenuProps) {
  const [open, setOpen] = useState<boolean>(false)
  const [filter, setFilter] = useState<string>('')
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [selIndex, setSelIndex] = useState<number>(0)
  const [menuTop, setMenuTop] = useState<number>(0)
  const [menuLeft, setMenuLeft] = useState<number>(0)
  const root = editor.getRoot()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const slashPosRef = useRef<number | null>(null)

  const filtered = useMemo(() => {
    const list = OPTIONS
    if (!filter) return list
    const q = filter.toLowerCase()
    return list.filter((o) => o.label.toLowerCase().includes(q))
  }, [filter])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!root.contains(e.target as Node)) return
      const tiptap = editor.getTiptap()
      if (e.key === '/') {
        const sel = tiptap.state.selection
        const { from } = sel
        // Predict position after '/' insertion
        const start = from + 1
        slashPosRef.current = start
        const coords = tiptap.view.coordsAtPos(start)
        setPos({ x: coords.left, y: coords.bottom })
        setFilter('')
        setSelIndex(0)
        setOpen(true)
      } else if (open && (e.key === 'ArrowDown' || e.key === 'Tab')) {
        e.preventDefault()
        setSelIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)))
      } else if (open && e.key === 'ArrowUp') {
        e.preventDefault()
        setSelIndex((i) => Math.max(0, i - 1))
      } else if (open && e.key === 'Enter') {
        e.preventDefault()
        const option = filtered[selIndex]
        if (option) apply(option.id)
      } else if (open && e.key === 'Escape') {
        setOpen(false)
      } else if (open) {
        // Build filter from letters/numbers/backspace
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          setFilter((s) => s + e.key)
        } else if (e.key === 'Backspace') {
          setFilter((s) => s.slice(0, -1))
        }
      }
    }
    const onClick = (e: MouseEvent) => {
      if (!open) return
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('mousedown', onClick, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('mousedown', onClick, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered, selIndex, root, editor])

  const apply = (id: string) => {
    // remove the '/'+filter typed
    const tiptap = editor.getTiptap()
    const end = tiptap.state.selection.from
    const start = (slashPosRef.current ?? end) - 1 // include '/'
    tiptap.chain().focus().deleteRange({ from: start, to: end }).run()
    editor.exec(id)
    setOpen(false)
  }

  // Recompute menu placement to avoid overflow
  if (open && menuRef.current) {
    const rect = menuRef.current.getBoundingClientRect()
    const margin = 8
    const availableBelow = window.innerHeight - pos.y
    const top = availableBelow < rect.height + margin ? pos.y - rect.height - margin : pos.y + margin
    const maxLeft = Math.max(8, Math.min(pos.x, window.innerWidth - rect.width - 8))
    if (top !== menuTop) setMenuTop(top)
    if (maxLeft !== menuLeft) setMenuLeft(maxLeft)
  }

  if (!open) return null
  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: menuLeft || pos.x,
        top: menuTop || pos.y + 6,
        background: '#111827',
        color: '#e5e7eb',
        borderRadius: 8,
        padding: 6,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        zIndex: 50,
        minWidth: 220,
        maxHeight: 280,
        overflowY: 'auto',
      }}
    >
      {filtered.map((o, i) => (
        <button
          key={o.id}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '6px 8px',
            borderRadius: 6,
            background: i === selIndex ? '#374151' : 'transparent',
            border: '1px solid #374151',
            color: '#e5e7eb',
            marginBottom: 4,
          }}
          onMouseEnter={() => setSelIndex(i)}
          onClick={() => apply(o.id)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
