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

  // Pipe tables (basic GFM style)
  src = src.replace(/(^|\n)(\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|\n?)*)/g, (_m, lead, block) => {
    const lines = String(block).trim().split(/\n/)
    if (lines.length < 2) return block
    const header = lines[0].split('|').slice(1, -1).map((s) => s.trim())
    const alignSpec = lines[1].split('|').slice(1, -1).map((s) => s.trim())
    const aligns = alignSpec.map((spec) => {
      const left = spec.startsWith(':')
      const right = spec.endsWith(':')
      if (left && right) return 'center'
      if (right) return 'right'
      if (left) return 'left'
      return 'left'
    })
    const rows = lines.slice(2).map((ln) => ln.split('|').slice(1, -1).map((s) => s.trim()))
    const thead = `<thead><tr>${header.map((h, i) => `<th style="text-align:${aligns[i]}">${inlineToHtml(h)}</th>`).join('')}</tr></thead>`
    const tbody = `<tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td style="text-align:${aligns[i]}">${inlineToHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>`
    return `${lead}<table>${thead}${tbody}</table>`
  })

  // Unordered / Task lists with 2-space nesting
  src = src.replace(/(^|\n)((?:[ \t]*[-*]\s+.*\n?)+)/g, (_m, lead, block) => {
    const lines = String(block).split(/\n/).filter(Boolean)
    type Frame = { task: boolean; indent: number; items: string[] }
    const stack: Frame[] = []
    let html = ''
    const pushRendered = (f: Frame) => `<ul${f.task ? ' class="task-list"' : ''}>${f.items.join('')}</ul>`
    for (const line of lines) {
      const m = line.match(/^(\s*)([-*])\s+(.*)$/)
      if (!m) continue
      const indent = Math.floor((m[1] ?? '').replace(/\t/g, '  ').length / 2)
      const content = m[3]
      const taskMatch = content.match(/^\[([ xX])\]\s+(.*)$/)
      const isTask = Boolean(taskMatch)
      const text = isTask ? taskMatch![2] : content
      while (stack.length && stack[stack.length - 1].indent > indent) {
        const f = stack.pop()!
        const rendered = pushRendered(f)
        if (stack.length) stack[stack.length - 1].items.push(rendered)
        else html += rendered
      }
      if (!stack.length || stack[stack.length - 1].indent < indent) {
        stack.push({ task: isTask, indent, items: [] })
      }
      const f = stack[stack.length - 1]
      const li = isTask
        ? `<li data-type="taskItem"><label><input type="checkbox" ${taskMatch![1].toLowerCase() === 'x' ? 'checked' : ''}/></label><div>${inlineToHtml(text)}</div></li>`
        : `<li>${inlineToHtml(text)}</li>`
      f.items.push(li)
    }
    while (stack.length) {
      const f = stack.pop()!
      const rendered = pushRendered(f)
      if (stack.length) stack[stack.length - 1].items.push(rendered)
      else html += rendered
    }
    return lead + html
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
      if (/(<h\d|<pre>|<ul>|<ol>|<blockquote>|<table>)/.test(para)) return para
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
    .replace(/<p>(\s*<table[\s\S]*?<\/table>)<\/p>/g, '$1')

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
