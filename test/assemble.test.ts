import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildGraph } from '../src/assemble';
import { SCHEMA_VERSION } from '../src/schema/types';

const FIXTURE_APP_DIR = join(__dirname, '../experiments/v0-validation/fixture-app');
const GROUND_TRUTH_PATH = join(__dirname, '../experiments/v0-validation/representations/context-ir-compact.json');

describe('buildGraph', () => {
  it('reproduces the validated Phase 0 ground truth exactly (plus the version field)', () => {
    const actual = buildGraph(FIXTURE_APP_DIR);
    const groundTruth = JSON.parse(readFileSync(GROUND_TRUTH_PATH, 'utf-8'));

    expect(actual).toEqual({ version: SCHEMA_VERSION, ...groundTruth });
  });

  it('stays close in size to the validated compact ground truth (compact output is a testable property)', () => {
    const actual = buildGraph(FIXTURE_APP_DIR);
    const groundTruthBytes = readFileSync(GROUND_TRUTH_PATH, 'utf-8').trim().length;
    const actualBytes = JSON.stringify(actual).length;

    // Allow slack for the added `version` field plus incidental formatting differences.
    expect(actualBytes).toBeLessThan(groundTruthBytes * 1.1);
  });
});
