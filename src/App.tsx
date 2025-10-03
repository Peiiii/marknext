import './App.css'
import { MarkdownEditor } from 'marknext'
import { useRef, useState } from 'react'
import type { MarkdownEditorHandle } from '../packages/marknext/src/react/MarkdownEditor'
import type React from 'react'

const SAMPLE_MD = `# Marknext Playground

Welcome! This sandbox preloads a rich sample so you can try features fast.

## Inline Styles
- Bold: **strong**  | Italic: *emphasis*  | Underline: <u>underline</u>  | Strike: ~~strike~~  | Code: \`inline code\`
- Link: [OpenAI](https://openai.com) and <https://example.com>

## Lists
- Bullet A
  - Nested A.1
  - Nested A.2
- Bullet B

| Name | Role | Note |
| ---- | ---- | ---- |
| Alice | Admin | Active |
| Bob | User | Pending |

1. Ordered 1
2. Ordered 2
   1. Sub 2.1

## Task List
- [ ] Todo item
- [x] Done item
- [ ] Another todo

## Blockquote
> Quote line 1
> Quote line 2

---

## Code Block (js)
\`\`\`js
function hello(name){
  console.log('Hello, ' + name)
}
hello('Marknext')
\`\`\`

## Horizontal Rule
---

## Image
![Sea](https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800)

## Tips
- Type "/" to open slash menu (blocks, lists, hr, image, table, code…)
- Cmd/Ctrl+B/I/U/\` toggle marks; Shift+Ctrl+7/8/9 for lists; Cmd/Ctrl+Shift+-> quote; Cmd/Ctrl+Shift+-- hr
- Paste Markdown: Cmd/Ctrl+Shift+V; Paste Plain: Cmd/Ctrl+Alt+V; Copy Markdown: Cmd/Ctrl+Shift+C
`

export default function App() {
  const [md, setMd] = useState<string>(SAMPLE_MD)
  const editorRef = useRef<MarkdownEditorHandle | null>(null)

  const loadSample = () => {
    const ed = editorRef.current?.getEditor()
    if ( ed) ed.setMarkdown(SAMPLE_MD)
    setMd(SAMPLE_MD)
  }

  const clearAll = () => {
    const ed = editorRef.current?.getEditor()
    if (ed) ed.setMarkdown('')
    setMd('')
  }

  const copyMd = () => editorRef.current?.getEditor()?.exec('copyAsMarkdown')

  return (
    <div>
      <h1>Marknext Playground</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={loadSample}>Load Sample</button>
        <button onClick={clearAll}>Clear</button>
        <button onClick={copyMd}>Copy Markdown</button>
      </div>
      <MarkdownEditor ref={editorRef as unknown as React.RefObject<MarkdownEditorHandle>} defaultMarkdown={md} onChange={setMd} />
    </div>
  )
}
