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
    const res = await fetch(`https://api.yani.tv/anime?take=12&query=${encodeURIComponent(q.trim())}`);
    const data = await res.json();
    const list = data?.response || [];

    const results = list.map(item => ({
      anime_id: item.anime_id,
      title: item.title,
      year: item.year,
      type: item.type?.name || 'TV',
      rating: item.rating?.average ? item.rating.average.toFixed(1) : null,
      poster: item.poster?.medium ? (item.poster.medium.startsWith('//') ? 'https:' + item.poster.medium : item.poster.medium) : null
    }));

    return new Response(JSON.stringify({ results }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
