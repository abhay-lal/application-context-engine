import { writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { buildGraphWithStats } from './assemble';

const { positionals, values } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    out: { type: 'string', default: 'context-ir.json' },
    pretty: { type: 'boolean', default: false },
    quiet: { type: 'boolean', default: false },
  },
});

const [command, targetDir] = positionals;

if (command !== 'build' || !targetDir) {
  console.error('Usage: ace build <target-dir> [--out context-ir.json] [--pretty] [--quiet]');
  process.exit(1);
}

const { graph, stats } = buildGraphWithStats(resolve(targetDir));
const json = values.pretty ? JSON.stringify(graph, null, 2) : JSON.stringify(graph);
const outPath = resolve(values.out);

writeFileSync(outPath, json);

if (values.quiet) {
  console.log(`Wrote ${outPath}`);
} else {
  console.log(`✓ ${stats.components} Components`);
  console.log(`✓ ${stats.routes} Routes`);
  console.log(`✓ ${stats.objects} Objects`);
  console.log(`✓ ${stats.state} State Variables`);
  console.log(`✓ ${stats.actions} Actions`);
  console.log(`✓ Generated ${relative(process.cwd(), outPath)}`);
}
