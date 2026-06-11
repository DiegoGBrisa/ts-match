import type { Rule } from 'eslint'

const FORBIDDEN_IGNORE_MARKERS = ['eslint-disable', 'biome-ignore', 'fallow-ignore', 'SAFETY:']

export const noRuleBypassCommentsRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'forbid lint and architecture bypass comments',
    },
    messages: {
      forbiddenIgnore:
        'Repository rules must not be bypassed with eslint-disable, biome-ignore, fallow-ignore, or SAFETY comments.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!comment.loc) continue
          if (!FORBIDDEN_IGNORE_MARKERS.some((marker) => comment.value.includes(marker))) continue

          context.report({ loc: comment.loc, messageId: 'forbiddenIgnore' })
        }
      },
    }
  },
}
