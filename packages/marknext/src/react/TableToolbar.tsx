import { useEffect, useRef, useState } from 'react'
import type { Editor } from '../lib/Editor'

type Props = { editor: Editor }

export function TableToolbar({ editor }: Props) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const tiptap = editor.getTiptap()
  const ref = useRef<HTMLDivElement | null>(null)

  const update = () => {
    const isTable = tiptap.isActive('table')
    setVisible(isTable)
    if (!isTable) return
    const { $from } = tiptap.state.selection
    let depth: number | null = null
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === 'table') { depth = d; break }
    }
    if (depth != null) {
      const from = $from.before(depth)
      const view = (tiptap as unknown as { view: { nodeDOM: (pos: number) => Node } }).view
      const dom = view.nodeDOM(from) as HTMLElement
      if (dom && dom.getBoundingClientRect) {
        const rect = dom.getBoundingClientRect()
        const left = Math.min(rect.right - 280, Math.max(rect.left + 8, 8))
        const top = Math.max(8, rect.top - 34)
        setPos({ x: left, y: top })
      }
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
  const chain = () => tiptap.chain().focus()

  const Btn = (props: { label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={props.onClick}
      style={{ padding: '2px 6px', fontSize: 12, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6 }}
    >{props.label}</button>
  )

  return (
    <div ref={ref} style={{ position: 'fixed', left: pos.x, top: pos.y, display: 'flex', gap: 6, zIndex: 60 }}>
      <Btn label="+Row" onClick={() => chain().addRowAfter().run()} />
      <Btn label="+Col" onClick={() => chain().addColumnAfter().run()} />
      <Btn label="-Row" onClick={() => chain().deleteRow().run()} />
      <Btn label="-Col" onClick={() => chain().deleteColumn().run()} />
      <Btn label="Merge" onClick={() => chain().mergeCells().run()} />
      <Btn label="Split" onClick={() => chain().splitCell().run()} />
      <Btn label="HdrRow" onClick={() => chain().toggleHeaderRow().run()} />
      <Btn label="HdrCol" onClick={() => chain().toggleHeaderColumn().run()} />
      <Btn label="DelTable" onClick={() => chain().deleteTable().run()} />
    </div>
  )
}

