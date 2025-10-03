import { wrappingInputRule } from '@tiptap/core'
import TaskItem from '@tiptap/extension-task-item'

// Trigger at line start for: "- [ ] ", "* [ ] ", and also "[] " / "[x] "
const strictTaskRegexBullet = /^\s*[-*]\s\[([ xX])\]\s$/
// Accept empty brackets: "[] " -> unchecked
const strictTaskRegexBare = /^\s*\[([ xX]?)\]\s$/

export const TaskItemStrict = TaskItem.extend({
  addInputRules() {
    return [
      wrappingInputRule({
        find: strictTaskRegexBullet,
        type: this.type,
        getAttributes: (match) => ({ checked: String(match[1]).toLowerCase() === 'x' }),
      }),
      wrappingInputRule({
        find: strictTaskRegexBare,
        type: this.type,
        getAttributes: (match) => ({ checked: String(match[1]).toLowerCase() === 'x' }),
      }),
    ]
  },
})
