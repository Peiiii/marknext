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
      const view = (tiptap as unknown as { view: { coordsAtPos: (pos: number) => { left: number; top: number; bottom: number; right: number }, nodeDOM: (pos: number) => Node } }).view
      const dom = view.nodeDOM(from) as HTMLElement
      if (dom && dom.getBoundingClientRect) {
        const rect = dom.getBoundingClientRect()
        const left = Math.min(rect.right - 120, Math.max(rect.left + 8, 8))
        const top = Math.max(8, rect.top - 34)
        setPos({ x: left, y: top })
      } else {
        const coords = view.coordsAtPos(from + 1)
        setPos({ x: coords.left, y: Math.max(8, coords.top - 34) })
      }
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
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 60, display: 'flex' }}
    >
      <select
        value={lang}
        onChange={(e) => {
          const v = e.target.value
          setLang(v)
          tiptap.chain().focus().updateAttributes('codeBlock', { language: v === 'plaintext' ? null : v }).run()
        }}
        style={{
          background: '#ffffff',
          color: '#0f172a',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          padding: '2px 6px',
          fontSize: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
    </div>
  )
}
