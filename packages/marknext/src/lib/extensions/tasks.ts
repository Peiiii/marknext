import type { EditorExtension } from '../types'

// Enable easier toggling of checkbox when clicking list item label area
export const tasksExtension: EditorExtension = {
  name: 'tasks',
  setup(editor) {
    const root = editor.getRoot()
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const li = target.closest('li')
      if (!li) return
      const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null
      if (!checkbox) return
      // If click is not directly on the input, toggle it programmatically
      if (target !== checkbox) {
        checkbox.checked = !checkbox.checked
        checkbox.dispatchEvent(new Event('input', { bubbles: true }))
        checkbox.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
    root.addEventListener('click', onClick)
  },
}

