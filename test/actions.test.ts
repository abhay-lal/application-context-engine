import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { extractActions } from '../src/extractors/actions';

function actionsFor(source: string) {
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { jsx: 4 } });
  const sf = project.createSourceFile('t.tsx', source);
  return extractActions(sf.getFunctionOrThrow('Foo'));
}

describe('extractActions', () => {
  it('reproduces the fixture case exactly: two disabled buttons + a form with a nested submit button', () => {
    const source = `
      function Foo() {
        return (
          <div>
            <button onClick={handleApprove} disabled={!invoice.canApprove || isSubmitting}>Approve Invoice</button>
            <button onClick={handleReject} disabled={!invoice.canApprove || isSubmitting}>Reject Invoice</button>
            <form onSubmit={handleAddComment}>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
              <button type="submit">Add Comment</button>
            </form>
          </div>
        );
      }
    `;
    expect(actionsFor(source)).toEqual([
      { label: 'Approve Invoice', trigger: 'onClick', handler: 'handleApprove', enabled: 'invoice.canApprove && !isSubmitting' },
      { label: 'Reject Invoice', trigger: 'onClick', handler: 'handleReject', enabled: 'invoice.canApprove && !isSubmitting' },
      { label: 'Add Comment', trigger: 'onSubmit', handler: 'handleAddComment', enabled: null },
    ]);
  });

  it('ignores onChange on non-button/form elements (textarea/input binding, not an action)', () => {
    const source = `
      function Foo() {
        return <textarea value={x} onChange={(e) => setX(e.target.value)} />;
      }
    `;
    expect(actionsFor(source)).toEqual([]);
  });

  it('reads a positive "enabled" attribute as-is (no negation)', () => {
    const source = `
      function Foo() {
        return <button onClick={submit} enabled={canSubmit}>Submit</button>;
      }
    `;
    expect(actionsFor(source)).toEqual([{ label: 'Submit', trigger: 'onClick', handler: 'submit', enabled: 'canSubmit' }]);
  });

  it('marks an inline arrow handler as "<inline>"', () => {
    const source = `
      function Foo() {
        return <button onClick={() => doThing()}>Go</button>;
      }
    `;
    expect(actionsFor(source)).toEqual([{ label: 'Go', trigger: 'onClick', handler: '<inline>', enabled: null }]);
  });

  it('marks a property-access handler as "<unresolved>"', () => {
    const source = `
      function Foo() {
        return <button onClick={obj.method}>Go</button>;
      }
    `;
    expect(actionsFor(source)).toEqual([{ label: 'Go', trigger: 'onClick', handler: '<unresolved>', enabled: null }]);
  });
});
