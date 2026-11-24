# Woodworking Projects

Angular 22 site showcasing woodworking projects by year, with a photo gallery per project. Built with
`outputMode: "static"`, so every year and project page is prerendered to its own `index.html` and served from
GitHub Pages at `woodworking-projects.ryan-brock.com`. No backend.

## Commands

- Install: `npm ci` (Node version in `.nvmrc`)
- Dev server: `npm start` (port 4201)
- Test all: `npm test` (Vitest in jsdom, no browser), or `npx ng test --watch=false` as CI runs it
- Build: `npm run deploy` — `ng build` (prerenders every route) then `scripts/finish-static-build.mjs`, which
  writes `sitemap.xml`, copies `index.csr.html` to `404.html`, drops `prerendered-routes.json` and puts a
  Content-Security-Policy meta tag in every page (GitHub Pages can't send headers; inline scripts allowed by hash,
  photos only from `raw.githubusercontent.com`; a new outside origin has to be added there). Output in `dist/woodworking-projects/`
- Deploy: CI only, `.github/workflows/deploy.yml` on push to `master` (tests, build, `peaceiris/actions-gh-pages`)

## Data

- `public/project-list.json` is the whole dataset: `projectsByYear[] -> projects[] -> images[]`. Shapes are in
  `src/app/type/project.type.ts`. It is produced with the `generate-json.ps1` script in the sibling
  [woodworking-projects-images](https://github.com/rbrock44/woodworking-projects-images) repo, which also hosts the
  photos (served from `raw.githubusercontent.com`)
- Image names are `YYYYMMDD_HHMM`; `projectMonthRange` reads the date from them. Thumbnails are the same URL with a
  `-150x200.jpg` suffix (`createThumbnailImageUrl`), made by the images repo's `create-thumbnails.ps1`. The single
  view shows a `-900x1200.webp` copy (`createMidsizeImageUrl`, from `create-midsize-images.ps1`); only the full
  screen overlay loads the original
- A project's optional `cover` is the name of the photo that stands for it, picked by hand in `project-list.json`;
  `projectCover` falls back to the last photo (usually the finished piece). `project-list.server.spec.ts` fails on a
  cover that names no photo
- A year's optional `images` are photos in no project. Each one's optional `after` names the project it's listed after
  (missing: before every project); `yearEntries` turns them into rows of thumbnails between the projects on the home
  page, and clicking one opens the year's view on that photo (`AppComponent.photoClick`). None exist yet
- A project's URL is `/<year>/<slug>` where the slug comes from `projectSlug(name)`, so renaming a project changes its URL

## Architecture

- `AppComponent` owns all view state (selected year/project, search, favorites) and picks the view from the URL.
  The routes in `app.routes.ts` only decide which URLs are valid; view changes move the URL with `Location`, not the router
- Previous/next links (`.project-nav` under the viewer): `homeSequence` in `constant/project-url.ts` flattens
  `yearEntries` newest year first into one list of projects and loose photos (a photo per step), and `adjacentLinks`
  finds the neighbours of a project or loose photo. They show on a project page and on a loose photo's single view in
  its year (`ImagesViewerComponent.shownImageChange` tells `AppComponent` which photo is shown), never in All or
  Favorites, and ignore the home search. A project goes through `jumpToProject`, a photo through `jumpToPhoto` (so
  `photoClick`). Each link has a `.project-nav-kind` badge (folder or picture icon and `Project` / `Photo`, `.photo`
  for a photo), the photo named by `photoLabel` in `constants.ts`, and an aria-label like `Next photo: Fox sketch, 2024`
- Prerendering: `app.routes.server.ts` lists every year and project from `project-list.server.ts` (reads the JSON
  at build time). On the server `AppComponent` renders the page from the `PROJECT_LIST` token and puts the list in
  `TransferState`; the browser reads it back so its first render matches without a fetch, falling back to
  `getProjects()` (fetches `project-list.json`) when there is no state, e.g. `ng serve`
- No hydration — the browser re-renders over the prerendered markup. Router initial navigation is blocking so that
  first render already has the URL
- `prepareProjects` sorts years newest first and prepends the synthetic `All` group (`ALL`/`/all`). `Favorites`
  (`/favorites`) is another synthetic group, built from paths stored in `localStorage` (`favorite-projects`) by `FavoritesService`:
  `/<year>/<slug>` for a project, `/<year>/photo/<name>` (`photoPath`) for a loose photo, hearted in the single view only.
  `projectsAtPaths` puts favorited loose photos in their year's `images`, so they show as thumbnail rows. Share links are
  `/favorites?shared=2024/slug,2023/photo/name`: with no favorites yet they're added outright, otherwise they're shown
  with a prompt to add them (`AppComponent.openShared`)
- `SeoService` sets title, description, Open Graph, Twitter and canonical tags; `describePage` maps a path to them.
  `SeoTitleStrategy` applies them during prerendering, `AppComponent.updateSeo` in the browser
- Old `?year=&project=` links are redirected to the path form by `redirectLegacyProject` in `app.routes.ts`
- Components in `src/app/components/`: `project-list` (home page title, search and year list; inputs in, events
  out), `images-viewer` (grid, single view, `?image=`/`?index=` params),
  `image-overlay` (full screen), `search-bar`, `command-palette` (Ctrl K jump to a project or loose photo, labelled `PALETTE_LABEL`; a loose photo shows its thumbnail and `photoLabel`, follows its year's projects, and opens through `AppComponent.jumpToPhoto`, which reuses the home page's `photoClick`), `stats` (`/stats`, totals and
  rankings from `shopStats` in `constant/stats.ts`)
- Pure helpers (search, slugs, month ranges, image sizing) live in `src/app/constant/` and are where most unit tests are

## Sister Repo

`woodworking-projects` and `craft-showcase` (`C:\workspace\craft-showcase`) are sister repos: craft-showcase started as a copy of this one, and they share
the same app shell, components and conventions (top bar icon buttons, project list, images viewer, overlay,
command palette, favorites, stats, SEO, prerendering). Keep them close:

- After adding or changing a feature here, ask whether it should also go to `craft-showcase` when it applies there.
  Shared UI, layout, accessibility and bug fixes usually apply; craft-showcase's gallery/multi-site parts (gallery repos, site.json settings, shop, About, social links, watermark import) usually don't come back here
- Port it the same way (same markup, class names, specs) so the two stay easy to diff, adapting only names and
  data that differ
- Each repo gets its own commit
- Never port the light/dark theme toggle here: this site stays dark only

## Conventions

- Code that runs during prerendering must not touch `window`, `document` or `localStorage` unguarded — check
  `isBrowser` or `typeof window`
- Zoneless (no `zone.js`): state that changes outside a template event — promises, `Location.subscribe`, timers —
  must be a signal or the view won't update. `AppComponent` and `ImagesViewerComponent` hold their state in
  signals and `computed`
- Constants are `UPPER_SNAKE` exports in `constants.ts`; reuse `ALL`, `FAVORITES` and the `URL_PARAM_*` names
  rather than string literals
- Templates reference members through `this.` (`this.selectedProject`)
- Specs sit next to their source as `*.spec.ts`
