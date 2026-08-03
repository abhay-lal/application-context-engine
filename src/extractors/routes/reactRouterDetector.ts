import { JsxElement, JsxSelfClosingElement, Node, Project, SourceFile, SyntaxKind } from 'ts-morph';
import { RouteTuple } from '../../schema/types';
import { RouteDetector } from './types';

type TagElement = JsxSelfClosingElement | JsxElement;

function getTagName(el: TagElement): string {
  return Node.isJsxSelfClosingElement(el) ? el.getTagNameNode().getText() : el.getOpeningElement().getTagNameNode().getText();
}

function getAttributes(el: TagElement) {
  const attrs = Node.isJsxSelfClosingElement(el) ? el.getAttributes() : el.getOpeningElement().getAttributes();
  return attrs.filter(Node.isJsxAttribute);
}

/** True if `identifierName` is imported from a react-router package in this file
 *  (Navigate, Outlet, etc.) rather than being a locally-declared/imported component. */
function isRouterPackageImport(sourceFile: SourceFile, identifierName: string): boolean {
  return sourceFile.getImportDeclarations().some((imp) => {
    if (!/^react-router/.test(imp.getModuleSpecifierValue())) return false;
    return imp.getNamedImports().some((ni) => (ni.getAliasNode()?.getText() ?? ni.getName()) === identifierName);
  });
}

/** Resolves a JSX value node (e.g. the `element={...}` RHS) to a component
 *  name, or undefined if it resolves to a router-package utility (Navigate,
 *  Outlet) rather than a locally-declared component. */
function resolveComponentName(node: Node, sourceFile: SourceFile): string | undefined {
  let tagName: string | undefined;
  if (Node.isJsxSelfClosingElement(node)) tagName = node.getTagNameNode().getText();
  else if (Node.isJsxElement(node)) tagName = node.getOpeningElement().getTagNameNode().getText();
  if (!tagName) return undefined;
  return isRouterPackageImport(sourceFile, tagName) ? undefined : tagName;
}

export const reactRouterDetector: RouteDetector = {
  name: 'react-router',

  detect(project: Project): RouteTuple[] {
    const routes: RouteTuple[] = [];

    for (const sourceFile of project.getSourceFiles()) {
      if (sourceFile.getFilePath().includes('node_modules')) continue;

      const routeEls: TagElement[] = [
        ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
        ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement),
      ]
        .filter((el) => getTagName(el) === 'Route')
        .sort((a, b) => a.getPos() - b.getPos());

      for (const routeEl of routeEls) {
        const attrs = getAttributes(routeEl);

        const pathAttr = attrs.find((a) => a.getNameNode().getText() === 'path');
        const pathInit = pathAttr?.getInitializer();
        const path = pathInit && Node.isStringLiteral(pathInit) ? pathInit.getLiteralValue() : undefined;
        if (path === undefined) continue; // e.g. index routes with no own path — not handled in V0

        let componentName: string | undefined;

        const elementAttr = attrs.find((a) => a.getNameNode().getText() === 'element');
        const componentAttr = attrs.find((a) => a.getNameNode().getText() === 'component');

        if (elementAttr) {
          const init = elementAttr.getInitializer();
          const expr = init && Node.isJsxExpression(init) ? init.getExpression() : undefined;
          if (expr) componentName = resolveComponentName(expr, sourceFile);
        } else if (componentAttr) {
          const init = componentAttr.getInitializer();
          const expr = init && Node.isJsxExpression(init) ? init.getExpression() : undefined;
          if (expr && Node.isIdentifier(expr)) {
            componentName = isRouterPackageImport(sourceFile, expr.getText()) ? undefined : expr.getText();
          }
        }

        if (componentName) routes.push([path, componentName]);
      }
    }

    return routes;
  },
};
