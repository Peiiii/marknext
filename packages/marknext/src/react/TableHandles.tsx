import { useCallback, useEffect, useState, useMemo } from 'react'
import type { Editor } from '../lib/Editor'

// Constants for better maintainability
const HANDLE_DIMENSIONS = {
  ROW: { width: 8, height: 24 },
  COLUMN: { width: 24, height: 8 },
  BORDER_RADIUS: 4,
} as const

const HANDLE_STYLES = {
  BACKGROUND: 'rgba(0,0,0,0.6)',
  SHADOW: '0 1px 3px rgba(0,0,0,0.3)',
  Z_INDEX: 60,
  TRANSITION: 'opacity 0.2s ease',
} as const

const MENU_STYLES = {
  BACKGROUND: 'rgba(0,0,0,0.9)',
  SHADOW: '0 4px 12px rgba(0,0,0,0.3)',
  Z_INDEX: 61,
  BORDER_RADIUS: 6,
  PADDING: 4,
  GAP: 4,
  BACKDROP_FILTER: 'blur(8px)',
} as const

const MENU_BUTTON_STYLES = {
  PADDING: '6px 12px',
  FONT_SIZE: 13,
  BACKGROUND: 'rgba(0,0,0,0.8)',
  BACKGROUND_HOVER: 'rgba(0,0,0,0.9)',
  COLOR: '#fff',
  BORDER_RADIUS: 4,
  FONT_WEIGHT: 500,
  TRANSITION: 'all 0.2s ease',
} as const

const POSITION_OFFSETS = {
  MIN_EDGE_DISTANCE: 8,
  MENU_OFFSET: 18,
} as const

// Types for better type safety
type Props = { editor: Editor }
type Position = { x: number; y: number }
type HandleType = 'row' | 'column'
type MenuAction = {
  label: string
  command: () => void
}

// Custom hook for cell detection and positioning
function useCellDetection(editor: Editor) {
  const [cellRect, setCellRect] = useState<DOMRect | null>(null)
  const root = editor.getRoot()

  const compute = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      setCellRect(null)
      return
    }

    const anchor = sel.anchorNode as Node | null
    if (!anchor) {
      setCellRect(null)
      return
    }

    const cell = (anchor instanceof HTMLElement ? anchor : anchor.parentElement)?.closest('td,th') as HTMLElement | null
    if (!cell || !root.contains(cell)) {
      setCellRect(null)
      return
    }

    setCellRect(cell.getBoundingClientRect())
  }, [root])

  useEffect(() => {
    const off = editor.on('update', compute)
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

  return cellRect
}

// Custom hook for handle positioning
function useHandlePositions(cellRect: DOMRect | null) {
  return useMemo(() => {
    if (!cellRect) return { rowHandle: null, colHandle: null }

    const cellEl = document.elementFromPoint(cellRect.left + 1, cellRect.top + 1)?.closest('td,th') as HTMLElement | null
    const tableEl = cellEl?.closest('table') as HTMLElement | null
    const tableRect = tableEl?.getBoundingClientRect() ?? cellRect

    const rowHandle: Position = {
      x: Math.max(POSITION_OFFSETS.MIN_EDGE_DISTANCE, tableRect.left),
      y: cellRect.top + cellRect.height / 2
    }

    const colHandle: Position = {
      x: cellRect.left + cellRect.width / 2,
      y: Math.max(POSITION_OFFSETS.MIN_EDGE_DISTANCE, tableRect.top)
    }

    return { rowHandle, colHandle }
  }, [cellRect])
}

// Reusable style objects
const createHandleStyle = (position: Position, type: HandleType): React.CSSProperties => {
  const dimensions = type === 'row' ? HANDLE_DIMENSIONS.ROW : HANDLE_DIMENSIONS.COLUMN
  
  return {
    position: 'fixed',
    left: position.x,
    top: position.y,
    transform: 'translate(-50%, -50%)',
    width: dimensions.width,
    height: dimensions.height,
    borderRadius: HANDLE_DIMENSIONS.BORDER_RADIUS,
    background: HANDLE_STYLES.BACKGROUND,
    border: 'none',
    cursor: 'pointer',
    zIndex: HANDLE_STYLES.Z_INDEX,
    opacity: 1,
    transition: HANDLE_STYLES.TRANSITION,
    boxShadow: HANDLE_STYLES.SHADOW,
    padding: 0,
    boxSizing: 'border-box',
  }
}

const menuStyle: React.CSSProperties = {
  position: 'fixed',
  display: 'flex',
  gap: MENU_STYLES.GAP,
  background: MENU_STYLES.BACKGROUND,
  border: 'none',
  borderRadius: MENU_STYLES.BORDER_RADIUS,
  padding: MENU_STYLES.PADDING,
  zIndex: MENU_STYLES.Z_INDEX,
  boxShadow: MENU_STYLES.SHADOW,
  backdropFilter: MENU_STYLES.BACKDROP_FILTER,
}

const menuButtonStyle: React.CSSProperties = {
  padding: MENU_BUTTON_STYLES.PADDING,
  fontSize: MENU_BUTTON_STYLES.FONT_SIZE,
  border: 'none',
  background: MENU_BUTTON_STYLES.BACKGROUND,
  color: MENU_BUTTON_STYLES.COLOR,
  borderRadius: MENU_BUTTON_STYLES.BORDER_RADIUS,
  cursor: 'pointer',
  transition: MENU_BUTTON_STYLES.TRANSITION,
  fontWeight: MENU_BUTTON_STYLES.FONT_WEIGHT,
}

// Menu button component
const MenuButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    style={menuButtonStyle}
    onClick={onClick}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = MENU_BUTTON_STYLES.BACKGROUND_HOVER
      e.currentTarget.style.transform = 'translateY(-1px)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = MENU_BUTTON_STYLES.BACKGROUND
      e.currentTarget.style.transform = 'translateY(0)'
    }}
  >
    {label}
  </button>
)

// Menu component
const Menu = ({ 
  position, 
  onClose, 
  actions, 
  transform = 'translateY(-50%)' 
}: { 
  position: Position
  onClose: () => void
  actions: MenuAction[]
  transform?: string
}) => (
  <div
    style={{
      ...menuStyle,
      left: position.x,
      top: position.y,
      transform,
    }}
    onMouseLeave={onClose}
  >
    {actions.map((action, index) => (
      <MenuButton
        key={index}
        label={action.label}
        onClick={() => {
          action.command()
          onClose()
        }}
      />
    ))}
  </div>
)

export function TableHandles({ editor }: Props) {
  const [rowMenuPos, setRowMenuPos] = useState<Position | null>(null)
  const [colMenuPos, setColMenuPos] = useState<Position | null>(null)
  
  const cellRect = useCellDetection(editor)
  const { rowHandle, colHandle } = useHandlePositions(cellRect)
  
  const tiptap = editor.getTiptap()
  const chain = () => tiptap.chain().focus()

  // Menu actions configuration
  const rowActions: MenuAction[] = [
    { label: '+Above', command: () => chain().addRowBefore().run() },
    { label: '+Below', command: () => chain().addRowAfter().run() },
    { label: 'DelRow', command: () => chain().deleteRow().run() },
    { label: 'Header', command: () => chain().toggleHeaderRow().run() },
  ]

  const colActions: MenuAction[] = [
    { label: '+Left', command: () => chain().addColumnBefore().run() },
    { label: '+Right', command: () => chain().addColumnAfter().run() },
    { label: 'DelCol', command: () => chain().deleteColumn().run() },
    { label: 'Header', command: () => chain().toggleHeaderColumn().run() },
  ]

  if (!cellRect || !rowHandle || !colHandle) return null

  return (
    <>
      {/* Row handle */}
      <button
        type="button"
        style={createHandleStyle(rowHandle, 'row')}
        onClick={() => setRowMenuPos({ 
          x: rowHandle.x + POSITION_OFFSETS.MENU_OFFSET, 
          y: rowHandle.y 
        })}
        aria-label="Row actions"
      />
      
      {/* Column handle */}
      <button
        type="button"
        style={createHandleStyle(colHandle, 'column')}
        onClick={() => setColMenuPos({ 
          x: colHandle.x, 
          y: colHandle.y + POSITION_OFFSETS.MENU_OFFSET 
        })}
        aria-label="Column actions"
      />
      
      {/* Row menu */}
      {rowMenuPos && (
        <Menu
          position={rowMenuPos}
          onClose={() => setRowMenuPos(null)}
          actions={rowActions}
        />
      )}

      {/* Column menu */}
      {colMenuPos && (
        <Menu
          position={colMenuPos}
          onClose={() => setColMenuPos(null)}
          actions={colActions}
          transform="translate(-50%, 0)"
        />
      )}
    </>
  )
}