import { Project } from 'ts-morph';
import { describe, expect, it } from 'vitest';
import { reactRouterDetector } from '../src/extractors/routes/reactRouterDetector';

function detect(files: Record<string, string>) {
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { jsx: 4 } });
  for (const [path, content] of Object.entries(files)) project.createSourceFile(path, content);
  return reactRouterDetector.detect(project);
}

describe('reactRouterDetector', () => {
  it('reproduces the fixture case: v6 element form, excluding the Navigate redirect', () => {
    const result = detect({
      'App.tsx': `
        import { Navigate, Route, Routes } from 'react-router-dom';
        import { InvoiceDetailPage } from './InvoiceDetailPage';
        import { InvoiceListPage } from './InvoiceListPage';
        function App() {
          return (
            <Routes>
              <Route path="/" element={<Navigate to="/invoices" replace />} />
              <Route path="/invoices" element={<InvoiceListPage />} />
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            </Routes>
          );
        }
      `,
    });
    expect(result).toEqual([
      ['/invoices', 'InvoiceListPage'],
      ['/invoices/:id', 'InvoiceDetailPage'],
    ]);
  });

  it('supports the v5 component={Foo} form', () => {
    const result = detect({
      'App.tsx': `
        import { Route } from 'react-router-dom';
        import { Home } from './Home';
        function App() {
          return <Route path="/" component={Home} />;
        }
      `,
    });
    expect(result).toEqual([['/', 'Home']]);
  });

  it('scans across multiple source files', () => {
    const result = detect({
      'App.tsx': `
        import { Route } from 'react-router-dom';
        import { Home } from './Home';
        function App() { return <Route path="/" element={<Home />} />; }
      `,
      'Other.tsx': `
        import { Route } from 'react-router-dom';
        import { About } from './About';
        function Other() { return <Route path="/about" element={<About />} />; }
      `,
    });
    expect(result).toEqual(
      expect.arrayContaining([
        ['/', 'Home'],
        ['/about', 'About'],
      ]),
    );
    expect(result).toHaveLength(2);
  });

  it('skips a Route with no path attribute (e.g. an index/layout route)', () => {
    const result = detect({
      'App.tsx': `
        import { Route } from 'react-router-dom';
        import { Home } from './Home';
        function App() { return <Route element={<Home />} />; }
      `,
    });
    expect(result).toEqual([]);
  });
});
