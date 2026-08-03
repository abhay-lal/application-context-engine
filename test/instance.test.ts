import { describe, expect, it } from 'vitest';
import { describeInstance } from '../src/instance';
import { AceGraph, SCHEMA_VERSION } from '../src/schema/types';

const graph: AceGraph = {
  version: SCHEMA_VERSION,
  routes: [],
  objects: {
    Invoice: [
      ['id', 'string'],
      ['status', "'Pending'|'Approved'|'Rejected'"],
      ['amount', 'number'],
      ['customerName', 'string'],
      ['canApprove', 'boolean'],
    ],
  },
  state: {},
  actions: {},
};

describe('describeInstance', () => {
  it("filters Phase 0's actual INV-002 instance data down to the Invoice schema", () => {
    const inv002 = {
      id: 'INV-002',
      status: 'Approved',
      amount: 860,
      customerName: 'Bruce Wayne',
      canApprove: false,
      isSubmitting: false, // component state, not an Invoice field — must be stripped
    };
    expect(describeInstance(graph, 'Invoice', inv002)).toEqual({
      id: 'INV-002',
      status: 'Approved',
      amount: 860,
      customerName: 'Bruce Wayne',
      canApprove: false,
    });
  });

  it('strips unknown keys not declared on the object schema', () => {
    expect(describeInstance(graph, 'Invoice', { id: 'INV-001', bogus: true })).toEqual({ id: 'INV-001' });
  });

  it('returns null for an unknown object name (honest decline, not a pass-through)', () => {
    expect(describeInstance(graph, 'Customer', { id: 'CUST-1' })).toBeNull();
  });
});
