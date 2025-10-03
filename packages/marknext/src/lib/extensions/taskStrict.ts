import { wrappingInputRule } from '@tiptap/core'
import TaskItem from '@tiptap/extension-task-item'

// Only trigger on "- [ ] " or "* [ ] " at start of a line
const strictTaskRegex = /^\s*[-*]\s\[([ xX])\]\s$/

export const TaskItemStrict = TaskItem.extend({
  addInputRules() {
    return [
      wrappingInputRule({
        find: strictTaskRegex,
        type: this.type,
        getAttributes: (match) => ({ checked: String(match[1]).toLowerCase() === 'x' }),
      }),
    ]
  },
})

