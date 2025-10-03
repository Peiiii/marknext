import { useEffect, useRef, useState } from 'react'
import type { Editor } from '../lib/Editor'

const LANGS = ['plaintext','js','ts','json','html','css','bash','python','go','rust'] as const

type Props = { editor: Editor }

export function CodeBlockToolbar({ editor }: Props) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [lang, setLang] = useState<string>('plaintext')
  const ref = useRef<HTMLDivElement | null>(null)

  const tiptap = editor.getTiptap()

  const update = () => {
    const isCode = tiptap.isActive('codeBlock')
    setVisible(isCode)
    if (!isCode) return
    // Find codeBlock depth and pos
    const { $from } = tiptap.state.selection
    let depth: number | null = null
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === 'codeBlock') { depth = d; break }
    }
    if (depth != null) {
      const from = $from.before(depth)
      const view: { coordsAtPos: (pos: number) => { left: number; top: number } } = (tiptap as unknown as { view: { coordsAtPos: (pos: number) => { left: number; top: number } } }).view
      const coords = view.coordsAtPos(from + 1)
      setPos({ x: coords.left, y: coords.top - 8 })
      const attrs = $from.node(depth).attrs as { language?: string }
      setLang(attrs.language || 'plaintext')
    }
  }

  useEffect(() => {
    const off = editor.on('update', () => update())
    document.addEventListener('selectionchange', update)
    update()
    return () => {
      off()
      document.removeEventListener('selectionchange', update)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visible) return null
  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: pos.x, top: pos.y, background: '#111827', color: '#e5e7eb', borderRadius: 8, padding: 6, display: 'flex', gap: 6, zIndex: 60 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, opacity: 0.8 }}>Language</span>
        <select
          value={lang}
          onChange={(e) => {
            const v = e.target.value
            setLang(v)
            tiptap.chain().focus().updateAttributes('codeBlock', { language: v === 'plaintext' ? null : v }).run()
          }}
          style={{ background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 6, padding: '2px 6px' }}
        >
          {LANGS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
