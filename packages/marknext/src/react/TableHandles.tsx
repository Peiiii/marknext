import { useCallback, useEffect, useState } from 'react'
import type { Editor } from '../lib/Editor'

type Props = { editor: Editor }

type Pos = { x: number; y: number }

export function TableHandles({ editor }: Props) {
  const [cellRect, setCellRect] = useState<DOMRect | null>(null)
  const [rowMenuPos, setRowMenuPos] = useState<Pos | null>(null)
  const [colMenuPos, setColMenuPos] = useState<Pos | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [hideTimeout, setHideTimeout] = useState<number | null>(null)
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
    const onMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const table = target.closest('table')
      if (table) {
        setIsHovering(true)
        if (hideTimeout) {
          clearTimeout(hideTimeout)
          setHideTimeout(null)
        }
      }
    }
    const onMouseLeave = () => {
      const timeout = setTimeout(() => {
        setIsHovering(false)
      }, 300)
      setHideTimeout(timeout)
    }
    
    document.addEventListener('selectionchange', onSel)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    compute()
    return () => {
      off()
      if (hideTimeout) clearTimeout(hideTimeout)
      document.removeEventListener('selectionchange', onSel)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [editor, compute, hideTimeout])

  const tiptap = editor.getTiptap()
  const chain = () => tiptap.chain().focus()

  if (!cellRect || !isHovering) return null

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
      style={{ 
        padding: '6px 12px', 
        fontSize: 13, 
        border: 'none', 
        background: 'rgba(0,0,0,0.8)', 
        color: '#fff', 
        borderRadius: 4, 
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontWeight: 500
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0,0,0,0.9)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(0,0,0,0.8)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >{props.label}</button>
  )

  return (
    <>
      {/* Row handle */}
      <button
        type="button"
        style={{ 
          position: 'fixed', 
          left: rowHandle.x, 
          top: rowHandle.y, 
          transform: 'translate(-50%, -50%)', 
          width: 8, 
          height: 16, 
          borderRadius: 2, 
          background: 'rgba(0,0,0,0.6)', 
          border: 'none', 
          cursor: 'pointer', 
          zIndex: 60, 
          opacity: 1,
          transition: 'opacity 0.2s ease'
        }}
        onClick={() => setRowMenuPos({ x: rowHandle.x + 18, y: rowHandle.y })}
        aria-label="Row actions"
      />
      {rowMenuPos && (
        <div
          style={{ 
            position: 'fixed', 
            left: rowMenuPos.x, 
            top: rowMenuPos.y, 
            transform: 'translateY(-50%)', 
            display: 'flex', 
            gap: 4, 
            background: 'rgba(0,0,0,0.9)', 
            border: 'none', 
            borderRadius: 6, 
            padding: 4, 
            zIndex: 61, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)'
          }}
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
        style={{ 
          position: 'fixed', 
          left: colHandle.x, 
          top: colHandle.y, 
          transform: 'translate(-50%, -50%)', 
          width: 16, 
          height: 8, 
          borderRadius: 2, 
          background: 'rgba(0,0,0,0.6)', 
          border: 'none', 
          cursor: 'pointer', 
          zIndex: 60, 
          opacity: 1,
          transition: 'opacity 0.2s ease'
        }}
        onClick={() => setColMenuPos({ x: colHandle.x, y: colHandle.y + 18 })}
        aria-label="Column actions"
      />
      {colMenuPos && (
        <div
          style={{ 
            position: 'fixed', 
            left: colMenuPos.x, 
            top: colMenuPos.y, 
            transform: 'translate(-50%, 0)', 
            display: 'flex', 
            gap: 4, 
            background: 'rgba(0,0,0,0.9)', 
            border: 'none', 
            borderRadius: 6, 
            padding: 4, 
            zIndex: 61, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(8px)'
          }}
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
