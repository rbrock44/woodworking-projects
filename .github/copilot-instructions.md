# Woodworking Projects

Angular 22 site showcasing woodworking projects by year, with a photo gallery per project. Built with
`outputMode: "static"`, so every year, project and photo page is prerendered to its own `index.html` and served from
GitHub Pages at `woodworking-projects.ryan-brock.com`. No backend.

## Commands

- Install: `npm ci` (Node version in `.nvmrc`)
- Dev server: `npm start` (port 4201)
- Test all: `npm test` (Vitest in jsdom, no browser), or `npx ng test --watch=false` as CI runs it
- Test the built site: `npm run test:dist` after `npm run deploy` (`scripts/check-dist.test.mjs`, `node --test`): every
  page prerendered with its own title, description and canonical, photo pages previewing a photo from the images repo,
  the 404 shell and CNAME, sitemap and robots, every referenced file published, every page's content policy hashing its
  inline scripts
- Build: `npm run deploy` — `ng build` (prerenders every route) then `scripts/finish-static-build.mjs`, which
  writes `sitemap.xml` (with each page's 900x1200 photos), copies `index.csr.html` to `404.html`, drops `prerendered-routes.json` and puts a
  Content-Security-Policy meta tag in every page (GitHub Pages can't send headers; inline scripts allowed by hash,
  photos only from `raw.githubusercontent.com`; a new outside origin has to be added there). Output in `dist/woodworking-projects/`
- Deploy: CI only, `.github/workflows/deploy.yml` on push to `master` (tests, build, `peaceiris/actions-gh-pages`).
  Pull requests into `master` run the same tests and build but skip the deploy step
- `.github/dependabot.yml` opens weekly update pull requests for npm (Angular, fonts and test packages grouped) and
  for the pinned action SHAs; `deploy.yml` tests them

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
- Photo pages: every photo has its own prerendered page at its favorites path, name encoded (`photoUrl`):
  `/<year>/<slug>/photo/<name>` in a project, `/<year>/photo/<name>` in none, so a shared link previews that photo
  (`describePage` gives it the photo's title, description, canonical and `og:image`). It opens the project (or year) at
  that photo; a gone photo leaves the grid open at the project or year path. The viewer reads the photo from the path
  (`parsePhotoPath`) or `?image=`, and writes a photo's own page only in the view it lives in (`ownPhotoUrl`): a
  project photo on its project's page, a loose photo in its year. Mixed views (a year's project photos, All,
  Favorites) keep `?image=`. `viewPathOf` strips `/photo/<name>` so `AppComponent` treats a photo page as its view.
  `AppComponent.updateSeo` describes the photo page while one is shown. Previous/next links to loose photos and
  `photoClick` go to photo pages

## Architecture

- `GalleryService` holds the gallery as loaded (`data`, `dataLoaded`, `load`), the home search and everything that
  follows from them: filtered years, counts, favorites lists, each photo's place. It knows nothing of the open view or
  the URL
- `ViewStateService` holds which view is open (selected year/project, stats, the shown photo, share prompt) and what
  follows from it (month range, previous/next, the view's path), and builds the All, Favorites and shared views. Like
  `GalleryService` it never reads or moves the URL
- `AppComponent` picks the view from the URL, moves the URL with each view change and keeps SEO in step; it exposes
  both services' signals under the same names for its template.
The routes in `app.routes.ts` only decide which URLs are valid; view changes move the URL with `Location`, not the router
- Previous/next links (`.project-nav` under the viewer): `homeSequence` in `constant/project-url.ts` flattens
  `yearEntries` newest year first into one list of projects and loose photos (a photo per step), and `adjacentLinks`
  finds the neighbours of a project or loose photo. They show on a project page and on a loose photo's single view in
  its year (`ImagesViewerComponent.shownImageChange` tells `AppComponent` which photo is shown), never in All or
  Favorites, and ignore the home search. A project goes through `jumpToProject`, a photo through `jumpToPhoto` (so
  `photoClick`). `project-nav` renders them; each link has a `.project-nav-kind` badge (folder or picture icon and `Project` / `Photo`, `.photo`
  for a photo), the photo named by `photoLabel` in `constants.ts`, and an aria-label like `Next photo: Fox sketch, 2024`
- Prerendering: `app.routes.server.ts` lists every year and project from `project-list.server.ts` (reads the JSON
  at build time). On the server `AppComponent` renders the page from the `PROJECT_LIST` token and puts the list in
  `TransferState`; the browser reads it back so its first render matches without a fetch, falling back to
  `getProjects()` (fetches `project-list.json`) when there is no state, e.g. `ng serve`
- Hydration with event replay (`provideClientHydration(withEventReplay())`): the browser takes over the prerendered
  markup instead of drawing it again, and clicks made before it's ready are replayed. That needs the first browser render
  to match the server's, so with `TransferState` present `AppComponent` starts synchronously (`start`) from the URL in
  `Location`; only an old `?year=` link (`isLegacyLink`) or no state (`ng serve`) waits for the router and data. Router
  initial navigation is not blocking (Angular rejects blocking with hydration). Browser-only differences must sit
  inside control flow (`@if`/`@for`), which hydration handles; direct DOM edits need `ngSkipHydration`. Event replay
  adds an inline script per page, which `finish-static-build.mjs` hashes into the content policy
- `prepareProjects` sorts years newest first and prepends the synthetic `All` group (`ALL`/`/all`). `Favorites`
  (`/favorites`) is another synthetic group, built from paths stored in `localStorage` (`favorite-projects`) by `FavoritesService`.
  Two kinds: a project, `/<year>/<slug>` (home row heart, or the `.project-favorite` pill beside the name on its own page), and
  a single photo, `/<year>/photo/<name>` (`photoPath`) in no project or `/<year>/<slug>/photo/<name>` (`projectPhotoPath`)
  in one (`favoritePhotoPath` picks; `isPhotoFavoritePath` tells them from projects). A favorited project doesn't favorite its
  photos one by one. Every photo has a heart: `.tile-heart` on each grid tile and home thumbnail, `.heart-button` in the
  single view, found through `photoPlaces` (url to `PhotoPlace`: year, project or null, path, the project list's own image),
  passed to the viewer as `photoPlaces`. Old project and loose photo paths read as before. `favoriteProjectsAtPaths` and
  `photosAtPaths` split them: the home group shows `.favorites-kind` headings (`Projects`, `Photos`) over project rows and
  over thumbnail rows of photos (a project photo opens in its project at it, `photoClick(year, name, project)`); the
  `/favorites` grid gets the same headings through the viewer's `sections` input (`.grid-section`). `existingFavoritePaths`
  feeds the share link and the merge prompt, which names both counts
- Views that mix projects (a year, All, Favorites: the viewer's `projectName` is empty) name each photo's project as
  `.image-source` under its grid tile, from `photoPlaces`, never parsed out of `createImageForAll`'s desc; a loose photo
  shows nothing extra, and a project's own page shows none. Share links are
  `/favorites?shared=2024/slug,2023/photo/name,2023/slug/photo/name` (photo names encoded twice): with no favorites yet they're added outright, otherwise they're shown
  with a prompt to add them (`AppComponent.openShared`)
- `SeoService` sets title, description, Open Graph, Twitter and canonical tags; `describePage` maps a path to them.
  `SeoTitleStrategy` applies them during prerendering, `AppComponent.updateSeo` in the browser
- Old `?year=&project=` links are redirected to the path form by `redirectLegacyProject` in `app.routes.ts`
- Components in `src/app/components/`: `project-list` (home page title, search and year list; inputs in, events
  out), `project-meta` (year, name, the project's favorite pill, built and desc above the viewer), `project-nav` (the
  previous/next links; `AppComponent` keeps `adjacent` and passes it in), `shared-prompt` (the share link's add-or-just-view
  dialog; `AppComponent` keeps `sharedPaths`), `images-viewer` (grid, single view, `?image=`/`?index=` params),
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
- `src/app/accessibility.spec.ts` runs axe (`axe-core`) over each kind of view; jsdom has no layout, so contrast and
  target size are left to a browser. A new view or dialog gets a case there
- Component styles warn past 6kB (`angular.json` budgets, error at 8kB); shared looks such as `.heart-button` and
  `.tile-heart` live in `src/styles.scss`, and a big component gets split rather than the budget raised
- Fonts are self-hosted from fontsource packages (Fraunces and Work Sans variable, IBM Plex Mono 400/500), listed in
  `angular.json`'s `styles` and bundled into `media/`; no Google Fonts, so the content policy allows only `'self'` for
  fonts and styles
