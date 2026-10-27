export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';

  if (!q.trim()) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    // Official YummyAnime parameter is `q`, NOT `query`!
    const targetUrl = `https://api.yani.tv/anime?limit=15&q=${encodeURIComponent(q.trim())}`;
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const data = await res.json();
    const list = data?.response || [];

    const results = list.map(item => ({
      anime_id: item.anime_id,
      title: item.title,
      year: item.year,
      type: item.type?.name || 'TV',
      rating: item.rating?.average ? item.rating.average.toFixed(1) : null,
      poster: item.poster?.medium ? (item.poster.medium.startsWith('//') ? 'https:' + item.poster.medium : item.poster.medium) : (item.poster?.small ? (item.poster.small.startsWith('//') ? 'https:' + item.poster.small : item.poster.small) : null)
    }));

    return new Response(JSON.stringify({ results }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=1800'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
