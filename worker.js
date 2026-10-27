import { onRequestGet } from './functions/api/stream.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API Route: /api/stream
    if (url.pathname === '/api/stream') {
      return onRequestGet({ request, env });
    }

    // Serve static files from /public via Cloudflare Assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
