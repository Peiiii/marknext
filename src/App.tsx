import './App.css'
import { MarkdownEditor, linksExtension, tasksExtension } from 'marknext'
import { useState } from 'react'

export default function App() {
  const [md, setMd] = useState<string>('# Marknext\n\n- Built-in bold/italic/code\n- Lists and headings\n\nTry keyboard: Cmd/Ctrl+B, Cmd/Ctrl+I, Cmd/Ctrl+`')
  return (
    <div>
      <h1>Marknext Playground</h1>
      <MarkdownEditor defaultMarkdown={md} onChange={setMd} extensions={[linksExtension, tasksExtension]} />
    </div>
  )
}
