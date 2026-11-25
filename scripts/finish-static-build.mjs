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

// Photos live in the images repo, not in the site
const PHOTO_HOST = 'https://raw.githubusercontent.com/';

// The photos a page shows, for the sitemap's image entries: its preview image and every grid or single view photo,
// each as its 900x1200 copy (thumbnails are too small to be worth indexing)
function pageImages(html) {
  const preview = [...html.matchAll(/<meta property="og:image" content="([^"]*)"/g)].map(([, url]) => url);
  const shown = [...html.matchAll(/<img [^>]*\bsrc="([^"]*)"/g)].map(([, url]) => url);
  const urls = [...preview, ...shown]
    .map(url => url.replace(/&amp;/g, '&'))
    .filter(url => url.startsWith(PHOTO_HOST))
    .map(url => url.replace(/-150x200\.jpg$/, '.jpg').replace(/(?<!-900x1200)\.jpg$/, '-900x1200.webp'));

  return [...new Set(urls)];
}

const xmlEscape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Meta tag text as Angular escaped it, back to plain text
const unescapeHtml = text => text.replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const metaContent = (html, attribute) => {
  const match = new RegExp(`<meta ${attribute} content="([^"]*)"`).exec(html);
  return match ? unescapeHtml(match[1]) : '';
};

const pages = Object.keys(routes)
  .map(route => ({ route, html: readFileSync(join(dist, route, 'index.html'), 'utf8') }))
  .filter(({ html }) => !/<meta name="robots" content="noindex"/.test(html))
  .map(({ route, html }) => ({
    route,
    lastmod: newestPhotoDate(html),
    images: pageImages(html),
    title: metaContent(html, 'property="og:title"'),
    description: metaContent(html, 'name="description"'),
    preview: metaContent(html, 'property="og:image"'),
  }));

// Pages with no photos of their own, like home, change whenever any project does.
const newest = pages.map(page => page.lastmod).filter(Boolean).sort().at(-1) ?? new Date().toISOString().slice(0, 10);

// Google reads at most 1,000 images per page
const MAX_IMAGES_PER_PAGE = 1000;
const imageEntry = image => `    <image:image>\n      <image:loc>${xmlEscape(encodeURI(decodeURI(image)))}</image:loc>\n    </image:image>`;
const urls = pages
  .map(({ route, lastmod, images }) => ({ url: route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}/`, lastmod: lastmod ?? newest, images }))
  .map(({ url, lastmod, images }) => [
    '  <url>',
    `    <loc>${xmlEscape(url)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    ...images.slice(0, MAX_IMAGES_PER_PAGE).map(imageEntry),
    '  </url>',
  ].join('\n'));
const imageCount = pages.reduce((count, page) => count + Math.min(page.images.length, MAX_IMAGES_PER_PAGE), 0);

writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`
);

// An Atom feed of the newest work, so followers can subscribe: every project and every photo in no project, newest
// first. A project dates from its newest photo; a loose photo from its own name (YYYYMMDD_HHMM), else its page's.
const FEED_ENTRIES = 50;
const home = pages.find(page => page.route === '/');
const siteTitle = home?.title ?? 'Woodworking Projects';
const isProjectRoute = route => /^\/\d{4}\/[^/]+$/.test(route) && !route.endsWith('/photo');
const loosePhotoName = route => /^\/\d{4}\/photo\/([^/]+)$/.exec(route)?.[1];
const nameDate = name => {
  const match = /^(\d{4})(\d{2})(\d{2})_\d{4}/.exec(decodeURIComponent(name));
  return match && match[2] >= '01' && match[2] <= '12' && match[3] >= '01' && match[3] <= '31' ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
};
const titleSuffix = ` - ${siteTitle}`;
const feedEntries = pages
  .filter(({ route }) => isProjectRoute(route) || loosePhotoName(route))
  .map(page => ({ ...page, updated: (loosePhotoName(page.route) && nameDate(loosePhotoName(page.route))) || page.lastmod || newest }))
  .sort((a, b) => b.updated.localeCompare(a.updated) || a.route.localeCompare(b.route))
  .slice(0, FEED_ENTRIES)
  .map(({ route, updated, title, description, preview }) => {
    const url = xmlEscape(`${SITE_URL}${route}/`);
    const name = title.endsWith(titleSuffix) ? title.slice(0, -titleSuffix.length) : title;
    const picture = preview ? `<p><img src="${preview.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" alt=""></p>` : '';
    const content = `${picture}<p>${xmlEscape(description)}</p>`;
    return [
      '  <entry>',
      `    <id>${url}</id>`,
      `    <title>${xmlEscape(name)}</title>`,
      `    <link href="${url}"/>`,
      `    <updated>${updated}T00:00:00Z</updated>`,
      `    <summary>${xmlEscape(description)}</summary>`,
      `    <content type="html">${xmlEscape(content)}</content>`,
      '  </entry>',
    ].join('\n');
  });

writeFileSync(join(dist, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${xmlEscape(`${SITE_URL}/`)}</id>
  <title>${xmlEscape(siteTitle)}</title>
  <subtitle>${xmlEscape(home?.description ?? '')}</subtitle>
  <link href="${xmlEscape(`${SITE_URL}/`)}"/>
  <link rel="self" href="${xmlEscape(`${SITE_URL}/feed.xml`)}"/>
  <updated>${newest}T00:00:00Z</updated>
  <author><name>${xmlEscape(siteTitle)}</name></author>
${feedEntries.join('\n')}
</feed>
`);

copyFileSync(join(dist, 'index.csr.html'), join(dist, '404.html'));

// A build file, not part of the site; read above and not published
rmSync(join(dist, 'prerendered-routes.json'));

// GitHub Pages can't send security headers, so every page carries its content policy in a meta tag: only this
// site's own scripts plus the build's inline ones (allowed by hash, so a script slipped into a page can't run),
// fonts and styles from the site itself, photos from the images repo, and no plugins. (Framing protection and HSTS need real
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
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
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

console.log(`sitemap.xml: ${urls.length} urls, ${imageCount} images, feed.xml: ${feedEntries.length} entries, 404.html: copied from index.csr.html, content policy: ${files.length} pages, ${scriptHashes.size} inline script hashes`);
