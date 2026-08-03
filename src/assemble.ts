import { extractActions } from './extractors/actions';
import { collectObjects, ObjectRegistry } from './extractors/objects';
import { reactRouterDetector } from './extractors/routes/reactRouterDetector';
import { extractState } from './extractors/state';
import { loadProject } from './project';
import { AceGraph, ActionEntry, PropertyTuple, SCHEMA_VERSION, StateTuple } from './schema/types';
import { getComponentFunctions } from './util/componentDetection';

interface AssembleResult {
  graph: AceGraph;
  componentCount: number;
}

function assembleInternal(targetDir: string): AssembleResult {
  const project = loadProject(targetDir);

  const objectRegistry: ObjectRegistry = new Map();
  const state: Record<string, StateTuple[]> = {};
  const actions: Record<string, ActionEntry[]> = {};
  let componentCount = 0;

  for (const sourceFile of project.getSourceFiles()) {
    if (sourceFile.getFilePath().includes('node_modules')) continue;

    for (const comp of getComponentFunctions(sourceFile)) {
      componentCount++;

      const stateTuples = extractState(comp.fn);
      if (stateTuples.length > 0) state[comp.name] = stateTuples;

      const actionEntries = extractActions(comp.fn);
      if (actionEntries.length > 0) actions[comp.name] = actionEntries;

      collectObjects(comp.fn, objectRegistry);
    }
  }

  const objects: Record<string, PropertyTuple[]> = {};
  for (const { name, properties } of objectRegistry.values()) objects[name] = properties;

  const routes = reactRouterDetector.detect(project);

  return { graph: { version: SCHEMA_VERSION, routes, objects, state, actions }, componentCount };
}

export function buildGraph(targetDir: string): AceGraph {
  return assembleInternal(targetDir).graph;
}

export interface AceStats {
  components: number;
  routes: number;
  objects: number;
  state: number;
  actions: number;
}

/** Not part of the persisted `AceGraph` schema — compiler/library-reporting
 *  metadata only (e.g. component count has no home in the graph itself,
 *  since a component with no state/actions/objects still scanned as real). */
export function buildGraphWithStats(targetDir: string): { graph: AceGraph; stats: AceStats } {
  const { graph, componentCount } = assembleInternal(targetDir);
  const stats: AceStats = {
    components: componentCount,
    routes: graph.routes.length,
    objects: Object.keys(graph.objects).length,
    state: Object.values(graph.state).reduce((n, arr) => n + arr.length, 0),
    actions: Object.values(graph.actions).reduce((n, arr) => n + arr.length, 0),
  };
  return { graph, stats };
}
