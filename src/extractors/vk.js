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
 * Extracts HLS streams from VK player iframe URL.
 * 
 * Sample iframeUrl:
 * //ru.yummyani.me/iframeVK.html?id=-214687141_456239052
 * 
 * @param {string} iframeUrl - VK player iframe URL from yani.tv
 * @returns {Promise<Object|null>} Extracted VK stream details
 */
async function extractVK(iframeUrl) {
  const normalizedUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  const parsed = new URL(normalizedUrl);
  let idParam = parsed.searchParams.get('id');

  if (!idParam) {
    throw new Error('VK URL is missing "id" parameter');
  }

  if (idParam.startsWith('video')) {
    idParam = idParam.replace(/^video/, '');
  }

  const [oid, videoId] = idParam.split('_');
  if (!oid || !videoId) {
    throw new Error(`Invalid VK video id format: ${idParam}`);
  }

  // Bypass VK login redirect loop using authorized embed parameters
  const vkEmbedUrl = `https://vk.ru/video_ext.php?oid=${oid}&id=${videoId}&force_new_embed=1&partner_name=viqeo`;

  const res = await request(vkEmbedUrl, {
    headers: {
      'Referer': 'https://cdn.viqeo.tv/',
      'Origin': 'https://cdn.viqeo.tv'
    }
  });

  const html = res.data;
  const m3u8Matches = html.match(/https?:\\\/\\\/[^"']+\.m3u8[^"']*/g) || html.match(/https?:\/\/[^"']+\.m3u8[^"']*/g) || [];

  if (m3u8Matches.length === 0) {
    return null;
  }

  // Normalize m3u8 URLs
  const cleanM3u8List = [...new Set(m3u8Matches.map(u => u.replace(/\\\//g, '/')))];

  return {
    player: 'vk',
    player_id: 8,
    voice: 'VK Video',
    hls_url: cleanM3u8List[0],
    sources: cleanM3u8List
  };
}

module.exports = { extractVK };
