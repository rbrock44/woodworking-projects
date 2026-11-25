import {Component, OnInit, ChangeDetectionStrategy, PLATFORM_ID, TransferState, effect, inject, signal, untracked} from '@angular/core';
import {RouterOutlet, Router, NavigationEnd} from '@angular/router';
import {Project, Projects} from "./type/project.type";
import {getProjects, prepareProjects, PROJECTS_STATE_KEY} from "./services/project.service";
import { isPlatformBrowser, Location } from "@angular/common";
import { filter, firstValueFrom } from 'rxjs';
import {ImagesViewerComponent} from "./components/images-viewer/images-viewer.component";
import {ProjectListComponent} from "./components/project-list/project-list.component";
import {CommandPaletteComponent} from "./components/command-palette/command-palette.component";
import {StatsComponent} from "./components/stats/stats.component";
import {ProjectMetaComponent} from "./components/project-meta/project-meta.component";
import {ProjectNavComponent} from "./components/project-nav/project-nav.component";
import {SharedPromptComponent} from "./components/shared-prompt/shared-prompt.component";
import {CommandPaletteService, PALETTE_LABEL} from "./services/command-palette.service";
import {describePage, homePage, PROJECT_LIST, SeoService} from "./services/seo.service";
import {FavoritesService} from "./services/favorites.service";
import {GalleryService} from "./services/gallery.service";
import {ViewStateService} from "./services/view-state.service";
import { ALL, FAVORITES, URL_PARAM_SHARED, URL_PARAM_YEAR, looseImages, scrollPageToTop } from './constant/constants';
import { existingFavoritePaths, isPlainLeftClick, isStatsPath, isYearSegment, parsePhotoPath, parseProjectPath, parseSharedFavorites, PhotoTarget, photoUrl, projectPath, projectSlug, STATS_SEGMENT, viewPathOf } from './constant/project-url';

@Component({
    selector: 'app-root',
    imports: [
    RouterOutlet,
    ImagesViewerComponent,
    ProjectListComponent,
    CommandPaletteComponent,
    StatsComponent,
    ProjectMetaComponent,
    ProjectNavComponent,
    SharedPromptComponent
],
    providers: [],
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'woodworking-projects';
  readonly palette = inject(CommandPaletteService);
  readonly paletteLabel = PALETTE_LABEL;
  private readonly favorites = inject(FavoritesService);
  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly transferState = inject(TransferState);
  private readonly projectList = inject(PROJECT_LIST, { optional: true });

  // The gallery and what follows from it live in GalleryService; the view and template read them through here
  private readonly gallery = inject(GalleryService);
  readonly data = this.gallery.data;
  readonly dataLoaded = this.gallery.dataLoaded;
  readonly searchTerm = this.gallery.searchTerm;
  readonly filteredProjectsByYear = this.gallery.filteredProjectsByYear;
  readonly totalProjectCount = this.gallery.totalProjectCount;
  readonly matchingProjectCount = this.gallery.matchingProjectCount;
  readonly filteredFavoriteProjects = this.gallery.filteredFavoriteProjects;
  readonly filteredFavoritePhotos = this.gallery.filteredFavoritePhotos;
  readonly favoriteCount = this.gallery.favoriteCount;
  readonly showFavorites = this.gallery.showFavorites;
  readonly placesByUrl = this.gallery.placesByUrl;
  readonly loosePhotoYears = this.gallery.loosePhotoYears;

  // Which view is open lives in ViewStateService; this component picks it from the URL and keeps the URL and SEO in
  // step, and the template reads it through here
  private readonly view = inject(ViewStateService);
  readonly selectedProject = this.view.selectedProject;
  readonly selectedYear = this.view.selectedYear;
  readonly isImageEnlarged = this.view.isImageEnlarged;
  readonly showStats = this.view.showStats;
  readonly selectedSections = this.view.selectedSections;
  readonly shownImage = this.view.shownImage;
  readonly sharedPaths = this.view.sharedPaths;
  readonly sharedNewCount = this.view.sharedNewCount;
  readonly sharedSummary = this.view.sharedSummary;
  readonly isProjectFavorite = this.view.isProjectFavorite;
  readonly selectedMonthRange = this.view.selectedMonthRange;
  readonly adjacent = this.view.adjacent;
  private readonly selectedPath = this.view.selectedPath;

  readonly shareCopied = signal(false);
  private shareCopiedTimer?: ReturnType<typeof setTimeout>;

  constructor(private location: Location) {
    // A new view starts at the top, as it does in the card's own scroller on wide screens
    effect(() => {
      this.selectedProject();
      this.showStats();
      scrollPageToTop();
    });

    // Stepping through photos moves between photo pages, each with its own title, preview and canonical
    effect(() => {
      this.shownImage();
      untracked(() => {
        if (this.dataLoaded()) {
          this.updateSeo();
        }
      });
    });
  }

  ngOnInit(): void {
    // Prerendering renders the page from project-list.json and hands the list on to the browser.
    if (!this.isBrowser) {
      if (this.projectList) {
        this.transferState.set(PROJECTS_STATE_KEY, this.projectList);
        this.gallery.load(prepareProjects(this.projectList));
        this.selectFromPath(this.location.path());
      }
      return;
    }

    const prerendered = this.transferState.get(PROJECTS_STATE_KEY, null);
    if (prerendered && !this.isLegacyLink()) {
      // A prerendered page: its list and URL are here already, so the first render matches the page's markup and
      // hydrates it rather than drawing over it
      this.start(prepareProjects(prerendered));
    } else {
      const projects = prerendered ? Promise.resolve(prepareProjects(prerendered)) : getProjects();
      // Wait for the router too, so an old ?year= link has already been redirected to its path.
      Promise.all([projects, this.initialNavigation()]).then(([response]) => this.start(response));
    }

    // Browser/mouse back and forward land here; show whichever project the URL now names.
    this.location.subscribe(() => {
      const path = this.location.path();

      if (this.selectedProject() && this.pathOnly(path) === this.selectedPath()) {
        return; // same project; the images viewer handles image-level history
      }

      this.view.clear();
      this.selectFromPath(path);
    });
  }

  /** An old `?year=` link, which the router redirects to its path before the view can be picked. */
  private isLegacyLink(): boolean {
    return new URLSearchParams(this.location.path().split('?')[1] ?? '').has(URL_PARAM_YEAR);
  }

  private start(projects: Projects): void {
    this.gallery.load(projects);
    this.selectFromPath(this.location.path());

    // Slot a home entry in underneath a deep link so browser/mouse back lands on home.
    if (this.selectedProject() || this.showStats()) {
      const deepLink = this.location.path();
      this.location.replaceState('/');
      this.location.go(deepLink);
    }
  }

  private initialNavigation(): Promise<unknown> {
    return this.router.navigated
      ? Promise.resolve()
      : firstValueFrom(this.router.events.pipe(filter(event => event instanceof NavigationEnd)));
  }

  private selectFromPath(path: string): void {
    const target = parseProjectPath(path);
    const photo = parsePhotoPath(path);
    const yearGroup = target && this.data().projectsByYear.find(x => x.year === target.year);

    if (isStatsPath(path)) {
      this.showStats.set(true);
    } else if (target?.year === FAVORITES) {
      const shared = this.isBrowser ? this.sharedFromPath(path) : [];
      if (shared.length > 0) {
        if (this.view.openShared(shared)) {
          this.location.replaceState(projectPath(FAVORITES));
        }
      } else if (this.favoriteCount() > 0) {
        this.view.selectAllFavorites();
      }
    } else if (photo) {
      this.selectPhotoPage(photo);
    } else if (target && yearGroup) {
      if (target.year === ALL) {
        this.view.select(yearGroup.projects[0], ALL);
      } else if (target.slug === null) {
        this.view.selectAllProjectsByYear(target.year);
      } else {
        const foundProject = yearGroup.projects.find(p => projectSlug(p.name) === target.slug);
        if (foundProject) {
          this.view.select(foundProject, target.year);
        }
      }
    }

    // A year or project that doesn't exist (or no longer does) falls back to home.
    if (this.isBrowser && !this.selectedProject() && !this.showStats() && this.pathOnly(path) !== '') {
      this.location.replaceState('/');
    }

    this.updateSeo();
  }

  /**
   * A photo's own page: its project at that photo, or its year for a photo in no project. A photo that's gone
   * leaves its project or year open at the grid.
   */
  private selectPhotoPage(photo: PhotoTarget): void {
    const yearGroup = this.data().projectsByYear.find(x => x.year === photo.year && isYearSegment(x.year));
    if (!yearGroup) {
      return;
    }

    if (photo.slug !== null) {
      const project = yearGroup.projects.find(p => projectSlug(p.name) === photo.slug);
      if (project) {
        this.view.select(project, photo.year);
        if (this.isBrowser && !project.images.some(image => image.name === photo.name)) {
          this.location.replaceState(projectPath(photo.year, project.name));
        }
      }
      return;
    }

    this.view.selectAllProjectsByYear(photo.year);
    if (this.isBrowser && !looseImages(yearGroup).some(image => image.name === photo.name)) {
      this.location.replaceState(projectPath(photo.year));
    }
  }

  searchChange(term: string): void {
    this.searchTerm.set(term);
  }

  allFavorites(): void {
    this.view.selectAllFavorites();
    this.location.go(projectPath(FAVORITES));
    this.updateSeo();
  }

  /** The `?shared=` paths of a share link that name projects or photos which exist. */
  private sharedFromPath(path: string): string[] {
    const query = path.split('#')[0].split('?')[1] ?? '';
    const paths = new Set(parseSharedFavorites(new URLSearchParams(query).get(URL_PARAM_SHARED)));

    return existingFavoritePaths(this.data().projectsByYear, paths);
  }

  addSharedFavorites(): void {
    this.view.addSharedFavorites();
    this.location.replaceState(projectPath(FAVORITES));
    this.updateSeo();
  }

  /** Keeps viewing the shared favorites without touching this browser's own. */
  dismissSharedPrompt(): void {
    this.sharedPaths.set([]);
  }

  /** The phone share sheet where there is one, otherwise the link goes to the clipboard. */
  async shareFavorites(): Promise<void> {
    const url = this.favorites.shareUrl(window.location.origin, this.data().projectsByYear);
    const title = 'Woodworking Projects favorites';

    if (navigator.share && window.matchMedia?.('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title, url });
      } catch {
        // closed without sharing
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link to share your favorites', url);
      return;
    }

    this.shareCopied.set(true);
    clearTimeout(this.shareCopiedTimer);
    this.shareCopiedTimer = setTimeout(() => this.shareCopied.set(false), 2000);
  }

  projectClick(project: Project, year: string): void {
    this.view.select(project, year);

    this.location.go(projectPath(year, project.name));
    this.updateSeo();
  }

  jumpToProject(project: Project, year: string): void {
    if (project === this.selectedProject()) {
      return;
    }

    this.isImageEnlarged.set(false);
    this.projectClick(project, year);
  }

  statsClick(event: MouseEvent): void {
    if (!isPlainLeftClick(event)) {
      return;
    }

    event.preventDefault();
    this.view.selectStats();

    this.location.go(`/${STATS_SEGMENT}`);
    this.updateSeo();
  }

  homeClick(): void {
    this.view.clear();

    this.location.go('/');
    this.updateSeo();
  }

  allProjectsByYear(year: string): void {
    this.view.selectAllProjectsByYear(year);
    this.location.go(projectPath(year));
    this.updateSeo();
  }

  /** From the jump palette: open the photo the same way its home page thumbnail does. */
  jumpToPhoto(year: string, imageName: string): void {
    this.isImageEnlarged.set(false);
    // The year view only holds photos matching the home search; drop a search that would hide this one
    const visible = this.filteredProjectsByYear().find(x => x.year === year);
    if (!visible || !looseImages(visible).some(image => image.name === imageName)) {
      this.searchTerm.set('');
    }
    this.photoClick(year, imageName);
  }

  /** The heart beside an open project's name: favorites the whole project, not the photo shown. */
  toggleProjectFavorite(): void {
    this.view.toggleProjectFavorite();
  }

  /** A photo in no project opens in its year, shown on its own; one in a project opens in that project at it. */
  photoClick(year: string, imageName: string, projectName?: string | null): void {
    const project = projectName
      ? this.data().projectsByYear.find(x => x.year === year)?.projects.find(p => p.name === projectName)
      : undefined;
    if (project) {
      this.isImageEnlarged.set(false);
      this.location.go(photoUrl(year, imageName, project.name));
      this.view.select(project, year);
      this.updateSeo();
      return;
    }

    this.location.go(photoUrl(year, imageName));
    this.view.selectAllProjectsByYear(year);
    this.updateSeo();
  }

  /** The view a path shows; a photo's own page shows its project or year. */
  private pathOnly(path: string): string {
    return viewPathOf(path);
  }

  private updateSeo(): void {
    const projects = this.data().projectsByYear;
    const path = this.location.path();
    // A photo's own page while it's shown, else the view's
    const photoPage = parsePhotoPath(path) && this.selectedProject() ? describePage(projects, path) : null;
    this.seo.update(photoPage ?? describePage(projects, this.selectedPath()) ?? homePage(projects));
  }
}
