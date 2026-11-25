// Smoke test of the built site in dist/woodworking-projects, run after `npm run deploy` (`npm run test:dist`).
// The unit tests run in jsdom and never see what GitHub Pages serves: these check the prerendered pages, their tags,
// the sitemap, the 404 shell, each page's content policy and that every file a page asks for was published.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const SITE_URL = 'https://woodworking-projects.ryan-brock.com';
// Photos live in the images repo, not in the site
const PHOTO_HOST = 'https://raw.githubusercontent.com/';
const dist = 'dist/woodworking-projects';
const projects = JSON.parse(readFileSync(join(dist, 'project-list.json'), 'utf8')).projectsByYear;

const htmlFiles = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? htmlFiles(join(dir, entry.name)) : entry.name.endsWith('.html') ? [join(dir, entry.name)] : []);

/** Every prerendered page by its URL path ('/' for home, '/2024/owl/' for a project), not the shells. */
const pages = htmlFiles(dist)
  .filter(file => file.endsWith(`${sep}index.html`))
  .map(file => {
    const dir = relative(dist, file).split(sep).slice(0, -1).join('/');
    return { path: dir ? `/${dir}/` : '/', file, html: readFileSync(file, 'utf8') };
  });

const tag = (html, pattern) => pattern.exec(html)?.[1];
const canonical = html => tag(html, /<link rel="canonical" href="([^"]*)"/);
const meta = (html, key) => tag(html, new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`));
const unescape = text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");

describe('pages', () => {
  it('should have prerendered home, every year, project and photo', () => {
    const paths = pages.map(page => page.path);
    const has = path => paths.includes(path);
    const missing = [
      ...(has('/') ? [] : ['/']),
      ...projects.flatMap(group => [
        ...(has(`/${group.year}/`) ? [] : [`/${group.year}/`]),
        // A project's slug is the app's business; its photo pages just need to share one project folder under the
        // year. A photo can be in more than one project, so each photo may have pages in several folders
        ...group.projects.flatMap(project => {
          const foldersOf = image => new Set(paths
            .filter(path => path.startsWith(`/${group.year}/`) && path.endsWith(`/photo/${image.name}/`) && path.split('/').length === 6)
            .map(path => path.split('/')[2]));
          const perPhoto = project.images.map(foldersOf);
          const shared = perPhoto.reduce((all, folders) => new Set([...all].filter(folder => folders.has(folder))), perPhoto[0] ?? new Set());
          return [
            ...project.images.filter((_, index) => perPhoto[index].size === 0).map(image => `${group.year} ${project.name} photo ${image.name}`),
            ...(project.images.length > 0 && shared.size === 0 ? [`${group.year} ${project.name}: no one folder holds all its photos`] : []),
            ...([...shared].some(folder => has(`/${group.year}/${folder}/`)) || project.images.length === 0 ? [] : [`${group.year} ${project.name}: no project page`]),
          ];
        }),
        ...(group.images ?? []).filter(image => !has(`/${group.year}/photo/${image.name}/`)).map(image => `${group.year} photo ${image.name}`),
      ]),
    ];

    assert.deepEqual(missing, []);
  });

  it('should give each page its own title, description and canonical, matching its address', () => {
    const problems = pages.flatMap(({ path, html }) => {
      const url = `${SITE_URL}${path}`;
      return [
        !/<title>[^<]+<\/title>/.test(html) && `${path}: no title`,
        !meta(html, 'description') && `${path}: no description`,
        decodeURI(canonical(html) ?? '') !== url && `${path}: canonical ${canonical(html)}`,
        decodeURI(meta(html, 'og:url') ?? '') !== url && `${path}: og:url ${meta(html, 'og:url')}`,
      ].filter(Boolean);
    });

    assert.deepEqual(problems, []);
    const canonicals = pages.map(page => canonical(page.html));
    assert.equal(new Set(canonicals).size, canonicals.length, 'two pages share a canonical');
  });

  it('should preview each photo page with a photo from the images repo', () => {
    const problems = pages.filter(page => /\/photo\/[^/]+\/$/.test(page.path)).flatMap(({ path, html }) => {
      const image = meta(html, 'og:image');
      return !image ? [`${path}: no og:image`] : !unescape(image).startsWith(PHOTO_HOST) ? [`${path}: og:image ${image}`] : [];
    });

    assert.deepEqual(problems, []);
  });
});

describe('404 shell and domain', () => {
  it("should exist with the home page's title", () => {
    const shell = readFileSync(join(dist, '404.html'), 'utf8');
    const home = pages.find(page => page.path === '/');

    assert.equal(tag(shell, /<title>([^<]*)<\/title>/), tag(home.html, /<title>([^<]*)<\/title>/));
    assert.match(shell, /<app-root/);
  });

  it('should publish the CNAME for the custom domain', () => {
    assert.equal(readFileSync(join(dist, 'CNAME'), 'utf8').trim(), new URL(SITE_URL).host);
  });
});

describe('sitemap and robots', () => {
  it('should list every indexed page and nothing else', () => {
    const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
    const listed = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, url]) => decodeURI(url)).sort();
    const indexed = pages
      .filter(page => !/<meta name="robots" content="noindex"/.test(page.html))
      .map(page => `${SITE_URL}${page.path}`)
      .sort();

    assert.deepEqual(listed, indexed);
  });

  it('should list only mid-size photos from the images repo, and some', () => {
    const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
    const images = [...sitemap.matchAll(/<image:loc>([^<]*)<\/image:loc>/g)].map(([, url]) => decodeURI(url.replace(/&amp;/g, '&')));

    assert.match(sitemap, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
    assert.ok(images.length > 0, 'no images in the sitemap');
    for (const image of images) {
      assert.ok(image.startsWith(PHOTO_HOST), `${image} is not from the images repo`);
      assert.match(image, /-900x1200\.webp$/, `${image} is not the mid-size copy`);
    }
  });

  it('should point robots.txt at the sitemap', () => {
    assert.match(readFileSync(join(dist, 'robots.txt'), 'utf8'), new RegExp(`Sitemap: ${SITE_URL}/sitemap.xml`));
  });
});

describe('web app manifest', () => {
  it("should name the site and point at a published icon", () => {
    const manifest = JSON.parse(readFileSync(join(dist, 'site.webmanifest'), 'utf8'));
    const home = pages.find(page => page.path === '/');

    assert.equal(manifest.name, tag(home.html, /<title>([^<]*)<\/title>/));
    assert.equal(manifest.start_url, '/');
    assert.ok(manifest.icons.length > 0, 'no icons');
    for (const icon of manifest.icons) {
      assert.ok(existsSync(join(dist, icon.src)), `${icon.src} is not published`);
    }
  });
});

describe('feed', () => {
  const feed = readFileSync(join(dist, 'feed.xml'), 'utf8');
  const entries = [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => entry);

  it('should list the newest work first, each entry a published page', () => {
    assert.match(feed, /<feed xmlns="http:\/\/www\.w3\.org\/2005\/Atom">/);
    assert.ok(entries.length > 0 && entries.length <= 50, `${entries.length} entries`);

    const updated = entries.map(entry => /<updated>([^<]*)<\/updated>/.exec(entry)[1]);
    assert.deepEqual(updated, [...updated].sort().reverse());
    for (const entry of entries) {
      const url = /<link href="([^"]*)"\/>/.exec(entry)[1].replace(/&amp;/g, '&');
      assert.ok(url.startsWith(`${SITE_URL}/`), `${url} is not on the site`);
      // Entries link to the prerendered route as it is, so the path names its folder
      const path = url.slice(SITE_URL.length);
      assert.ok(existsSync(join(dist, path, 'index.html')), `${path} is not a published page`);
    }
  });

  it('should be linked from every page', () => {
    assert.match(readFileSync(join(dist, 'index.html'), 'utf8'), /<link rel="alternate" type="application\/atom\+xml" href="feed\.xml"/);
  });
});

describe('published files', () => {
  /** Site-relative references in a page or stylesheet: src, href, srcset entries and css url()s. */
  function references(text) {
    const attributes = [...text.matchAll(/\s(?:src|href|ngSrc)="([^"]+)"/g)].map(([, value]) => value);
    const srcsets = [...text.matchAll(/\ssrcset="([^"]+)"/g)].flatMap(([, value]) => value.split(',').map(part => part.trim().split(/\s+/)[0]));
    const urls = [...text.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(([, value]) => value);
    return [...attributes, ...srcsets, ...urls]
      .map(unescape)
      .filter(value => !/^(?:[a-z]+:|#|\/\/)/i.test(value) || value.startsWith(SITE_URL))
      .map(value => value.replace(SITE_URL, '').split(/[?#]/)[0])
      .filter(value => value !== '' && value !== '/');
  }

  it('should have published every file the pages and stylesheets ask for', () => {
    const stylesheets = readdirSync(dist).filter(name => name.endsWith('.css'));
    const sources = [
      ...pages.map(page => ({ from: page.path, text: page.html })),
      ...stylesheets.map(name => ({ from: name, text: readFileSync(join(dist, name), 'utf8') })),
    ];
    const missing = new Set(sources.flatMap(({ from, text }) => references(text)
      // Pages have <base href="/">, so every reference is from the site root
      .map(reference => decodeURI(reference).replace(/^\.?\//, ''))
      .filter(file => !existsSync(join(dist, file)))
      .filter(file => !/\/$/.test(file) && !existsSync(join(dist, file, 'index.html')))
      .map(file => `${from}: ${file}`)));

    assert.deepEqual([...missing], []);
  });
});

describe('content policy', () => {
  const policy = html => unescape(tag(html, /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/) ?? '');

  it("should give every page a policy allowing its inline scripts by hash, and nothing inline otherwise", () => {
    const problems = htmlFiles(dist).flatMap(file => {
      const html = readFileSync(file, 'utf8');
      const scriptSrc = policy(html).split(';').map(part => part.trim()).find(part => part.startsWith('script-src')) ?? '';
      if (!scriptSrc) {
        return [`${relative(dist, file)}: no content policy`];
      }
      return [
        ...(/'unsafe-inline'/.test(scriptSrc) ? [`${relative(dist, file)}: unsafe-inline scripts`] : []),
        ...[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
          .filter(([, attributes, body]) => !/\bsrc=/.test(attributes) && body.trim() !== ''
            && ['', 'module', 'text/javascript'].includes(/\btype="([^"]*)"/.exec(attributes)?.[1] ?? ''))
          .map(([, , body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`)
          .filter(hash => !scriptSrc.includes(hash))
          .map(hash => `${relative(dist, file)}: ${hash}`),
      ];
    });

    assert.deepEqual(problems, []);
  });

  it('should load fonts and styles only from the site itself, and photos only from the images repo', () => {
    const csp = policy(readFileSync(join(dist, 'index.html'), 'utf8'));

    assert.match(csp, /font-src 'self'(;|$)/);
    assert.match(csp, /style-src 'self' 'unsafe-inline'(;|$)/);
    assert.match(csp, /img-src 'self' data: https:\/\/raw\.githubusercontent\.com(;|$)/);
  });
});
