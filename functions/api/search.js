export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const rawQ = url.searchParams.get('q') || '';
  const q = rawQ.trim();

  if (!q) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    let list = [];

    // Strategy 1: Try the dedicated /search endpoint first if query length >= 3
    if (q.length >= 3) {
      try {
        const sRes = await fetch(`https://api.yani.tv/search?q=${encodeURIComponent(q)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (sRes.ok) {
          const sData = await sRes.json();
          if (Array.isArray(sData?.response) && sData.response.length > 0) {
            list = sData.response;
          }
        }
      } catch (e) {}
    }

    // Strategy 2: Fallback to /anime?limit=15&q=
    if (list.length === 0) {
      const aRes = await fetch(`https://api.yani.tv/anime?limit=15&q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (aRes.ok) {
        const aData = await aRes.json();
        if (Array.isArray(aData?.response) && aData.response.length > 0) {
          list = aData.response;
        }
      }
    }

    // Double check: filter out completely irrelevant matches if API returned generic catalog
    const qLower = q.toLowerCase();
    const filtered = list.filter(item => {
      const t = (item.title || '').toLowerCase();
      const orig = Array.isArray(item.other_titles) ? item.other_titles.join(' ').toLowerCase() : '';
      const alias = (item.anime_url || '').toLowerCase();
      // Match if query words overlap with title, aliases or original titles
      return t.includes(qLower) || orig.includes(qLower) || alias.includes(qLower);
    });

    const finalItems = filtered.length > 0 ? filtered : list.slice(0, 10);

    const results = finalItems.map(item => {
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
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, results: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
