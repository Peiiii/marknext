// Minimal Markdown <-> HTML helpers for MVP. Not complete; designed to be extended.


export const markdownToHtml = (md: string): string => {
  // Normalize line endings
  let src = md.replace(/\r\n?/g, '\n').trim()

  // Fenced code blocks ```
  src = src.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (_m, lang, code) => {
    const langAttr = lang ? ` data-lang="${lang}"` : ''
    return `<pre><code${langAttr}>${escapeHtml(code)}</code></pre>`
  })

  // Headings ######
  src = src.replace(/^(#{1,6})\s+(.+)$/gm, (_m, h, text) => {
    const level = (h as string).length
    return `<h${level}>${inlineToHtml(text)}</h${level}>`
  })

  // Ordered lists
  src = src.replace(/(^|\n)(\d+\.\s+.+(?:\n\d+\.\s+.+)*)/g, (_m, lead, block) => {
    const items = (block as string)
      .split(/\n/)
      .map((line: string) => line.replace(/\d+\.\s+/, '').trim())
      .map((t: string) => `<li>${inlineToHtml(t)}</li>`) // inline
      .join('')
    return `${lead}<ol>${items}</ol>`
  })

  // Unordered lists
  src = src.replace(/(^|\n)([-*]\s+.+(?:\n[-*]\s+.+)*)/g, (_m, lead, block) => {
    const lines = (block as string).split(/\n/)
    const isTask = lines.every((l) => /^[-*]\s+\[[ xX]\]\s+/.test(l))
    const items = lines
      .map((line: string) => line.replace(/^[-*]\s+/, '').trim())
      .map((t: string) => {
        const m = t.match(/^\[([ xX])\]\s+(.+)/)
        if (m) {
          const checked = m[1].toLowerCase() === 'x'
          const label = inlineToHtml(m[2])
          return `<li data-task="true"><input type="checkbox" ${checked ? 'checked ' : ''}/> ${label}</li>`
        }
        return `<li>${inlineToHtml(t)}</li>`
      })
      .join('')
    const ulClass = isTask ? ' class="task-list"' : ''
    return `${lead}<ul${ulClass}>${items}</ul>`
  })

  // Horizontal rule
  src = src.replace(/^(?:-{3,}|\*{3,}|_{3,})$/gm, '<hr/>')

  // Blockquote (single-paragraph)
  src = src.replace(/(^|\n)>(?:\s?)(.+)(?=\n|$)/g, (_m, lead, text) => {
    return `${lead}<blockquote><p>${inlineToHtml(String(text).trim())}</p></blockquote>`
  })

  // Paragraphs: wrap remaining non-empty lines
  src = src
    .split(/\n{2,}/)
    .map((para) => {
      // Already contains block tags? leave as-is
      if (/(<h\d|<pre>|<ul>|<ol>|<blockquote>)/.test(para)) return para
      const lines = para
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean)
      if (!lines.length) return ''
      return `<p>${inlineToHtml(lines.join(' '))}</p>`
    })
    .join('\n')

  // Cleanup: ensure block elements are not wrapped by <p> due to edge cases
  src = src
    .replace(/<p>(\s*<ul[\s\S]*?<\/ul>)<\/p>/g, '$1')
    .replace(/<p>(\s*<ol[\s\S]*?<\/ol>)<\/p>/g, '$1')
    .replace(/<p>(\s*<blockquote>[\s\S]*?<\/blockquote>)<\/p>/g, '$1')
    .replace(/<p>\s*(<hr\/>)+\s*<\/p>/g, '$1')

  return src
}

const inlineToHtml = (text: string): string => {
  // Inline code
  let out = text.replace(/`([^`]+)`/g, (_m, code) => `<code>${escapeHtml(code)}</code>`)
  // Bold **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // Italic *text*
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // Links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  return out
}

export const htmlToMarkdown = (html: string): string => {
  // Parse as DOM and walk nodes
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const parts: string[] = []
  doc.body.childNodes.forEach((node) => {
    parts.push(nodeToMd(node))
  })
  return parts.filter(Boolean).join('\n\n')
}

const nodeToMd = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').replace(/\s+/g, ' ')
  }
  if (!(node instanceof HTMLElement)) return ''
  const tag = node.tagName.toLowerCase()
  switch (tag) {
    case 'p':
      return inlineToMd(node)
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = Number(tag[1])
      return `${'#'.repeat(level)} ${inlineToMd(node)}`
    }
    case 'ul': {
      const items = [...node.children]
        .filter((el): el is HTMLLIElement => el.tagName.toLowerCase() === 'li')
        .map((li) => {
          const input = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null
          if (input) {
            const checked = input.checked ? 'x' : ' '
            const label = inlineToMd(li).replace(/^\s*\[.*\]\s*/, '')
            return `- [${checked}] ${label}`
          }
          return `- ${inlineToMd(li)}`
        })
      return items.join('\n')
    }
    case 'ol': {
      let i = 1
      const items = [...node.children]
        .filter((el): el is HTMLLIElement => el.tagName.toLowerCase() === 'li')
        .map((li) => `${i++}. ${inlineToMd(li)}`)
      return items.join('\n')
    }
    case 'pre': {
      const code = node.querySelector('code')
      const raw = code?.textContent ?? ''
      const lang = code?.getAttribute('data-lang')
      return `\n\n\`\`\`${lang ?? ''}\n${raw}\n\`\`\``
    }
    default:
      return inlineToMd(node)
  }
}

const inlineToMd = (el: Element): string => {
  let out = ''
  el.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      out += n.textContent ?? ''
      return
    }
    if (!(n instanceof HTMLElement)) return
    const tag = n.tagName.toLowerCase()
    switch (tag) {
      case 'strong':
        out += `**${inlineToMd(n)}**`
        break
      case 'em':
        out += `*${inlineToMd(n)}*`
        break
      case 'code':
        out += `\`${n.textContent ?? ''}\``
        break
      case 'a': {
        const href = n.getAttribute('href') ?? ''
        out += `[${inlineToMd(n)}](${href})`
        break
      }
      case 'br':
        out += '  \n'
        break
      default:
        out += inlineToMd(n)
    }
  })
  return out
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
