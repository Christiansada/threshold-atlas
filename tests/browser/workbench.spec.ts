import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('loads the real workbench, applies a feasible rule and exports aggregate evidence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'A score is not a decision.' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Use threshold', exact: true })
    .click();
  await expect(page.locator('#capacity-status')).toContainText(
    'Within capacity',
  );
  await page.getByLabel('Maximum flagged rows').fill('0');
  await page
    .getByRole('button', { name: 'Use threshold', exact: true })
    .click();
  await expect(page.locator('#flagged')).toHaveText('0');
  await expect(page.locator('#precision')).toHaveText('—');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export decision report' }).click();
  const report = await downloaded;
  expect(report.suggestedFilename()).toBe('threshold-atlas-report.json');
  const stream = await report.createReadStream();
  let content = '';
  for await (const chunk of stream!) content += chunk;
  const json = JSON.parse(content);
  expect(json.selected.threshold).toBeNull();
  expect(json.data.source).toBe('synthetic');
  expect(json.data.rows).toBe(240);
  expect(json).not.toHaveProperty('rows');
  expect(errors).toEqual([]);
});
test('imports validated rows, protects last good data, and never posts the CSV', async ({
  page,
}) => {
  await page.goto('/');
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.locator('#csv-file').setInputFiles({
    name: 'sample.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('score,label\n0.9,1\n0.8,0\n0.5,1\n0.2,0\n'),
  });
  await expect(page.locator('#dataset-info')).toContainText('4 rows');
  await expect(page.locator('#tp')).toHaveText('2');
  await expect(page.locator('#fp')).toHaveText('1');
  await page.locator('#csv-file').setInputFiles({
    name: 'bad.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('score,label\nwrong,1'),
  });
  await expect(page.getByRole('status')).toContainText('Previous dataset kept');
  await expect(page.locator('#dataset-info')).toContainText('4 rows');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#dataset-info')).toContainText('240 rows');
  expect(requests).toEqual([]);
});
test('keyboard threshold control and invalid settings preserve valid calculations', async ({
  page,
}) => {
  await page.goto('/');
  const slider = page.getByLabel('Decision threshold slider');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('0.501');
  const previous = await page.locator('#loss').textContent();
  await page.getByLabel('Maximum flagged rows').fill('-1');
  await expect(page.getByRole('status')).toContainText('last valid settings');
  await expect(page.locator('#loss')).toHaveText(previous!);
  await page.getByRole('button', { name: 'Flag none', exact: true }).click();
  await expect(page.locator('#flagged')).toHaveText('0');
});
for (const width of [1440, 768, 390, 320]) {
  test(
    'responsive layout and basic accessibility at ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.getByRole('button', { name: 'Use threshold', exact: true }),
      ).toBeVisible();
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(scan.violations).toEqual([]);
      await page.screenshot({
        path: 'test-results/threshold-atlas-' + width + '.png',
        fullPage: true,
      });
    },
  );
}
test('200 percent text enlargement remains contained', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto('/');
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('body *').forEach((e) => {
      const size = getComputedStyle(e).fontSize;
      e.style.fontSize = parseFloat(size) * 2 + 'px';
    });
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('optional browser tool registers and shares UI state, with invalid input rejected', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const testWindow = window as unknown as { registeredTool?: unknown };
    Object.defineProperty(document, 'modelContext', {
      value: {
        registerTool: (tool: unknown) => {
          testWindow.registeredTool = tool;
        },
      },
    });
  });
  await page.goto('/');
  const result = await page.evaluate(() => {
    const tool = (
      window as unknown as {
        registeredTool: { name: string; execute: (input: unknown) => unknown };
      }
    ).registeredTool;
    return { name: tool.name, result: tool.execute({ threshold: null }) };
  });
  expect(result.name).toBe('set_decision_threshold');
  await expect(page.locator('#flagged')).toHaveText('0');
  const rejected = await page.evaluate(() => {
    try {
      (
        window as unknown as {
          registeredTool: { execute: (input: unknown) => unknown };
        }
      ).registeredTool.execute({ threshold: 2 });
      return false;
    } catch {
      return true;
    }
  });
  expect(rejected).toBe(true);
  await expect(page.locator('#flagged')).toHaveText('0');
});
