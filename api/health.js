const { TARGET_URL, getBrowserlessWsUrl } = require('./_shared/prices');

module.exports = async function handler(req, res) {
  const wsUrl = getBrowserlessWsUrl();

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    provider: 'nadirdoviz-browserless',
    targetUrl: TARGET_URL,
    browserlessConfigured: Boolean(wsUrl),
    browserlessEndpoint: wsUrl ? wsUrl.replace(/\?.*$/, '') : null
  });
};
