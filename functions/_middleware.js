/**
 * Proxy trang donate public từ app.liveqr.me lên liveqr.me.
 * liveqr.me/@username → nội dung app, URL giữ nguyên trên thanh địa chỉ.
 * liveqr.me/ và asset landing (/, styles.css, …) vẫn phục vụ tĩnh như cũ.
 */
const APP_ORIGIN = 'https://app.liveqr.me';

function shouldProxy(pathname) {
  return pathname.startsWith('/@') || pathname.startsWith('/_next/');
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (!shouldProxy(url.pathname)) {
    return context.next();
  }

  const target = new URL(url.pathname + url.search, APP_ORIGIN);
  const headers = new Headers(context.request.headers);
  headers.set('Host', 'app.liveqr.me');

  const init = {
    method: context.request.method,
    headers,
    redirect: 'manual',
  };

  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    init.body = context.request.body;
  }

  return fetch(new Request(target.toString(), init));
}
