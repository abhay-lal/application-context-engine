import { ArrowFunction, CallExpression, FunctionDeclaration, FunctionExpression, Node, SourceFile } from 'ts-morph';

export type ComponentFn = FunctionDeclaration | ArrowFunction | FunctionExpression;

export interface ComponentInfo {
  name: string;
  fn: ComponentFn;
  sourceFile: SourceFile;
}

const isCapitalized = (name: string) => /^[A-Z]/.test(name);

/** Unwraps forwardRef(fn) / memo(fn) to the inner function, if applicable. */
function unwrapWrapper(node: Node): ComponentFn | undefined {
  if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) return node;
  if (Node.isCallExpression(node)) {
    const callee = (node as CallExpression).getExpression().getText();
    if (/^(React\.)?(forwardRef|memo)$/.test(callee)) {
      const arg = (node as CallExpression).getArguments()[0];
      if (arg && (Node.isArrowFunction(arg) || Node.isFunctionExpression(arg))) return arg;
    }
  }
  return undefined;
}

/** Finds top-level, capitalized (React convention) component functions in a source file. */
export function getComponentFunctions(sourceFile: SourceFile): ComponentInfo[] {
  const components: ComponentInfo[] = [];

  for (const fn of sourceFile.getFunctions()) {
    const name = fn.getName();
    if (name && isCapitalized(name)) {
      components.push({ name, fn, sourceFile });
    }
  }

  for (const varDecl of sourceFile.getVariableDeclarations()) {
    const name = varDecl.getName();
    if (!isCapitalized(name)) continue;
    const initializer = varDecl.getInitializer();
    if (!initializer) continue;

    if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
      components.push({ name, fn: initializer, sourceFile });
    } else {
      const unwrapped = unwrapWrapper(initializer);
      if (unwrapped) components.push({ name, fn: unwrapped, sourceFile });
    }
  }

  return components;
}
