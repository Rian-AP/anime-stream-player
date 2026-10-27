const https = require('https');

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://ru.yummyani.me/',
      'Origin': 'https://ru.yummyani.me',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse JSON response: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Extracts video streams from a CVH (CDNVideohub / AnimeLib) player URL.
 * 
 * Sample iframeUrl:
 * //ru.yummyani.me/iframeCVH.html?dubbing_code=Reanimedia&anime_id=1689&episode=1&dubbing=%D0%94%D1%83%D0%B1%D0%BB%D1%8F%D0%B6+Reanimedia
 * 
 * @param {string} iframeUrl - The CVH iframe URL from yani.tv
 * @returns {Promise<Array>} List of extracted streams with voice, quality and URLs
 */
async function extractCVH(iframeUrl) {
  const normalizedUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
  const parsed = new URL(normalizedUrl);
  const animeId = parsed.searchParams.get('anime_id');
  const episode = parsed.searchParams.get('episode') || '1';
  const targetVoice = parsed.searchParams.get('dubbing_code');

  if (!animeId) {
    throw new Error('CVH URL is missing anime_id parameter');
  }

  // Step 1: Query playlist metadata for this title
  const playlistUrl = `https://plapi.cdnvideohub.com/api/v1/player/sv/playlist?pub=745&id=${animeId}&aggr=mali`;
  const playlist = await requestJson(playlistUrl);

  if (!playlist || !Array.isArray(playlist.items) || playlist.items.length === 0) {
    return [];
  }

  const results = [];

  // Filter items matching the voice or take all if none matches
  let itemsToFetch = playlist.items;
  if (targetVoice) {
    const matching = playlist.items.filter(item => 
      (item.voiceStudio && item.voiceStudio.toLowerCase() === targetVoice.toLowerCase()) ||
      (item.voiceType && item.voiceType.toLowerCase() === targetVoice.toLowerCase())
    );
    if (matching.length > 0) itemsToFetch = matching;
  }

  // Step 2: Fetch streams for each voice
  for (const item of itemsToFetch) {
    if (!item.vkId) continue;

    try {
      const videoDataUrl = `https://plapi.cdnvideohub.com/api/v1/player/sv/video/${item.vkId}`;
      const videoData = await requestJson(videoDataUrl);

      if (videoData && videoData.sources) {
        results.push({
          player: 'cvh',
          player_id: 3,
          title: playlist.titleName,
          voice: item.voiceStudio || item.voiceType || 'Оригинал',
          voice_type: item.voiceType || null,
          episode: parseInt(episode, 10),
          duration: videoData.duration || 0,
          hls_url: videoData.sources.hlsUrl || null,
          dash_url: videoData.sources.dashUrl || null,
          qualities: {
            '1080p': videoData.sources.mpegFullHdUrl || null,
            '720p': videoData.sources.mpegHighUrl || null,
            '480p': videoData.sources.mpegMediumUrl || null,
            '360p': videoData.sources.mpegLowUrl || null,
            '240p': videoData.sources.mpegLowestUrl || null
          }
        });
      }
    } catch (err) {
      console.warn(`[CVH Extractor] Failed to extract vkId ${item.vkId}:`, err.message);
    }
  }

  return results;
}

module.exports = { extractCVH };
