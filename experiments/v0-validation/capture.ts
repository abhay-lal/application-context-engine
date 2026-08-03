import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE_URL = process.env.FIXTURE_URL ?? 'http://localhost:5183';
const OUT_DIR = new URL('./representations/', import.meta.url).pathname;

const PAGES = [
  { name: 'invoices', path: '/invoices' },
  { name: 'invoice-detail', path: '/invoices/INV-001' },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });

  for (const { name, path } of PAGES) {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });

    const screenshotPath = `${OUT_DIR}screenshot-${name}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`Wrote ${screenshotPath}`);

    const snapshot = await page.locator('body').ariaSnapshot();
    const a11yPath = `${OUT_DIR}a11y-${name}.yaml`;
    writeFileSync(a11yPath, snapshot);
    console.log(`Wrote ${a11yPath}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
