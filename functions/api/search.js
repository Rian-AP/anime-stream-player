export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const rawQ = url.searchParams.get('q') || '';
  const q = rawQ.trim();

  // If query is empty or 1 character, don't query upstream at all
  if (!q || q.length < 2) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  }

  try {
    let items = [];

    // 1. Primary: Use dedicated /search?q= for queries with 3+ characters
    if (q.length >= 3) {
      try {
        const sRes = await fetch(`https://api.yani.tv/search?q=${encodeURIComponent(q)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (sRes.ok) {
          const sJson = await sRes.json();
          if (Array.isArray(sJson?.response) && sJson.response.length > 0) {
            items = sJson.response;
          }
        }
      } catch (err) {}
    }

    // 2. Fallback: Use /anime?limit=20&q= for 2-character queries or if /search returned nothing
    if (items.length === 0) {
      const aRes = await fetch(`https://api.yani.tv/anime?limit=20&q=${encodeURIComponent(q)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (aRes.ok) {
        const aJson = await aRes.json();
        if (Array.isArray(aJson?.response)) {
          items = aJson.response;
        }
      }
    }

    const results = items.map(item => {
      let posterUrl = null;
      if (item.poster) {
        const raw = item.poster.medium || item.poster.small || item.poster.big || item.poster.fullsize;
        if (raw) posterUrl = raw.startsWith('//') ? 'https:' + raw : raw;
      }

      return {
        anime_id: item.anime_id,
        title: item.title,
        orig_title: item.anime_url || null,
        year: item.year,
        type: item.type?.name || 'TV',
        rating: item.rating?.average ? item.rating.average.toFixed(1) : null,
        poster: posterUrl
      };
    });

    return new Response(JSON.stringify({ results }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, results: [] }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      }
    });
  }
}
