import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { compactTypeText } from '../src/util/typeText';

function typeTextForProperty(source: string, propName: string): string {
  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile('t.ts', source);
  const iface = sf.getInterfaceOrThrow('Invoice');
  const prop = iface.getPropertyOrThrow(propName);
  return compactTypeText(prop.getTypeNode(), prop.getType());
}

describe('compactTypeText', () => {
  it('expands a closed literal-union alias and normalizes quotes/whitespace', () => {
    const source = `
      type InvoiceStatus = 'Pending' | 'Approved' | 'Rejected';
      interface Invoice { status: InvoiceStatus; }
    `;
    expect(typeTextForProperty(source, 'status')).toBe("'Pending'|'Approved'|'Rejected'");
  });

  it('keeps syntactic text for primitive types', () => {
    const source = `interface Invoice { amount: number; }`;
    expect(typeTextForProperty(source, 'amount')).toBe('number');
  });

  it('keeps syntactic text for a non-alias inline union', () => {
    const source = `interface Invoice { id: string | number; }`;
    expect(typeTextForProperty(source, 'id')).toBe('string|number');
  });
});
