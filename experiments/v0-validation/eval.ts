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

interface ResultRow {
  representation: string;
  questionId: string;
  question: string;
  groundTruth: string;
  answer: string;
  promptTokens: number;
  completionTokens: number;
}

function loadQuestions(): Question[] {
  return JSON.parse(readFileSync(new URL('./questions.json', import.meta.url).pathname, 'utf-8'));
}

function imageBlock(filename: string): Anthropic.ImageBlockParam {
  const data = readFileSync(`${REPR_DIR}${filename}`).toString('base64');
  return { type: 'image', source: { type: 'base64', media_type: 'image/png', data } };
}

function buildRepresentations(): Record<string, Anthropic.ContentBlockParam[]> {
  const contextIr = readFileSync(`${REPR_DIR}context-ir.json`, 'utf-8');
  const a11yInvoices = readFileSync(`${REPR_DIR}a11y-invoices.yaml`, 'utf-8');
  const a11yDetail = readFileSync(`${REPR_DIR}a11y-invoice-detail.yaml`, 'utf-8');

  return {
    acir: [{ type: 'text', text: `Application Context IR (context-ir.json):\n\n${contextIr}` }],
    a11y: [
      {
        type: 'text',
        text:
          `Accessibility tree snapshot for page /invoices:\n${a11yInvoices}\n\n` +
          `Accessibility tree snapshot for page /invoices/INV-001:\n${a11yDetail}`,
      },
    ],
    screenshot: [
      { type: 'text', text: 'Screenshot of page /invoices:' },
      imageBlock('screenshot-invoices.png'),
      { type: 'text', text: 'Screenshot of page /invoices/INV-001:' },
      imageBlock('screenshot-invoice-detail.png'),
    ],
  };
}

async function ask(
  client: Anthropic,
  repContent: Anthropic.ContentBlockParam[],
  question: string,
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    thinking: { type: 'disabled' },
    messages: [{ role: 'user', content: [...repContent, { type: 'text', text: question }] }],
  });

  const textBlock = resp.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  return {
    text: textBlock?.text ?? '',
    promptTokens: resp.usage.input_tokens,
    completionTokens: resp.usage.output_tokens,
  };
}

function toCsv(rows: ResultRow[]): string {
  const header = ['representation', 'questionId', 'question', 'groundTruth', 'answer', 'promptTokens', 'completionTokens'];
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      [row.representation, row.questionId, row.question, row.groundTruth, row.answer, row.promptTokens, row.completionTokens]
        .map(escape)
        .join(','),
    );
  }
  return lines.join('\n');
}

async function main() {
  const client = new Anthropic();
  const questions = loadQuestions();
  const representations = buildRepresentations();
  const results: ResultRow[] = [];

  for (const [repName, repContent] of Object.entries(representations)) {
    for (const q of questions) {
      process.stdout.write(`[${repName}] ${q.id}... `);
      const { text, promptTokens, completionTokens } = await ask(client, repContent, q.question);
      console.log(`ok (${promptTokens} in / ${completionTokens} out)`);
      results.push({
        representation: repName,
        questionId: q.id,
        question: q.question,
        groundTruth: q.groundTruth,
        answer: text,
        promptTokens,
        completionTokens,
      });
    }
  }

  const outPath = new URL('./results.csv', import.meta.url).pathname;
  writeFileSync(outPath, toCsv(results));
  console.log(`\nWrote ${outPath} (${results.length} rows) — hand-score the 'answer' column against 'groundTruth'.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
