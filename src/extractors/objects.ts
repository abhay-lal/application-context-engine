import { InterfaceDeclaration, Node, SyntaxKind, Type, TypeAliasDeclaration } from 'ts-morph';
import { PropertyTuple } from '../schema/types';
import { ComponentFn } from '../util/componentDetection';
import { compactTypeText } from '../util/typeText';

type ObjectDecl = InterfaceDeclaration | TypeAliasDeclaration;

/** Shared across every component in a project, keyed by declaration identity
 *  (not name string) so accidental name collisions can't silently merge two
 *  distinct types. Flattened into `AceGraph.objects` (name-keyed) once, after
 *  every component has been visited — see assemble.ts. */
export type ObjectRegistry = Map<ObjectDecl, { name: string; properties: PropertyTuple[] }>;

function unwrapType(type: Type): Type {
  let t = type.isNullable() ? type.getNonNullableType() : type;

  if (t.getSymbol()?.getName() === 'Promise') {
    const [arg] = t.getTypeArguments();
    if (arg) t = arg.isNullable() ? arg.getNonNullableType() : arg;
  }

  if (t.isArray()) {
    const el = t.getArrayElementType();
    if (el) t = el.isNullable() ? el.getNonNullableType() : el;
  }

  return t;
}

function getPropertiesOfDecl(decl: ObjectDecl): PropertyTuple[] {
  const props = Node.isInterfaceDeclaration(decl)
    ? decl.getProperties()
    : (() => {
        const target = decl.getTypeNode();
        return target && Node.isTypeLiteral(target) ? target.getProperties() : [];
      })();
  return props.map((p) => [p.getName(), compactTypeText(p.getTypeNode(), p.getType())] as PropertyTuple);
}

/** Resolves `type` to a project-local named interface/object-shaped type
 *  alias, unwrapping Promise/array/nullable wrappers first. Returns
 *  undefined for primitives, inline anonymous shapes, and non-object aliases
 *  (e.g. a literal-union alias like `InvoiceStatus` — that's state/property
 *  data, not a domain object). */
function resolveNamedObjectDecl(type: Type): { name: string; decl: ObjectDecl } | undefined {
  const unwrapped = unwrapType(type);
  const symbol = unwrapped.getSymbol();
  if (!symbol) return undefined;

  const decl = symbol.getDeclarations().find((d): d is ObjectDecl => Node.isInterfaceDeclaration(d) || Node.isTypeAliasDeclaration(d));
  if (!decl) return undefined;

  if (Node.isTypeAliasDeclaration(decl)) {
    const target = decl.getTypeNode();
    if (!target || !Node.isTypeLiteral(target)) return undefined;
  }

  return { name: symbol.getName(), decl };
}

function register(registry: ObjectRegistry, resolved: { name: string; decl: ObjectDecl }): void {
  if (registry.has(resolved.decl)) return;
  registry.set(resolved.decl, { name: resolved.name, properties: getPropertiesOfDecl(resolved.decl) });
}

/**
 * Registers domain object types reachable from a component into the shared
 * global registry:
 *  (a) if the prop parameter is destructured (the common "Props" convention),
 *      drill into its properties for nested domain types — never register
 *      the wrapper interface itself (e.g. "CustomerBadgeProps" isn't a
 *      domain object; its "customer: Customer" property is). If it's a
 *      plain, non-destructured param, it may itself be directly domain-typed.
 *  (b) the resolved type of every local variable declaration in its body.
 */
export function collectObjects(comp: ComponentFn, registry: ObjectRegistry): void {
  const param = comp.getParameters()[0];
  if (param) {
    const nameNode = param.getNameNode();
    if (Node.isObjectBindingPattern(nameNode)) {
      for (const propSymbol of param.getType().getProperties()) {
        const propType = propSymbol.getTypeAtLocation(param);
        const resolved = resolveNamedObjectDecl(propType);
        if (resolved) register(registry, resolved);
      }
    } else {
      const resolved = resolveNamedObjectDecl(param.getType());
      if (resolved) register(registry, resolved);
    }
  }

  const body = comp.getBody();
  if (body) {
    for (const varDecl of body.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
      const resolved = resolveNamedObjectDecl(varDecl.getType());
      if (resolved) register(registry, resolved);
    }
  }
}
