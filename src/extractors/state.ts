import { Node, SyntaxKind } from 'ts-morph';
import { StateTuple } from '../schema/types';
import { ComponentFn } from '../util/componentDetection';
import { compactTypeText } from '../util/typeText';

const USE_STATE_CALLEE = /^(React\.)?useState$/;

/** Extracts `useState()` declarations from a component's body, in doc order. */
export function extractState(comp: ComponentFn): StateTuple[] {
  const body = comp.getBody();
  if (!body) return [];

  const tuples: StateTuple[] = [];

  for (const call of body.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (!USE_STATE_CALLEE.test(call.getExpression().getText())) continue;

    const varDecl = call.getParentIfKind(SyntaxKind.VariableDeclaration);
    const nameNode = varDecl?.getNameNode();
    if (!nameNode || !Node.isArrayBindingPattern(nameNode)) continue;

    const [stateEl] = nameNode.getElements();
    if (!Node.isBindingElement(stateEl)) continue; // omitted (`const [, setX] = ...`) — no name to report

    const name = stateEl.getName();
    const typeArgs = call.getTypeArguments();
    const firstArg = call.getArguments()[0];

    const type =
      typeArgs.length > 0
        ? compactTypeText(typeArgs[0], typeArgs[0].getType())
        : firstArg
          ? compactTypeText(undefined, firstArg.getType().getBaseTypeOfLiteralType())
          : 'undefined';

    tuples.push([name, type]);
  }

  return tuples;
}
