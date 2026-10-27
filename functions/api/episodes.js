export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const animeId = url.searchParams.get('anime_id');

  if (!animeId) {
    return new Response(JSON.stringify({ error: 'Missing anime_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const res = await fetch(`https://api.yani.tv/anime/${animeId}/videos`);
    const data = await res.json();
    const list = data?.response || [];

    const episodesSet = new Set();
    list.forEach(v => {
      let ep = v.data?.number;
      if (ep === null || ep === undefined) {
        const match = (v.iframe_url || '').match(/[?&]episode=(\d+)/);
        if (match) ep = parseInt(match[1], 10);
      }
      if (ep) episodesSet.add(ep);
    });

    const episodes = [...episodesSet].sort((a, b) => a - b);
    if (episodes.length === 0) episodes.push(1); // default single movie/special

    return new Response(JSON.stringify({
      anime_id: parseInt(animeId, 10),
      total_episodes: episodes.length,
      episodes
    }), {
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
