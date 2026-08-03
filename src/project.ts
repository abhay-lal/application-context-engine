import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Project, ScriptTarget } from 'ts-morph';

export function loadProject(targetDir: string): Project {
  const tsConfigFilePath = join(targetDir, 'tsconfig.json');

  const project = existsSync(tsConfigFilePath)
    ? new Project({ tsConfigFilePath })
    : new Project({
        compilerOptions: {
          target: ScriptTarget.ES2020,
          jsx: 4, // ts.JsxEmit.ReactJSX
          allowJs: true,
        },
      });

  // A root tsconfig.json using TS project references (`"files": []`,
  // delegating to e.g. tsconfig.app.json) resolves to zero source files —
  // a common modern scaffold pattern (Vite's react-ts template does this).
  // Fall back to a direct glob in that case rather than trying to parse
  // and pick a reference.
  if (project.getSourceFiles().length === 0) {
    project.addSourceFilesAtPaths([`${targetDir}/**/*.{ts,tsx}`, `!${targetDir}/**/node_modules/**`]);
  }

  return project;
}
