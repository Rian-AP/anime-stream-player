const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let permutationEngine = null;

/**
 * Initializes and caches the Alloha permutation functions (iS, iQ, iM)
 * extracted from the obfuscated Alloha bundle.
 */
function initPermutationEngine() {
  if (permutationEngine) return permutationEngine;

  const appJsPath = path.join(__dirname, '../../test/app.f950612f.js');
  if (!fs.existsSync(appJsPath)) {
    throw new Error('Alloha bundle not found at ' + appJsPath);
  }

  const appJs = fs.readFileSync(appJsPath, 'utf8');
  const startArr = appJs.indexOf('function a0v(){');
  const a0vCode = appJs.slice(startArr);
  const endInit = appJs.indexOf(';(self[');
  const initCode = appJs.slice(0, endInit !== -1 ? endInit : appJs.indexOf('(self['));
  const startIS = appJs.indexOf('function iS(');
  const startIQ = appJs.indexOf('function iQ(');
  const startIM = appJs.indexOf('function iM(');
  const endIM = appJs.indexOf('function iP()', startIM);

  const context = {};
  const runner = new Function('ctx', `
    ${a0vCode}
    ${initCode}
    function a0M5(v, q) { return a0q(v - -0x5a, q); }
    function M8(v, q) { return a0M5(q - 0x33b, v); }
    ${appJs.slice(startIS, startIQ)}
    ${appJs.slice(startIQ, startIM)}
    ${appJs.slice(startIM, endIM)}
    ctx.iS = iS;
    ctx.iQ = iQ;
    ctx.iM = iM;
  `);

  runner(context);
  permutationEngine = context;
  return permutationEngine;
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(options.headers || {})
      }
    };

    const req = https.request(parsed, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

/**
 * Extracts clean 1080p, 720p, 480p, 360p HLS streams from an Alloha player iframe URL.
 * 
 * @param {string} iframeUrl - Alloha player iframe URL from yani.tv
 * @returns {Promise<Object|null>} Extracted Alloha stream details
 */
async function extractAlloha(iframeUrl) {
  const normalizedUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Step 1: Fetch the Alloha iframe HTML
  const pageRes = await request(normalizedUrl, {
    headers: {
      'Referer': 'https://yummyani.me/',
      'Sec-Fetch-Dest': 'iframe',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'User-Agent': ua
    }
  });

  const html = pageRes.data;
  const fileListMatch = html.match(/const\s+fileList\s*=\s*JSON\.parse\('(.*?)'\);/);
  const viewportiMatch = html.match(/name="viewporti"\s+content="([^"]+)"/);

  if (!fileListMatch || !viewportiMatch) {
    throw new Error('Failed to find fileList or viewporti token in Alloha page');
  }

  const fileList = JSON.parse(fileListMatch[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\"));
  const viewporti = viewportiMatch[1];
  const activeVideo = fileList.active;

  if (!activeVideo || !activeVideo.id) {
    throw new Error('No active video found in Alloha fileList');
  }

  // Step 2: Compute Borth header
  const { iS, iQ, iM } = initPermutationEngine();
  const part2 = iS(iQ(iM(viewporti, false), false), false);

  function cleanUa(u) { return (u || '').replace(/\d+(?:[._]\d+)+/g, ''); }
  const fingerprintParts = [
    cleanUa(ua),
    'Europe/Moscow',
    '1920x1080',
    'ru-RU',
    8,
    16,
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    44100
  ];
  const i1 = crypto.createHash('sha256').update(fingerprintParts.join('||')).digest('hex');
  const borthHeader = `${i1}|${part2}`;

  // Step 3: Extract token from URL params
  const parsedIframe = new URL(normalizedUrl);
  const token = parsedIframe.searchParams.get('token') || '8b5512267a2a52e9de06d67d342e0c';

  // Step 4: POST /bnsi/movies/{id} with jQuery urlencoded format
  const postData = new URLSearchParams({
    token: token,
    autoplay: '0',
    audio: '',
    subtitle: ''
  }).toString();

  const apiRes = await request(`https://alloha.yani.tv/bnsi/movies/${activeVideo.id}`, {
    method: 'POST',
    headers: {
      'Referer': normalizedUrl,
      'Origin': 'https://alloha.yani.tv',
      'User-Agent': ua,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Content-Length': Buffer.byteLength(postData),
      'Borth': borthHeader,
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: postData
  });

  if (apiRes.statusCode !== 200) {
    throw new Error(`Alloha API returned HTTP ${apiRes.statusCode}: ${apiRes.data.slice(0, 200)}`);
  }

  const json = JSON.parse(apiRes.data);
  const hlsSource = json.hlsSource && json.hlsSource[0] ? json.hlsSource[0].quality : null;

  if (!hlsSource) {
    return null;
  }

  const qualities = {};
  if (hlsSource['1080']) qualities['1080p'] = hlsSource['1080'];
  if (hlsSource['720']) qualities['720p'] = hlsSource['720'];
  if (hlsSource['480']) qualities['480p'] = hlsSource['480'];
  if (hlsSource['360']) qualities['360p'] = hlsSource['360'];

  const primaryHls = qualities['1080p'] || qualities['720p'] || qualities['480p'] || null;

  return {
    player: 'alloha',
    player_id: 2,
    voice: activeVideo.translation || 'Озвучка',
    episode: activeVideo.episode || 1,
    hls_url: primaryHls,
    qualities
  };
}

module.exports = { extractAlloha };
