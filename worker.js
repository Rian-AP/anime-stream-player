import { onRequestGet } from './functions/api/stream.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API Route: /api/stream (Clean JSON backend extractor)
    if (url.pathname === '/api/stream') {
      return onRequestGet({ request, env });
    }

    return new Response(JSON.stringify({
      status: "ok",
      service: "Anime Stream Extractor API",
      usage: "/api/stream?anime_id={id}&episode={number}"
    }, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
