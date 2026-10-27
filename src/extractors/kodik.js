const https = require('https');

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
 * Decodes Caesar cipher + Base64 encoded Kodik stream URLs.
 * Formula from Kodik app.player_single.js:
 * e.src.replace(/[a-zA-Z]/g, (c) => ((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 18) ? c : c - 26))
 */
function decodeKodikLink(encoded) {
  if (!encoded || typeof encoded !== 'string') return null;
  if (encoded.startsWith('http://') || encoded.startsWith('https://') || encoded.startsWith('//')) {
    return encoded.startsWith('//') ? 'https:' + encoded : encoded;
  }
  try {
    const rotated = encoded.replace(/[a-zA-Z]/g, (c) => {
      const max = c <= 'Z' ? 90 : 122;
      const code = c.charCodeAt(0) + 18;
      return String.fromCharCode(max >= code ? code : code - 26);
    });
    return Buffer.from(rotated, 'base64').toString('utf8');
  } catch (err) {
    return null;
  }
}

/**
 * Extracts HLS streams from a Kodik player iframe URL.
 * 
 * @param {string} iframeUrl - Kodik player iframe URL from yani.tv
 * @returns {Promise<Object|null>} Extracted Kodik stream details
 */
async function extractKodik(iframeUrl) {
  const normalizedUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  
  // Step 1: Fetch HTML page to obtain security signatures and vInfo metadata
  const pageRes = await request(normalizedUrl, {
    headers: {
      'Referer': 'https://yummyani.me/',
      'Origin': 'https://yummyani.me'
    }
  });

  const html = pageRes.data;

  // Parse required signatures
  const dMatch = html.match(/var\s+domain\s*=\s*"([^"]+)";/);
  const dSignMatch = html.match(/var\s+d_sign\s*=\s*"([^"]+)";/);
  const pdMatch = html.match(/var\s+pd\s*=\s*"([^"]+)";/);
  const pdSignMatch = html.match(/var\s+pd_sign\s*=\s*"([^"]+)";/);
  const refMatch = html.match(/var\s+ref\s*=\s*"([^"]+)";/);
  const refSignMatch = html.match(/var\s+ref_sign\s*=\s*"([^"]+)";/);

  const typeMatch = html.match(/vInfo\.type\s*=\s*'([^']+)';/);
  const hashMatch = html.match(/vInfo\.hash\s*=\s*'([^']+)';/);
  const idMatch = html.match(/vInfo\.id\s*=\s*'([^']+)';/);

  const titleMatch = html.match(/var\s+translationTitle\s*=\s*"([^"]+)";/);

  if (!dMatch || !dSignMatch || !typeMatch || !hashMatch || !idMatch) {
    throw new Error('Failed to extract Kodik parameters from player HTML');
  }

  const postParams = {
    d: dMatch[1],
    d_sign: dSignMatch[1],
    pd: pdMatch ? pdMatch[1] : 'kodikplayer.com',
    pd_sign: pdSignMatch ? pdSignMatch[1] : '',
    ref: refMatch ? refMatch[1] : 'https%3A%2F%2Fyummyani.me%2F',
    ref_sign: refSignMatch ? refSignMatch[1] : '',
    bad_user: 'false',
    cdn_is_working: 'true',
    type: typeMatch[1],
    hash: hashMatch[1],
    id: idMatch[1]
  };

  const postBody = new URLSearchParams(postParams).toString();

  // Step 2: POST /ftor on the Kodik player host
  const parsedHost = new URL(normalizedUrl).origin;
  const ftorRes = await request(`${parsedHost}/ftor`, {
    method: 'POST',
    headers: {
      'Referer': normalizedUrl,
      'Origin': parsedHost,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: postBody
  });

  const ftorData = JSON.parse(ftorRes.data);
  const rawLinks = ftorData.links || {};
  const qualities = {};

  for (const q of Object.keys(rawLinks)) {
    const list = rawLinks[q];
    if (Array.isArray(list) && list.length > 0) {
      const decoded = decodeKodikLink(list[0].src);
      if (decoded) {
        qualities[`${q}p`] = decoded;
      }
    }
  }

  // Best available quality for primary HLS URL
  const preferredQualities = ['720p', '480p', '360p', '240p'];
  let primaryHls = null;
  for (const pq of preferredQualities) {
    if (qualities[pq]) {
      primaryHls = qualities[pq];
      break;
    }
  }

  return {
    player: 'kodik',
    player_id: 4,
    voice: titleMatch ? titleMatch[1] : 'Озвучка',
    hls_url: primaryHls,
    qualities
  };
}

module.exports = { extractKodik, decodeKodikLink };
