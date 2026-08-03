import { AceGraph } from './schema/types';

/**
 * Filters a plain instance-data object down to only the fields declared on
 * the named object type in the schema, preserving declared property order.
 * Returns null if the object name isn't in the schema at all (honest
 * decline, matching the "never fabricate" principle) rather than passing
 * arbitrary data through unfiltered.
 *
 * Scoped to objects only, not component state — merging live object data
 * with live UI state is the harder "combine static graph + running app
 * state" problem, deferred to the runtime-instrumentation backlog item.
 */
export function describeInstance(
  graph: AceGraph,
  objectName: string,
  data: Record<string, unknown>,
): Record<string, unknown> | null {
  const schema = graph.objects[objectName];
  if (!schema) return null;

  const result: Record<string, unknown> = {};
  for (const [name] of schema) {
    if (name in data) result[name] = data[name];
  }
  return result;
}
