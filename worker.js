import { onRequestGet } from './functions/api/stream.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Pure API Route: /api/stream
    if (url.pathname === '/api/stream') {
      return onRequestGet({ request, env });
    }

    return new Response(JSON.stringify({
      status: "ok",
      service: "AniPocket API Backend",
      endpoints: {
        stream: "/api/stream?anime_id={id}&episode={number}"
      }
    }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
