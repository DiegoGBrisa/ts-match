import type { Rule } from 'eslint'
import { isTestFilename, nodeType, parentOf, property } from '../ast-helpers.js'

const IGNORED_LITERALS = new Set(['-1', '-0', '0', '1'])
const DISALLOWED_EXTRACTION_COMMENT = 'Extracted from inlined numeric' + ' literal'

function literalRaw(node: Rule.Node): string | null {
  const raw = property(node, 'raw')
  return typeof raw === 'string' ? raw : null
}

function literalValue(node: Rule.Node): unknown {
  return property(node, 'value')
}

function isNumericLiteral(node: Rule.Node) {
  return nodeType(node) === 'Literal' && typeof literalValue(node) === 'number'
}

function isNumericLiteralArgument(value: unknown): value is Rule.Node {
  return nodeType(value) === 'Literal' && typeof property(value, 'value') === 'number'
}

function isUnaryNegativeNumericLiteral(node: Rule.Node) {
  return (
    nodeType(node) === 'UnaryExpression' &&
    property(node, 'operator') === '-' &&
    isNumericLiteralArgument(property(node, 'argument'))
  )
}

function isScreamingSnakeCase(name: string) {
  return /^[A-Z][A-Z0-9_]*$/.test(name)
}

function isInTypePosition(node: Rule.Node) {
  let current = parentOf(node)

  while (current) {
    const type = nodeType(current)
    if (type?.startsWith('TS')) return true
    current = parentOf(current)
  }

  return false
}

function isInEnumDeclaration(node: Rule.Node) {
  let current = parentOf(node)

  while (current) {
    if (nodeType(current) === 'TSEnumDeclaration') return true
    current = parentOf(current)
  }

  return false
}

function isWithinNamedConstantInitializer(node: Rule.Node) {
  let current: unknown = node

  while (current) {
    const parent = parentOf(current)
    if (!parent) return false

    if (nodeType(parent) === 'VariableDeclarator' && property(parent, 'init') === current) {
      const declaration = parentOf(parent)
      const name = property(property(parent, 'id'), 'name')

      return (
        nodeType(declaration) === 'VariableDeclaration' &&
        property(declaration, 'kind') === 'const' &&
        typeof name === 'string' &&
        isScreamingSnakeCase(name)
      )
    }

    current = parent
  }

  return false
}

function unaryLiteralText(node: Rule.Node): string | null {
  const argument = property(node, 'argument')
  if (!isNumericLiteralArgument(argument)) return null

  const raw = literalRaw(argument)
  return raw ? `-${raw}` : null
}

function reportIfMagicNumber(node: Rule.Node, context: Rule.RuleContext) {
  if (isInTypePosition(node)) return
  if (isInEnumDeclaration(node)) return
  if (isWithinNamedConstantInitializer(node)) return

  const literalText = isUnaryNegativeNumericLiteral(node) ? unaryLiteralText(node) : literalRaw(node)
  if (!literalText || IGNORED_LITERALS.has(literalText)) return

  context.report({
    node,
    messageId: 'inlineMagicNumber',
    data: {
      literal: literalText,
    },
  })
}

export const noInlineMagicNumbersRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require named constants for non-trivial numeric literals',
    },
    messages: {
      inlineMagicNumber:
        'Inline numeric literal {{literal}} is disallowed. Move reusable values to a named SCREAMING_SNAKE_CASE constant.',
      extractionComment:
        'Remove auto-generated numeric-literal extraction comments; constants should be named for domain meaning.',
    },
    schema: [],
  },
  create(context) {
    if (isTestFilename(context.filename)) return {}

    return {
      Literal(node: Rule.Node) {
        if (!isNumericLiteral(node)) return
        if (nodeType(parentOf(node)) === 'UnaryExpression') return

        reportIfMagicNumber(node, context)
      },
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!comment.loc) continue
          if (!comment.value.includes(DISALLOWED_EXTRACTION_COMMENT)) continue

          context.report({ loc: comment.loc, messageId: 'extractionComment' })
        }
      },
      UnaryExpression(node: Rule.Node) {
        if (isUnaryNegativeNumericLiteral(node)) reportIfMagicNumber(node, context)
      },
    }
  },
}
