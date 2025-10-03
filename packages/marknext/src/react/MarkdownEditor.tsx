import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Editor } from '../lib/Editor'
import type { EditorExtension, EditorOptions } from '../lib/types'
// TipTap provides link mark; custom linksExtension no longer used by default
import { SlashMenu } from './SlashMenu'
import { SelectionBubble } from './SelectionBubble'
import { CodeBlockToolbar } from './CodeBlockToolbar'
import { TableToolbar } from './TableToolbar'

export type MarkdownEditorProps = {
  defaultMarkdown?: string
  onChange?: (markdown: string) => void
  placeholder?: string
  className?: string
  extensions?: EditorExtension[]
}

export type MarkdownEditorHandle = {
  getEditor(): Editor | null
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor(props, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const editorRef = useRef<Editor | null>(null)
    const [markdown, setMarkdown] = useState<string>(props.defaultMarkdown ?? '')

    useImperativeHandle(ref, () => ({ getEditor: () => editorRef.current }), [])

    useEffect(() => {
      if (!containerRef.current) return
      const editor = new Editor({
        element: containerRef.current,
        initialMarkdown: props.defaultMarkdown ?? '',
        placeholder: props.placeholder ?? 'Start typing...',
        extensions: props.extensions ?? [],
      } satisfies EditorOptions)
      editorRef.current = editor
      const off = editor.on('update', ({ markdown }) => {
        setMarkdown(markdown)
        props.onChange?.(markdown)
      })
      return () => {
        off()
        editor.destroy()
        editorRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

  return (
      <div className={props.className}>
        <div className="mx-toolbar" style={{ marginBottom: 8 }}>
          <button type="button" onClick={() => editorRef.current?.exec('toggleBold')}>B</button>
          <button type="button" onClick={() => editorRef.current?.exec('toggleItalic')}>I</button>
          <button type="button" onClick={() => editorRef.current?.exec('toggleUnderline')}>U</button>
          <button type="button" onClick={() => editorRef.current?.exec('toggleStrike')}>S</button>
          <button type="button" onClick={() => editorRef.current?.exec('toggleCode')}>`</button>
          <button type="button" onClick={() => editorRef.current?.exec('toggleCodeBlock')}>{'</>'}</button>
          <button type="button" onClick={() => editorRef.current?.exec('toggleBulletList')}>• List</button>
          <button type="button" onClick={() => editorRef.current?.exec('toggleOrderedList')}>1. List</button>
          <button type="button" onClick={() => editorRef.current?.exec('toggleTaskList')}>[ ]</button>
          <button type="button" onClick={() => editorRef.current?.exec('toggleBlockquote')}>&gt;</button>
          <button type="button" onClick={() => editorRef.current?.exec('insertHorizontalRule')}>HR</button>
          <button type="button" onClick={() => editorRef.current?.exec('insertImage')}>IMG</button>
          <button type="button" onClick={() => editorRef.current?.exec('insertTable')}>Table</button>
          <span style={{ marginLeft: 8 }} />
          <button type="button" title="Align Left" onClick={() => editorRef.current?.exec('alignLeft')}>L</button>
          <button type="button" title="Align Center" onClick={() => editorRef.current?.exec('alignCenter')}>C</button>
          <button type="button" title="Align Right" onClick={() => editorRef.current?.exec('alignRight')}>R</button>
          <button type="button" title="Align Justify" onClick={() => editorRef.current?.exec('alignJustify')}>J</button>
          <span style={{ marginLeft: 8 }} />
          <button type="button" onClick={() => editorRef.current?.exec('copyAsMarkdown')}>Copy MD</button>
          <button type="button" onClick={() => editorRef.current?.exec('pasteMarkdown')}>Paste MD</button>
          <button type="button" onClick={() => editorRef.current?.exec('setHeading1')}>H1</button>
          <button type="button" onClick={() => editorRef.current?.exec('setHeading2')}>H2</button>
          <button type="button" onClick={() => editorRef.current?.exec('setHeading3')}>H3</button>
          <button type="button" onClick={() => editorRef.current?.exec('setParagraph')}>P</button>
        </div>
        <div ref={containerRef} />
        {editorRef.current && <SlashMenu editor={editorRef.current} />}
        {editorRef.current && <SelectionBubble editor={editorRef.current} />}
        {editorRef.current && <CodeBlockToolbar editor={editorRef.current} />}
        {editorRef.current && <TableToolbar editor={editorRef.current} />}

        {/* TODO: Bubble/Floating menu: TipTap v3 no longer ships them in @tiptap/react. */}
        <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>Markdown Preview:</div>
        <pre style={{ background: '#f8fafc', padding: 8, borderRadius: 6, overflowX: 'auto' }}>
{markdown}
        </pre>
      </div>
    )
  },
)
