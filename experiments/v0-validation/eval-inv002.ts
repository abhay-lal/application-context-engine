import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';

const MODEL = 'claude-sonnet-5';
const REPR_DIR = new URL('./representations/', import.meta.url).pathname;
const SYSTEM_PROMPT = `You are answering questions about a web application based only on the
information given below. If the information given does not contain enough
detail to answer confidently, say so explicitly rather than guessing.`;
const QUESTION = "Is the 'Approve Invoice' action currently enabled for invoice INV-002? Why or why not?";

const compactIr = readFileSync(`${REPR_DIR}context-ir-compact.json`, 'utf-8');
const a11yInv002 = readFileSync(`${REPR_DIR}a11y-invoice-detail-2.yaml`, 'utf-8');
const INSTANCE_DATA = '{"id":"INV-002","status":"Approved","amount":860,"customerName":"Bruce Wayne","canApprove":false,"isSubmitting":false}';

const arms: Record<string, Anthropic.ContentBlockParam[]> = {
  'a11y-inv002-fresh-capture': [{ type: 'text', text: `Accessibility tree snapshot for /invoices/INV-002:\n${a11yInv002}` }],
  'acir-schema-only-no-instance-data': [{ type: 'text', text: `Application Context IR (schema only, no instance data):\n\n${compactIr}` }],
  'acir-schema-plus-instance-data': [
    { type: 'text', text: `Application Context IR (schema):\n\n${compactIr}\n\nCurrent instance data for invoice INV-002:\n${INSTANCE_DATA}` },
  ],
};

async function main() {
  const client = new Anthropic();
  for (const [name, content] of Object.entries(arms)) {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: [...content, { type: 'text', text: QUESTION }] }],
    });
    const text = resp.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '';
    console.log(`\n=== ${name} (${resp.usage.input_tokens} in / ${resp.usage.output_tokens} out) ===`);
    console.log(text);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
