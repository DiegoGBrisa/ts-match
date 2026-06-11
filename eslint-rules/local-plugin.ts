import type { ESLint } from 'eslint'
import { noInlineMagicNumbersRule } from './rules/no-inline-magic-numbers.js'
import { noNonConstAssertionsRule } from './rules/no-non-const-assertions.js'
import { noRuleBypassCommentsRule } from './rules/no-rule-bypass-comments.js'
import { preferInferredInternalReturnTypesRule } from './rules/prefer-inferred-internal-return-types.js'

export const localPlugin: ESLint.Plugin = {
  meta: {
    name: 'ts-match-local',
  },
  rules: {
    'no-inline-magic-numbers': noInlineMagicNumbersRule,
    'no-non-const-assertions': noNonConstAssertionsRule,
    'no-rule-bypass-comments': noRuleBypassCommentsRule,
    'prefer-inferred-internal-return-types': preferInferredInternalReturnTypesRule,
  },
}
