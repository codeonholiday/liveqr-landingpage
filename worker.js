/**
 * LiveQR landing — Worker cho Cloudflare Workers (static assets).
 * Thay cho Pages Functions cũ (functions/_middleware.js) + _redirects + _routes.json.
 *
 * - /@<streamer> và /_next/* → proxy về app.liveqr.me (trang donate public)
 * - Mọi request khác → serve static từ public/ qua binding ASSETS
 *   (asset có sẵn được Cloudflare serve trực tiếp, worker chỉ nhận path không khớp file)
 */
const APP_ORIGIN = 'https://app.liveqr.me';

function shouldProxy(pathname) {
  return pathname.startsWith('/@') || pathname.startsWith('/_next/');
}

async function proxyToApp(request) {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, APP_ORIGIN);
  const headers = new Headers(request.headers);
  headers.set('Host', APP_ORIGIN.replace('https://', ''));
  headers.set('X-Forwarded-Host', url.host);

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  return fetch(new Request(target.toString(), init));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (shouldProxy(url.pathname)) {
      return proxyToApp(request);
    }

    return env.ASSETS.fetch(request);
  },
};
