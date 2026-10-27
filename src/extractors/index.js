const https = require('https');
const { extractAlloha } = require('./alloha');
const { extractCVH } = require('./cvh');
const { extractKodik } = require('./kodik');
const { extractVK } = require('./vk');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Extracts all available video streams for a given anime and episode across all players.
 *
 * @param {number|string} animeId - YummyAnime anime ID
 * @param {number|string} episode - Episode number (default 1)
 * @returns {Promise<Object>} Aggregated streams and skips info
 */
async function extractAllStreams(animeId, episode = 1) {
  const targetEpisode = parseInt(episode, 10) || 1;

  // 1. Fetch videos list and skips from YummyAnime API
  const [videosData, skipsData] = await Promise.all([
    fetchJson(`https://api.yani.tv/anime/${animeId}/videos`),
    fetchJson(`https://api.yani.tv/anime/${animeId}/skips`).catch(() => null)
  ]);

  const rawVideos = videosData?.response || [];
  
  // Filter videos for the requested episode (or movies where episode is null/1)
  const episodeVideos = rawVideos.filter(v => {
    const ep = v.data?.number;
    return ep === targetEpisode || ep === null || ep === undefined;
  });

  // Skips for this episode
  const episodeSkips = skipsData?.response?.find(s => s.episode === targetEpisode) || null;

  // 2. Run extractors in parallel with timing
  const extractionTasks = episodeVideos.map(async (v) => {
    const pId = v.data?.player_id;
    const iframeUrl = v.iframe_url;
    const start = Date.now();

    try {
      let result = null;
      if (pId === 2) {
        result = await extractAlloha(iframeUrl);
      } else if (pId === 3) {
        const list = await extractCVH(iframeUrl);
        result = list && list.length > 0 ? list[0] : null;
      } else if (pId === 4) {
        result = await extractKodik(iframeUrl);
      } else if (pId === 8) {
        result = await extractVK(iframeUrl);
      }

      const elapsed = Date.now() - start;

      if (result && result.hls_url) {
        return {
          ...result,
          voice: v.data?.dubbing || result.voice,
          source_player_id: pId,
          source_player_name: v.data?.player,
          time_ms: elapsed
        };
      }
      return null;
    } catch (err) {
      return {
        error: err.message,
        source_player_id: pId,
        source_player_name: v.data?.player,
        voice: v.data?.dubbing,
        time_ms: Date.now() - start
      };
    }
  });

  const settled = await Promise.all(extractionTasks);
  const streams = settled.filter(s => s && s.hls_url);
  const errors = settled.filter(s => s && s.error);

  return {
    anime_id: animeId,
    episode: targetEpisode,
    skips: episodeSkips,
    total_streams: streams.length,
    streams,
    errors
  };
}

module.exports = { extractAllStreams };
