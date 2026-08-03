import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { extractState } from '../src/extractors/state';

function stateFor(source: string) {
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { jsx: 4 } });
  const sf = project.createSourceFile('t.tsx', source);
  return extractState(sf.getFunctionOrThrow('Foo'));
}

describe('extractState', () => {
  it('reproduces the fixture case exactly (boolean + string, both inferred)', () => {
    const source = `
      import { useState } from 'react';
      function Foo() {
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [comment, setComment] = useState('');
        return null;
      }
    `;
    expect(stateFor(source)).toEqual([
      ['isSubmitting', 'boolean'],
      ['comment', 'string'],
    ]);
  });

  it('uses an explicit generic type argument when present', () => {
    const source = `
      import { useState } from 'react';
      function Foo() {
        const [count, setCount] = useState<number>(5);
        return null;
      }
    `;
    expect(stateFor(source)).toEqual([['count', 'number']]);
  });

  it('widens inferred array and object literal initializers', () => {
    const source = `
      import { useState } from 'react';
      function Foo() {
        const [items, setItems] = useState([1, 2, 3]);
        const [obj, setObj] = useState({ a: 1 });
        return null;
      }
    `;
    expect(stateFor(source)).toEqual([
      ['items', 'number[]'],
      ['obj', '{ a: number; }'],
    ]);
  });

  it('reports "undefined" for a no-argument call', () => {
    const source = `
      import { useState } from 'react';
      function Foo() {
        const [none, setNone] = useState();
        return null;
      }
    `;
    expect(stateFor(source)).toEqual([['none', 'undefined']]);
  });

  it('skips an omitted state-name binding without crashing', () => {
    const source = `
      import { useState } from 'react';
      function Foo() {
        const [, setSkipped] = useState(5);
        const [kept] = useState(1);
        return null;
      }
    `;
    expect(stateFor(source)).toEqual([['kept', 'number']]);
  });
});
