// Runs after `ng build`: writes sitemap.xml from the prerendered pages and adds the
// 404.html fallback GitHub Pages serves for any path that has no file.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
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

console.log(`sitemap.xml: ${urls.length} urls, 404.html: copied from index.csr.html`);
