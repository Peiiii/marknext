import type { EditorExtension } from '../types'

export const linksExtension: EditorExtension = {
  name: 'links',
  commands: [
    {
      id: 'insertLink',
      label: 'Insert Link',
      run: () => {
        const href = window.prompt('Link URL')
        if (!href) return false
        const text = window.getSelection()?.toString() || href
        const a = document.createElement('a')
        a.href = href
        a.textContent = text
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return false
        const range = sel.getRangeAt(0)
        range.deleteContents()
        range.insertNode(a)
        range.setStartAfter(a)
        range.setEndAfter(a)
        sel.removeAllRanges()
        sel.addRange(range)
        return true
      },
    },
  ],
  keymap: [{ keys: 'Mod-k', command: 'insertLink' }],
}

