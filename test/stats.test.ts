import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildGraphWithStats } from '../src/assemble';

const FIXTURE_APP_DIR = join(__dirname, '../experiments/v0-validation/fixture-app');

describe('buildGraphWithStats', () => {
  it('reports honest counts for the fixture app (App, CustomerBadge, InvoiceDetailPage, InvoiceListPage)', () => {
    const { stats } = buildGraphWithStats(FIXTURE_APP_DIR);
    expect(stats).toEqual({
      components: 4,
      routes: 2,
      objects: 2,
      state: 2,
      actions: 3,
    });
  });
});
