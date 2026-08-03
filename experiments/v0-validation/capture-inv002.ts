import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE_URL = process.env.FIXTURE_URL ?? 'http://localhost:5183';
const OUT_DIR = new URL('./representations/', import.meta.url).pathname;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });

  await page.goto(`${BASE_URL}/invoices/INV-002`, { waitUntil: 'networkidle' });

  await page.screenshot({ path: `${OUT_DIR}screenshot-invoice-detail-2.png` });
  const snapshot = await page.locator('body').ariaSnapshot();
  writeFileSync(`${OUT_DIR}a11y-invoice-detail-2.yaml`, snapshot);
  console.log(snapshot);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
