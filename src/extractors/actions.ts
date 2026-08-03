import { JsxAttribute, JsxElement, JsxSelfClosingElement, Node, SyntaxKind } from 'ts-morph';
import { ActionEntry } from '../schema/types';
import { ComponentFn } from '../util/componentDetection';
import { negateBooleanExpression } from '../util/expressions';

type TagElement = JsxElement | JsxSelfClosingElement;

// Known limitation: only these tag names are considered action-bearing.
// Anchors, custom icon-button components, etc. are a documented gap, not solved here.
const BUTTON_TAGS = new Set(['button', 'Button']);
const FORM_TAGS = new Set(['form', 'Form']);

function getTagName(el: TagElement): string {
  return Node.isJsxSelfClosingElement(el) ? el.getTagNameNode().getText() : el.getOpeningElement().getTagNameNode().getText();
}

function getAttributes(el: TagElement): JsxAttribute[] {
  const attrs = Node.isJsxSelfClosingElement(el) ? el.getAttributes() : el.getOpeningElement().getAttributes();
  return attrs.filter(Node.isJsxAttribute);
}

function getOwnText(el: TagElement): string {
  if (Node.isJsxSelfClosingElement(el)) return '';
  return el
    .getJsxChildren()
    .filter(Node.isJsxText)
    .map((t) => t.getText())
    .join('')
    .trim();
}

/** Forms don't carry their own visible label — the nested submit button does. */
function findNestedButton(el: TagElement): TagElement | undefined {
  if (Node.isJsxSelfClosingElement(el)) return undefined;
  const candidates: TagElement[] = [
    ...el.getDescendantsOfKind(SyntaxKind.JsxElement),
    ...el.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];
  return candidates.find((c) => BUTTON_TAGS.has(getTagName(c)));
}

function resolveHandler(attr: JsxAttribute): string {
  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) return '<unresolved>';
  const expr = init.getExpression();
  if (!expr) return '<unresolved>';
  if (Node.isIdentifier(expr)) return expr.getText();
  if (Node.isArrowFunction(expr) || Node.isFunctionExpression(expr)) return '<inline>';
  return '<unresolved>';
}

function getBooleanAttrExpression(attr: JsxAttribute) {
  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) return undefined;
  return init.getExpression();
}

/** Extracts button/form trigger actions from a component's body, in doc order. */
export function extractActions(comp: ComponentFn): ActionEntry[] {
  const body = comp.getBody();
  if (!body) return [];

  const elements: TagElement[] = [
    ...body.getDescendantsOfKind(SyntaxKind.JsxElement),
    ...body.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ].sort((a, b) => a.getPos() - b.getPos());

  const entries: ActionEntry[] = [];

  for (const el of elements) {
    const tag = getTagName(el);
    if (!BUTTON_TAGS.has(tag) && !FORM_TAGS.has(tag)) continue;

    const handlerAttr = getAttributes(el).find((a) => /^on[A-Z]/.test(a.getNameNode().getText()));
    if (!handlerAttr) continue;

    // For forms, the visible label/enabled state usually live on a nested submit button.
    const labelSource = FORM_TAGS.has(tag) ? (findNestedButton(el) ?? el) : el;
    const labelAttrs = getAttributes(labelSource);

    const disabledAttr = labelAttrs.find((a) => a.getNameNode().getText() === 'disabled');
    const enabledAttr = labelAttrs.find((a) => a.getNameNode().getText() === 'enabled');

    let enabled: string | null = null;
    if (disabledAttr) {
      const expr = getBooleanAttrExpression(disabledAttr);
      if (expr) enabled = negateBooleanExpression(expr);
    } else if (enabledAttr) {
      const expr = getBooleanAttrExpression(enabledAttr);
      if (expr) enabled = expr.getText();
    }

    entries.push({
      label: getOwnText(labelSource),
      trigger: handlerAttr.getNameNode().getText(),
      handler: resolveHandler(handlerAttr),
      enabled,
    });
  }

  return entries;
}
