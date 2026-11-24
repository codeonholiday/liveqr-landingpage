/**
 * LiveQR landing — Worker cho Cloudflare Workers (static assets).
 * Thay cho Pages Functions cũ (functions/_middleware.js) + _redirects + _routes.json.
 *
 * - /@<streamer> và /_next/* → proxy về app.liveqr.me (trang donate public)
 * - /sitemap.xml → sitemap tĩnh (public/sitemap.xml) ghép thêm /@<streamer>
 *   lấy từ API public directory (api.liveqr.me) để Google index toàn bộ
 *   trang donate mà không cần submit từng URL
 * - Mọi request khác → serve static từ public/ qua binding ASSETS
 *   (asset có sẵn được Cloudflare serve trực tiếp, worker chỉ nhận path không khớp file)
 */

// Port 443 khai báo tường minh: subrequest từ Worker (zone liveqr.me) sang
// hostname cùng zone từng bị Cloudflare đưa xuống port 80 khi zone còn bật
// SSL mode Flexible, dính redirect HTTP→HTTPS của nginx (301) thay vì proxied.
const APP_ORIGIN = 'https://app.liveqr.me:443';
const APP_HOST = 'app.liveqr.me';
const API_ORIGIN = 'https://api.liveqr.me:443';
const SITE_ORIGIN = 'https://liveqr.me';

function shouldProxy(pathname) {
  return pathname.startsWith('/@') || pathname.startsWith('/_next/');
}

async function proxyToApp(request) {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, APP_ORIGIN);
  const headers = new Headers(request.headers);
  headers.set('Host', APP_HOST);
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

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** Danh sách username public cho sitemap — API lỗi thì trả rỗng,
 *  worker fallback về sitemap tĩnh. */
async function fetchDirectoryUsernames() {
  try {
    const response = await fetch(`${API_ORIGIN}/api/v1/public/directory`, {
      headers: { accept: 'application/json' },
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!response.ok) return [];
    const { usernames } = await response.json();
    return Array.isArray(usernames)
      ? usernames.filter((name) => typeof name === 'string' && name.length > 0)
      : [];
  } catch {
    return [];
  }
}

async function handleSitemap(env) {
  const staticResponse = await env.ASSETS.fetch(
    new Request(`${SITE_ORIGIN}/sitemap.xml`),
  );
  if (!staticResponse.ok) return staticResponse;

  let xml = await staticResponse.text();
  const usernames = await fetchDirectoryUsernames();
  if (usernames.length > 0) {
    const entries = usernames
      .map(
        (username) =>
          `  <url>\n    <loc>${SITE_ORIGIN}/@${escapeXml(username)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
      )
      .join('\n');
    xml = xml.replace('</urlset>', `${entries}\n</urlset>`);
  }

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/sitemap.xml') {
      return handleSitemap(env);
    }
    if (shouldProxy(url.pathname)) {
      return proxyToApp(request);
    }

    return env.ASSETS.fetch(request);
  },
};
