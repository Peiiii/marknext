import { useEffect, useRef, useState } from 'react'
import type { Editor } from '../lib/Editor'

type Props = { editor: Editor }

export function SelectionBubble({ editor }: Props) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const elRef = useRef<HTMLDivElement | null>(null)
  const root = editor.getRoot()

  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) {
        setVisible(false)
        return
      }
      if (sel.isCollapsed) {
        setVisible(false)
        return
      }
      const range = sel.getRangeAt(0)
      if (!root.contains(range.commonAncestorContainer)) {
        setVisible(false)
        return
      }
      const rect = range.getBoundingClientRect()
      setPos({ x: rect.left + rect.width / 2, y: rect.top })
      setVisible(true)
    }
    document.addEventListener('selectionchange', onSel)
    window.addEventListener('scroll', onSel, true)
    return () => {
      document.removeEventListener('selectionchange', onSel)
      window.removeEventListener('scroll', onSel, true)
    }
  }, [root])

  if (!visible) return null
  return (
    <div
      ref={elRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y - 44,
        transform: 'translateX(-50%)',
        background: '#111827',
        color: '#e5e7eb',
        borderRadius: 8,
        padding: 6,
        display: 'flex',
        gap: 6,
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        zIndex: 50,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button onClick={() => editor.exec('toggleBold')}>B</button>
      <button onClick={() => editor.exec('toggleItalic')}>I</button>
      <button onClick={() => editor.exec('toggleUnderline')}>U</button>
      <button onClick={() => editor.exec('toggleCode')}>`</button>
      <button onClick={() => editor.exec('toggleBlockquote')}>&gt;</button>
      <button onClick={() => editor.exec('insertLink')}>Link</button>
    </div>
  )
}

