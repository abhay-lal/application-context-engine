import { Node, Type, TypeNode } from 'ts-morph';

function normalizeTypeText(text: string): string {
  return text.replace(/"/g, "'").replace(/\s*\|\s*/g, '|').replace(/\s*&\s*/g, '&');
}

/** If `typeNode` references a project-local type alias whose target is a
 *  union of string-literal types (a closed, enum-like alias), returns that
 *  alias's own union type node (so its original syntactic text — quote style
 *  included — can be reused directly, instead of a checker-derived string
 *  that shows the alias name rather than its expansion). */
function resolveLiteralUnionAlias(typeNode: TypeNode): TypeNode | undefined {
  if (!Node.isTypeReference(typeNode)) return undefined;
  const typeName = typeNode.getTypeName();
  if (!Node.isIdentifier(typeName)) return undefined;

  const aliasDecl = typeName.getDefinitionNodes().find(Node.isTypeAliasDeclaration);
  if (!aliasDecl) return undefined;

  const aliasedType = aliasDecl.getTypeNode();
  if (aliasedType && Node.isUnionTypeNode(aliasedType) && aliasedType.getTypeNodes().every(Node.isLiteralTypeNode)) {
    return aliasedType;
  }
  return undefined;
}

/**
 * Renders a compact type string for the IR. Uses the syntactic type-node text
 * (source-preserving) unless the node is a closed literal-union alias, in
 * which case it resolves to the alias's own union text (its expansion, not
 * the bare alias name — which would be meaningless to an LLM on its own).
 * Falls back to the checker's type text only when there's no type node at
 * all (an inferred type with no explicit annotation).
 */
export function compactTypeText(typeNode: TypeNode | undefined, checkerType: Type): string {
  if (typeNode) {
    const resolved = resolveLiteralUnionAlias(typeNode);
    return normalizeTypeText((resolved ?? typeNode).getText());
  }
  return normalizeTypeText(checkerType.getText());
}
