import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { collectObjects, ObjectRegistry } from '../src/extractors/objects';

function flatten(registry: ObjectRegistry): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { name, properties } of registry.values()) out[name] = properties;
  return out;
}

function collectFromSource(source: string, componentNames: string[]): Record<string, unknown> {
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { jsx: 4 } });
  const sf = project.createSourceFile('t.tsx', source);
  const registry: ObjectRegistry = new Map();
  for (const name of componentNames) {
    collectObjects(sf.getFunctionOrThrow(name), registry);
  }
  return flatten(registry);
}

describe('collectObjects', () => {
  it('reproduces the fixture case: local-var-typed domain objects, alias expanded', () => {
    const source = `
      type InvoiceStatus = 'Pending' | 'Approved' | 'Rejected';
      interface Invoice { id: string; status: InvoiceStatus; }
      function Foo() {
        const invoice: Invoice | undefined = undefined as any;
        return null;
      }
    `;
    expect(collectFromSource(source, ['Foo'])).toEqual({
      Invoice: [
        ['id', 'string'],
        ['status', "'Pending'|'Approved'|'Rejected'"],
      ],
    });
  });

  it('drills into destructured props for nested domain types, without registering the wrapper interface', () => {
    const source = `
      interface Customer { name: string; }
      interface FooProps { customer: Customer; }
      function Foo({ customer }: FooProps) {
        return null;
      }
    `;
    const result = collectFromSource(source, ['Foo']);
    expect(result).toEqual({ Customer: [['name', 'string']] });
    expect(result).not.toHaveProperty('FooProps');
  });

  it('registers a non-destructured, directly domain-typed prop param', () => {
    const source = `
      interface Invoice { id: string; }
      function Foo(invoice: Invoice) {
        return null;
      }
    `;
    expect(collectFromSource(source, ['Foo'])).toEqual({ Invoice: [['id', 'string']] });
  });

  it('unwraps array types to their element type', () => {
    const source = `
      interface Invoice { id: string; }
      function Foo() {
        const invoices: Invoice[] = [];
        return null;
      }
    `;
    expect(collectFromSource(source, ['Foo'])).toEqual({ Invoice: [['id', 'string']] });
  });

  it('deduplicates the same type globally across two components', () => {
    const source = `
      interface Invoice { id: string; }
      function A() {
        const invoice: Invoice = { id: 'x' };
        return null;
      }
      function B() {
        const invoice: Invoice = { id: 'y' };
        return null;
      }
    `;
    const registry: ObjectRegistry = (() => {
      const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { jsx: 4 } });
      const sf = project.createSourceFile('t.tsx', source);
      const r: ObjectRegistry = new Map();
      collectObjects(sf.getFunctionOrThrow('A'), r);
      collectObjects(sf.getFunctionOrThrow('B'), r);
      return r;
    })();
    expect(registry.size).toBe(1);
  });

  it('does not register primitives or a literal-union alias as an object', () => {
    const source = `
      type Status = 'a' | 'b';
      function Foo() {
        const count: number = 1;
        const status: Status = 'a';
        return null;
      }
    `;
    expect(collectFromSource(source, ['Foo'])).toEqual({});
  });
});
