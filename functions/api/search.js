export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const rawQ = url.searchParams.get('q') || '';
  const q = rawQ.trim();

  // YummyAnime API requires at least 2 characters for search, otherwise returns random popular
  if (!q || q.length < 2) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      }
    });
  }

  try {
    const targetUrl = `https://api.yani.tv/anime?limit=15&q=${encodeURIComponent(q)}`;
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const data = await res.json();
    const list = data?.response || [];

    const results = list.map(item => {
      let posterUrl = null;
      if (item.poster) {
        const raw = item.poster.medium || item.poster.small || item.poster.big || item.poster.fullsize;
        if (raw) posterUrl = raw.startsWith('//') ? 'https:' + raw : raw;
      }

      // Display original title alongside Russian title if available
      const orig = Array.isArray(item.other_titles) && item.other_titles.length > 0 ? item.other_titles[0] : null;

      return {
        anime_id: item.anime_id,
        title: item.title,
        orig_title: orig,
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
        'Cache-Control': 'public, max-age=600'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, results: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
