import type { Rule } from 'eslint'
import { nodeType, property } from '../ast-helpers.js'

const ASSERTION_MESSAGE = 'Avoid TypeScript assertions. Only `as const` is allowed.'
const ANGLE_BRACKET_MESSAGE = 'Avoid angle-bracket TypeScript assertions. Only `as const` is allowed.'
const NON_NULL_MESSAGE = 'Avoid non-null assertions. Narrow or validate the value instead.'
const DEFINITE_ASSIGNMENT_MESSAGE = 'Avoid definite-assignment assertions. Model initialization explicitly instead.'

function isConstAssertion(node: Rule.Node) {
  const annotation = property(node, 'typeAnnotation')
  const typeName = property(annotation, 'typeName')

  return (
    nodeType(annotation) === 'TSTypeReference' &&
    nodeType(typeName) === 'Identifier' &&
    property(typeName, 'name') === 'const'
  )
}

export const noNonConstAssertionsRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'forbid TypeScript assertion escapes except `as const`',
    },
    messages: {
      assertion: ASSERTION_MESSAGE,
      angleBracket: ANGLE_BRACKET_MESSAGE,
      nonNull: NON_NULL_MESSAGE,
      definiteAssignment: DEFINITE_ASSIGNMENT_MESSAGE,
    },
    schema: [],
  },
  create(context) {
    return {
      TSAsExpression(node: Rule.Node) {
        if (!isConstAssertion(node)) context.report({ node, messageId: 'assertion' })
      },
      TSTypeAssertion(node: Rule.Node) {
        context.report({ node, messageId: 'angleBracket' })
      },
      TSNonNullExpression(node: Rule.Node) {
        context.report({ node, messageId: 'nonNull' })
      },
      PropertyDefinition(node: Rule.Node) {
        if (property(node, 'definite') === true) context.report({ node, messageId: 'definiteAssignment' })
      },
    }
  },
}
