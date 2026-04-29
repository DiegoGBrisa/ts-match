const ASSERTION_MESSAGE = 'Avoid TypeScript assertions. Only `as const` is allowed.'
const ANGLE_BRACKET_MESSAGE = 'Avoid angle-bracket TypeScript assertions. Only `as const` is allowed.'
const NON_NULL_MESSAGE = 'Avoid non-null assertions. Narrow or validate the value instead.'
const DEFINITE_ASSIGNMENT_MESSAGE = 'Avoid definite-assignment assertions. Model initialization explicitly instead.'

function isConstAssertion(node) {
  const annotation = node.typeAnnotation
  return (
    annotation?.type === 'TSTypeReference' &&
    annotation.typeName.type === 'Identifier' &&
    annotation.typeName.name === 'const'
  )
}

export default {
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
      TSAsExpression(node) {
        if (!isConstAssertion(node)) context.report({ node, messageId: 'assertion' })
      },
      TSTypeAssertion(node) {
        context.report({ node, messageId: 'angleBracket' })
      },
      TSNonNullExpression(node) {
        context.report({ node, messageId: 'nonNull' })
      },
      PropertyDefinition(node) {
        if (node.definite) context.report({ node, messageId: 'definiteAssignment' })
      },
    }
  },
}
