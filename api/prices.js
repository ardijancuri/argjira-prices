const { chromium } = require('playwright-core');
const {
  TARGET_URL,
  mapExtractedRows,
  getBrowserlessWsUrl,
  withTimeout
} = require('./_shared/prices');

const FUNCTION_TIMEOUT_MS = Number(process.env.NADIR_FUNCTION_TIMEOUT_MS || 25_000);

module.exports = async function handler(req, res) {
  const wsUrl = getBrowserlessWsUrl();
  if (!wsUrl) {
    res.status(500).json({
      ok: false,
      error: 'Browserless is not configured.',
      details: 'Set BROWSERLESS_WS_URL or BROWSERLESS_TOKEN.'
    });
    return;
  }

  let browser;
  try {
    browser = await withTimeout(chromium.connectOverCDP(wsUrl), FUNCTION_TIMEOUT_MS, 'remote browser connection');

    const context = browser.contexts()[0] || await browser.newContext();
    const page = context.pages()[0] || await context.newPage();

    await withTimeout(
      page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' }),
      FUNCTION_TIMEOUT_MS,
      'initial page load'
    );

    await withTimeout(
      page.waitForFunction(() => {
        const text = document.body?.innerText || '';
        return text.includes('AltınKG/USD') || text.includes('AltinKG/USD');
      }, { timeout: FUNCTION_TIMEOUT_MS }),
      FUNCTION_TIMEOUT_MS + 1_000,
      'rendered Nadir rows'
    );

    const extractedRows = await withTimeout(
      page.$$eval('div.row.align-items-center', rows =>
        rows.map(row => ({
          label: row.querySelector('h5')?.textContent?.trim() || '',
          values: Array.from(row.querySelectorAll('.col-4.text-center'))
            .map(cell => (cell.textContent || '').replace(/\s+/g, ' ').trim())
            .filter(Boolean)
        }))
      ),
      FUNCTION_TIMEOUT_MS,
      'DOM extraction'
    );

    const rows = mapExtractedRows(extractedRows);
    const fetchedAt = new Date().toISOString();

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      provider: 'nadirdoviz-browserless',
      fetchedAt,
      lastSuccessAt: fetchedAt,
      cached: false,
      stale: false,
      rows
    });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({
      ok: false,
      error: 'Failed to fetch Nadir prices.',
      details: String(error.message || error)
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
};
