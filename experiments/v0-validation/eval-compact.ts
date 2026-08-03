import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'node:fs';

const MODEL = 'claude-sonnet-5';
const REPR_DIR = new URL('./representations/', import.meta.url).pathname;

const SYSTEM_PROMPT = `You are answering questions about a web application based only on the
information given below. If the information given does not contain enough
detail to answer confidently, say so explicitly rather than guessing.`;

interface Question {
  id: string;
  question: string;
  groundTruth: string;
}

function loadQuestions(): Question[] {
  return JSON.parse(readFileSync(new URL('./questions.json', import.meta.url).pathname, 'utf-8'));
}

async function main() {
  const client = new Anthropic();
  const questions = loadQuestions();
  const compactIr = readFileSync(`${REPR_DIR}context-ir-compact.json`, 'utf-8');
  const repContent: Anthropic.ContentBlockParam[] = [
    { type: 'text', text: `Application Context IR, compact form (context-ir-compact.json):\n\n${compactIr}` },
  ];

  const rows: string[] = ['questionId,question,groundTruth,answer,promptTokens,completionTokens'];
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""').replace(/\n/g, ' ')}"`;

  let totalPromptTokens = 0;
  for (const q of questions) {
    process.stdout.write(`[acir-compact] ${q.id}... `);
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: [...repContent, { type: 'text', text: q.question }] }],
    });
    const textBlock = resp.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    const answer = textBlock?.text ?? '';
    console.log(`ok (${resp.usage.input_tokens} in / ${resp.usage.output_tokens} out)`);
    totalPromptTokens += resp.usage.input_tokens;
    rows.push([q.id, q.question, q.groundTruth, answer, resp.usage.input_tokens, resp.usage.output_tokens].map(escape).join(','));
  }

  writeFileSync(new URL('./results-compact.csv', import.meta.url).pathname, rows.join('\n'));
  console.log(`\nTotal prompt tokens (acir-compact): ${totalPromptTokens}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
