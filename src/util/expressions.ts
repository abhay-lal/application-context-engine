import { Node, SyntaxKind } from 'ts-morph';

/**
 * Returns the source text of the logical negation of `node`, applying De
 * Morgan's laws when possible (`!X` -> `X`, `A || B` -> `!A && !B`, `A && B`
 * -> `!A || !B`) instead of a naive `!(...)` wrap. Falls back to `!(<text>)`
 * for anything else (comparisons, calls, bare identifiers) rather than
 * attempting general boolean minimization.
 */
export function negateBooleanExpression(node: Node): string {
  if (Node.isParenthesizedExpression(node)) {
    return negateBooleanExpression(node.getExpression());
  }

  if (Node.isPrefixUnaryExpression(node) && node.getOperatorToken() === SyntaxKind.ExclamationToken) {
    return node.getOperand().getText();
  }

  if (Node.isBinaryExpression(node)) {
    const operator = node.getOperatorToken().getText();
    if (operator === '||') {
      return `${negateBooleanExpression(node.getLeft())} && ${negateBooleanExpression(node.getRight())}`;
    }
    if (operator === '&&') {
      return `${negateBooleanExpression(node.getLeft())} || ${negateBooleanExpression(node.getRight())}`;
    }
  }

  // `!` binds tighter than any binary/ternary operator, so member/call/identifier
  // operands don't need wrapping parens — only compound expressions do.
  const isUnarySafe =
    Node.isIdentifier(node) ||
    Node.isPropertyAccessExpression(node) ||
    Node.isElementAccessExpression(node) ||
    Node.isCallExpression(node) ||
    Node.isNonNullExpression(node);

  return isUnarySafe ? `!${node.getText()}` : `!(${node.getText()})`;
}
