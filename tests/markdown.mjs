import test from 'node:test'
import assert from 'node:assert/strict'
import { markdownToHtml } from '../packages/marknext/dist/lib/markdown.js'

test('bold and italic', () => {
  const html = markdownToHtml('**bold** and *em*')
  assert.match(html, /<strong>bold<\/strong>/)
  assert.match(html, /<em>em<\/em>/)
})

test('unordered list', () => {
  const html = markdownToHtml('- a\n- b')
  assert.match(html, /<ul>\s*<li>a<\/li>\s*<li>b<\/li>\s*<\/ul>/)
})

test('task list', () => {
  const html = markdownToHtml('- [ ] todo\n- [x] done')
  assert.match(html, /<ul class=\"task-list\"/)
  assert.match(html, /<input type=\"checkbox\"[^>]*>[\s\S]*?todo/)
  assert.match(html, /<input type=\"checkbox\" checked[^>]*>[\s\S]*?done/)
})

test('blockquote', () => {
  const html = markdownToHtml('> quote line')
  assert.match(html, /<blockquote><p>quote line<\/p><\/blockquote>/)
})

test('hr', () => {
  const html = markdownToHtml('---')
  assert.equal(html.trim(), '<hr/>')
})
