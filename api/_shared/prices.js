const TARGET_URL = 'https://www.nadirdoviz.com/fiyat-ekrani';

const ROWS = {
  goldKgUsd: { label: 'AltinKG/USD', patterns: [/^a.+kg\/usd$/i] },
  goldKgEur: { label: 'AltinKG/EUR', patterns: [/^a.+kg\/eur$/i] },
  silvOns: { label: 'Gumus/ONS', patterns: [/^g.+\/ons$/i] },
  silvKgUsd: { label: 'GumusKG/USD', patterns: [/^g.+kg\/usd$/i] },
  silvKgEur: { label: 'GumusKG/EUR', patterns: [/^g.+kg\/eur$/i] }
};

const MOJIBAKE_REPLACEMENTS = [
  ['ÃƒÆ’Ã¢â‚¬Å¾Ãƒâ€šÃ‚Â±', 'i'],
  ['ÃƒÆ’Ã¢â‚¬Å¾Ãƒâ€šÃ‚Â°', 'I'],
  ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¼', 'u'],
  ['ÃƒÆ’Ã†â€™Ãƒâ€¦Ã¢â‚¬Å“', 'U'],
  ['ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€¦Ã‚Â¸', 's'],
  ['ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€¦Ã‚Â¾', 'S'],
  ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§', 'c'],
  ['ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡', 'C'],
  ['ÃƒÆ’Ã¢â‚¬Å¾Ãƒâ€¦Ã‚Â¸', 'g'],
  ['ÃƒÆ’Ã¢â‚¬Å¾Ãƒâ€¦Ã‚Â¾', 'G'],
  ['ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¶', 'o'],
  ['ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“', 'O'],
  ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢', "'"],
  ['`', "'"]
];

function normalizeText(value) {
  let text = String(value || '');
  for (const [from, to] of MOJIBAKE_REPLACEMENTS) {
    text = text.split(from).join(to);
  }
  return text
    .replace(/Ãƒâ€žÃ‚Â±/g, 'i')
    .replace(/Ãƒâ€žÃ‚Â°/g, 'I')
    .replace(/Ãƒâ€¦Ã…Â¸/g, 's')
    .replace(/Ãƒâ€¦Ã…Â¾/g, 'S')
    .replace(/ÃƒÆ’Ã‚Â§/g, 'c')
    .replace(/ÃƒÆ’Ã¢â‚¬Â¡/g, 'C')
    .replace(/Ãƒâ€žÃ…Â¸/g, 'g')
    .replace(/Ãƒâ€žÃ…Â¾/g, 'G')
    .replace(/ÃƒÆ’Ã‚Â¶/g, 'o')
    .replace(/ÃƒÆ’Ã¢â‚¬â€œ/g, 'O')
    .replace(/ÃƒÆ’Ã‚Â¼/g, 'u')
    .replace(/ÃƒÆ’Ã…â€œ/g, 'U')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function matchesRowLabel(value, config) {
  const normalized = normalizeKey(value);
  return config.patterns.some(pattern => pattern.test(normalized));
}

function parseNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }
  const raw = String(value || '').trim().replace(/\s/g, '');
  if (!raw) {
    return NaN;
  }
  if (raw.includes('.') && raw.includes(',')) {
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    return Number(raw.replaceAll(thousandsSeparator, '').replace(decimalSeparator, '.'));
  }
  if (raw.includes(',')) {
    return Number(raw.replace(',', '.'));
  }
  return Number(raw);
}

function extractNumericValues(values) {
  return (values || [])
    .map(text => {
      const match = String(text || '').match(/\d[\d.,]*/);
      return match ? parseNumber(match[0]) : NaN;
    })
    .filter(Number.isFinite);
}

function mapExtractedRows(extractedRows) {
  const rows = {};

  for (const entry of extractedRows || []) {
    const rowEntry = Object.entries(ROWS).find(([, config]) => matchesRowLabel(entry.label, config));
    if (!rowEntry) {
      continue;
    }

    const numbers = extractNumericValues(entry.values);
    if (numbers.length < 2) {
      continue;
    }

    rows[rowEntry[0]] = {
      label: rowEntry[1].label,
      buy: numbers[0],
      sell: numbers[1]
    };
  }

  for (const [key, config] of Object.entries(ROWS)) {
    if (!rows[key]) {
      throw new Error(`Missing scraped row: ${config.label}`);
    }
  }

  return rows;
}

function getBrowserlessWsUrl() {
  const directUrl = String(process.env.BROWSERLESS_WS_URL || '').trim();
  if (directUrl) {
    return directUrl;
  }

  const token = String(process.env.BROWSERLESS_TOKEN || '').trim();
  if (!token) {
    return null;
  }

  const baseUrl = String(process.env.BROWSERLESS_BASE_URL || 'wss://production-sfo.browserless.io').trim().replace(/\/$/, '');
  return `${baseUrl}?token=${encodeURIComponent(token)}`;
}

async function withTimeout(promise, timeoutMs, label) {
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}.`)), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  TARGET_URL,
  ROWS,
  normalizeText,
  normalizeKey,
  parseNumber,
  mapExtractedRows,
  getBrowserlessWsUrl,
  withTimeout
};
