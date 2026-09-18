/**
 * Proxy trang donate public từ app.liveqr.me lên liveqr.me.
 */
const APP_ORIGIN = 'https://app.liveqr.me';

function shouldProxy(pathname) {
  return pathname.startsWith('/@') || pathname.startsWith('/_next/');
}

async function proxyToApp(request) {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, APP_ORIGIN);
  const headers = new Headers(request.headers);
  headers.set('Host', 'app.liveqr.me');
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

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (shouldProxy(url.pathname)) {
    return proxyToApp(context.request);
  }

  return context.next();
}
