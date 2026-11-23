// Runs after `ng build`: writes sitemap.xml from the prerendered pages and adds the
// 404.html fallback GitHub Pages serves for any path that has no file.
import { createHash } from 'node:crypto';
import { copyFileSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE_URL = 'https://woodworking-projects.ryan-brock.com';
const dist = 'dist/woodworking-projects';

const { routes } = JSON.parse(readFileSync(join(dist, 'prerendered-routes.json'), 'utf8'));

// Photos are named YYYYMMDD_HHMM, so a page was last changed when its newest photo was taken.
function newestPhotoDate(html) {
  const dates = [...html.matchAll(/<img [^>]*src="[^"]*\/(\d{4})(\d{2})(\d{2})_\d{4}[^"]*"/g)]
    .filter(([, , month, day]) => month >= 1 && month <= 12 && day >= 1 && day <= 31)
    .map(([, year, month, day]) => `${year}-${month}-${day}`)
    .sort();

  return dates.at(-1);
}

const pages = Object.keys(routes)
  .map(route => ({ route, html: readFileSync(join(dist, route, 'index.html'), 'utf8') }))
  .filter(({ html }) => !/<meta name="robots" content="noindex"/.test(html))
  .map(({ route, html }) => ({ route, lastmod: newestPhotoDate(html) }));

// Pages with no photos of their own, like home, change whenever any project does.
const newest = pages.map(page => page.lastmod).filter(Boolean).sort().at(-1) ?? new Date().toISOString().slice(0, 10);

const urls = pages
  .map(({ route, lastmod }) => ({ url: route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}/`, lastmod: lastmod ?? newest }))
  .map(({ url, lastmod }) => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`);

writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
);

copyFileSync(join(dist, 'index.csr.html'), join(dist, '404.html'));

// A build file, not part of the site; read above and not published
rmSync(join(dist, 'prerendered-routes.json'));

// GitHub Pages can't send security headers, so every page carries its content policy in a meta tag: only this
// site's own scripts plus the build's inline ones (allowed by hash, so a script slipped into a page can't run),
// fonts from Google Fonts, photos from the images repo, and no plugins. (Framing protection and HSTS need real
// headers, which a meta tag can't give.)
const htmlFiles = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? htmlFiles(join(dir, entry.name)) : entry.name.endsWith('.html') ? [join(dir, entry.name)] : []);
const files = htmlFiles(dist);
const scriptHashes = new Set();
for (const file of files) {
  for (const [, attributes, body] of readFileSync(file, 'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const type = /\btype="([^"]*)"/.exec(attributes)?.[1] ?? '';
    if (!/\bsrc=/.test(attributes) && body.trim() !== '' && (type === '' || type === 'module' || type === 'text/javascript')) {
      scriptHashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`);
    }
  }
}
const csp = [
  "default-src 'self'",
  `script-src 'self' ${[...scriptHashes].sort().join(' ')}`.trim(),
  // Angular and the critical-CSS step write style attributes and <style> blocks, so inline styles stay allowed
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://raw.githubusercontent.com",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');
const securityTags = `<meta http-equiv="Content-Security-Policy" content="${csp}">`
  + '<meta name="referrer" content="strict-origin-when-cross-origin">';
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('<meta charset="utf-8">')) {
    throw new Error(`${file} has no <meta charset="utf-8"> to put the content policy after`);
  }
  writeFileSync(file, html.replace('<meta charset="utf-8">', `<meta charset="utf-8">${securityTags}`));
}

console.log(`sitemap.xml: ${urls.length} urls, 404.html: copied from index.csr.html, content policy: ${files.length} pages, ${scriptHashes.size} inline script hashes`);
