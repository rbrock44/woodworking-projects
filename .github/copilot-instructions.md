# Woodworking Projects

Angular 22 site showcasing woodworking projects by year, with a photo gallery per project. Built with
`outputMode: "static"`, so every year and project page is prerendered to its own `index.html` and served from
GitHub Pages at `woodworking-projects.ryan-brock.com`. No backend.

## Commands

- Install: `npm ci` (Node version in `.nvmrc`)
- Dev server: `npm start` (port 4201)
- Test all: `npm test` (Karma + Jasmine), or `npx ng test --watch=false --browsers=ChromeHeadless` as CI runs it
- Build: `npm run deploy` — `ng build` (prerenders every route) then `scripts/finish-static-build.mjs`, which
  writes `sitemap.xml` and copies `index.csr.html` to `404.html`. Output in `dist/woodworking-projects/`
- Deploy: CI only, `.github/workflows/deploy.yml` on push to `master` (tests, build, `peaceiris/actions-gh-pages`)

## Data

- `public/project-list.json` is the whole dataset: `projectsByYear[] -> projects[] -> images[]`. Shapes are in
  `src/app/type/project.type.ts`. It is produced with the `generate-json.ps1` script in the sibling
  [woodworking-projects-images](https://github.com/rbrock44/woodworking-projects-images) repo, which also hosts the
  photos (served from `raw.githubusercontent.com`)
- Image names are `YYYYMMDD_HHMM`; `projectMonthRange` reads the date from them. Thumbnails are the same URL with a
  `-150x200.jpg` suffix (`createThumbnailImageUrl`), made by the images repo's `create-thumbnails.ps1`
- A project's URL is `/<year>/<slug>` where the slug comes from `projectSlug(name)`, so renaming a project changes its URL

## Architecture

- `AppComponent` owns all view state (selected year/project, search, favorites) and picks the view from the URL.
  The routes in `app.routes.ts` only decide which URLs are valid; view changes move the URL with `Location`, not the router
- Prerendering: `app.routes.server.ts` lists every year and project from `project-list.server.ts` (reads the JSON
  at build time). On the server `AppComponent` renders the page from the `PROJECT_LIST` token and puts the list in
  `TransferState`; the browser reads it back so its first render matches without a fetch, falling back to
  `getProjects()` (fetches `project-list.json`) when there is no state, e.g. `ng serve`
- No hydration — the browser re-renders over the prerendered markup. Router initial navigation is blocking so that
  first render already has the URL
- `prepareProjects` sorts years newest first and prepends the synthetic `All` group (`ALL`/`/all`). `Favorites`
  (`/favorites`) is another synthetic group, built from paths stored in `localStorage` by `FavoritesService`
- `SeoService` sets title, description, Open Graph, Twitter and canonical tags; `describePage` maps a path to them.
  `SeoTitleStrategy` applies them during prerendering, `AppComponent.updateSeo` in the browser
- Old `?year=&project=` links are redirected to the path form by `redirectLegacyProject` in `app.routes.ts`
- Components in `src/app/components/`: `images-viewer` (grid, single view, `?image=`/`?index=` params),
  `image-overlay` (full screen), `search-bar`, `command-palette` (Ctrl K jump)
- Pure helpers (search, slugs, month ranges, image sizing) live in `src/app/constant/` and are where most unit tests are

## Conventions

- Code that runs during prerendering must not touch `window`, `document` or `localStorage` unguarded — check
  `isBrowser` or `typeof window`
- Constants are `UPPER_SNAKE` exports in `constants.ts`; reuse `ALL`, `FAVORITES` and the `URL_PARAM_*` names
  rather than string literals
- Templates reference members through `this.` (`this.selectedProject`)
- Specs sit next to their source as `*.spec.ts`
