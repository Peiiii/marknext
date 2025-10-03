import { useCallback, useEffect, useState } from 'react'
import type { Editor } from '../lib/Editor'

type Props = { editor: Editor }

type Pos = { x: number; y: number }

export function TableHandles({ editor }: Props) {
  const [cellRect, setCellRect] = useState<DOMRect | null>(null)
  const [rowMenuPos, setRowMenuPos] = useState<Pos | null>(null)
  const [colMenuPos, setColMenuPos] = useState<Pos | null>(null)
  const root = editor.getRoot()

  const compute = useCallback(() => {
    // Find active cell dom from selection
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) { setCellRect(null); return }
    const anchor = sel.anchorNode as Node | null
    if (!anchor) { setCellRect(null); return }
    const host = root
    const cell = (anchor instanceof HTMLElement ? anchor : anchor.parentElement)?.closest('td,th') as HTMLElement | null
    if (!cell || !host.contains(cell)) { setCellRect(null); return }
    const rect = cell.getBoundingClientRect()
    setCellRect(rect)
  }, [root])

  useEffect(() => {
    const off = editor.on('update', () => compute())
    const onSel = () => compute()
    const onScroll = () => compute()
    const onResize = () => compute()
    document.addEventListener('selectionchange', onSel)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    compute()
    return () => {
      off()
      document.removeEventListener('selectionchange', onSel)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [editor, compute])

  const tiptap = editor.getTiptap()
  const chain = () => tiptap.chain().focus()

  if (!cellRect) return null

  // Handle positions anchored to table boundaries
  const cellEl = document.elementFromPoint(cellRect.left + 1, cellRect.top + 1)?.closest('td,th') as HTMLElement | null
  const tableEl = cellEl?.closest('table') as HTMLElement | null
  const tableRect = tableEl?.getBoundingClientRect() ?? (cellRect as DOMRect)
  const rowHandle: Pos = { x: Math.max(8, tableRect.left), y: cellRect.top + cellRect.height / 2 }
  const colHandle: Pos = { x: cellRect.left + cellRect.width / 2, y: Math.max(8, tableRect.top) }

  const MenuBtn = (props: { label: string; onClick: () => void }) => (
    <button
      type="button"
      onClick={props.onClick}
      style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
    >{props.label}</button>
  )

  return (
    <>
      {/* Row handle */}
      <button
        type="button"
        style={{ position: 'fixed', left: rowHandle.x, top: rowHandle.y, transform: 'translate(-50%, -50%)', width: 12, height: 24, borderRadius: 6, background: '#2563eb', border: '1px solid #1d4ed8', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 60 }}
        onClick={() => setRowMenuPos({ x: rowHandle.x + 18, y: rowHandle.y })}
        aria-label="Row actions"
      />
      {rowMenuPos && (
        <div
          style={{ position: 'fixed', left: rowMenuPos.x, top: rowMenuPos.y, transform: 'translateY(-50%)', display: 'flex', gap: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 6, zIndex: 61, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
          onMouseLeave={() => setRowMenuPos(null)}
        >
          <MenuBtn label="+Above" onClick={() => { chain().addRowBefore().run(); setRowMenuPos(null) }} />
          <MenuBtn label="+Below" onClick={() => { chain().addRowAfter().run(); setRowMenuPos(null) }} />
          <MenuBtn label="DelRow" onClick={() => { chain().deleteRow().run(); setRowMenuPos(null) }} />
          <MenuBtn label="Header" onClick={() => { chain().toggleHeaderRow().run(); setRowMenuPos(null) }} />
        </div>
      )}

      {/* Column handle */}
      <button
        type="button"
        style={{ position: 'fixed', left: colHandle.x, top: colHandle.y, transform: 'translate(-50%, -50%)', width: 24, height: 12, borderRadius: 6, background: '#2563eb', border: '1px solid #1d4ed8', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 60 }}
        onClick={() => setColMenuPos({ x: colHandle.x, y: colHandle.y + 18 })}
        aria-label="Column actions"
      />
      {colMenuPos && (
        <div
          style={{ position: 'fixed', left: colMenuPos.x, top: colMenuPos.y, transform: 'translate(-50%, 0)', display: 'flex', gap: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 6, zIndex: 61, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
          onMouseLeave={() => setColMenuPos(null)}
        >
          <MenuBtn label="+Left" onClick={() => { chain().addColumnBefore().run(); setColMenuPos(null) }} />
          <MenuBtn label="+Right" onClick={() => { chain().addColumnAfter().run(); setColMenuPos(null) }} />
          <MenuBtn label="DelCol" onClick={() => { chain().deleteColumn().run(); setColMenuPos(null) }} />
          <MenuBtn label="Header" onClick={() => { chain().toggleHeaderColumn().run(); setColMenuPos(null) }} />
        </div>
      )}
    </>
  )
}
