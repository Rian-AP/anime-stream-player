import { onRequestGet as handleStream } from './functions/api/stream.js';
import { onRequestGet as handleSearch } from './functions/api/search.js';
import { onRequestGet as handleEpisodes } from './functions/api/episodes.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/stream') {
      return handleStream({ request, env });
    }
    if (url.pathname === '/api/search') {
      return handleSearch({ request, env });
    }
    if (url.pathname === '/api/episodes') {
      return handleEpisodes({ request, env });
    }

    // Serve static files from /public via Cloudflare Assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
