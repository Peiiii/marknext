import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
// Minimal NodeView shape (avoid importing generics types)
type MinimalNodeView = { dom: HTMLElement; contentDOM?: HTMLElement }

export const CodeBlockWithHeader = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      // Wrapper
      const wrapper = document.createElement('div')
      wrapper.className = 'mx-codeblock'

      // Header with language select
      const header = document.createElement('div')
      header.className = 'mx-codeblock__header'
      const select = document.createElement('select')
      select.className = 'mx-codeblock__lang'
      const langs = ['plaintext','js','ts','json','html','css','bash','python','go','rust']
      langs.forEach((l) => {
        const opt = document.createElement('option')
        opt.value = l
        opt.textContent = l
        select.appendChild(opt)
      })
      const currentLang = (node.attrs as { language?: string }).language || 'plaintext'
      select.value = currentLang
      header.appendChild(select)

      // Content area
      const pre = document.createElement('pre')
      const code = document.createElement('code')
      pre.appendChild(code)

      wrapper.appendChild(header)
      wrapper.appendChild(pre)

      select.addEventListener('change', () => {
        const pos = getPos()
        if (typeof pos !== 'number') return
        editor.commands.command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, language: select.value === 'plaintext' ? null : select.value })
          return true
        })
      })

      const view: MinimalNodeView = {
        dom: wrapper,
        contentDOM: code,
      }
      return view
    }
  },
})
