export const SCHEMA_VERSION = 1 as const;

/** [propertyName, type-as-source-text] */
export type PropertyTuple = readonly [name: string, type: string];

/** [path, componentName] */
export type RouteTuple = readonly [path: string, component: string];

/** [stateVarName, type] */
export type StateTuple = readonly [name: string, type: string];

export interface ActionEntry {
  /** Visible label (JSX text content of the trigger element). */
  label: string;
  /** JSX event-handler prop name as written, e.g. "onClick", "onSubmit". */
  trigger: string;
  /** Resolved handler identifier name, or "<inline>" / "<unresolved>" sentinel. Never fabricated. */
  handler: string;
  /** Positive-polarity boolean expression text, or null if unconditional. */
  enabled: string | null;
}

export interface AceGraph {
  version: typeof SCHEMA_VERSION;
  routes: RouteTuple[];
  /** Keyed by object/type name, deduplicated globally across the project. */
  objects: Record<string, PropertyTuple[]>;
  /** Keyed by owning component name. Components with no state get no key. */
  state: Record<string, StateTuple[]>;
  /** Keyed by owning component name. Components with no actions get no key. */
  actions: Record<string, ActionEntry[]>;
}
