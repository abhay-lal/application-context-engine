import { Node, Project, SyntaxKind } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { negateBooleanExpression } from '../src/util/expressions';

function negateFromSource(exprSource: string): string {
  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile('t.tsx', `const x = <button disabled={${exprSource}} />;`);
  const attr = sf.getFirstDescendantByKindOrThrow(SyntaxKind.JsxAttribute);
  const jsxExpr = attr.getInitializerOrThrow();
  if (!Node.isJsxExpression(jsxExpr)) throw new Error('expected JsxExpression');
  const expr = jsxExpr.getExpressionOrThrow();
  return negateBooleanExpression(expr);
}

describe('negateBooleanExpression', () => {
  it('reproduces the fixture De Morgan case exactly', () => {
    expect(negateFromSource('!invoice.canApprove || isSubmitting')).toBe('invoice.canApprove && !isSubmitting');
  });

  it('negates a bare identifier without parens', () => {
    expect(negateFromSource('isSubmitting')).toBe('!isSubmitting');
  });

  it('negates a double-negative back to the bare expression', () => {
    expect(negateFromSource('!isSubmitting')).toBe('isSubmitting');
  });

  it('negates an && expression into ||', () => {
    expect(negateFromSource('a && b')).toBe('!a || !b');
  });

  it('falls back to a parenthesized wrap for non-unary-safe operands', () => {
    expect(negateFromSource('a === b')).toBe('!(a === b)');
  });

  it('does not parenthesize member/call expressions', () => {
    expect(negateFromSource('invoice.canApprove')).toBe('!invoice.canApprove');
  });
});
