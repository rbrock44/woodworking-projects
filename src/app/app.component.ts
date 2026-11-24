import {Component, OnInit, ChangeDetectionStrategy, PLATFORM_ID, TransferState, computed, effect, inject, signal, untracked} from '@angular/core';
import {RouterOutlet, Router, NavigationEnd} from '@angular/router';
import {Image, PhotoPlace, Project, Projects, ProjectsByYear} from "./type/project.type";
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
import { ALL, FAVORITES, URL_PARAM_SHARED, URL_PARAM_YEAR, createImageForAll, extractImagesByYear, looseImages, projectMonthRange, scrollPageToTop } from './constant/constants';
import { adjacentLinks, existingFavoritePaths, favoriteProjectsAtPaths, isPhotoFavoritePath, isPlainLeftClick, isStatsPath, isYearSegment, parsePhotoPath, parseProjectPath, parseSharedFavorites, PhotoTarget, photoUrl, photosAtPaths, projectPath, projectSlug, STATS_SEGMENT, viewPathOf } from './constant/project-url';

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
  readonly selectedProject = signal<Project | undefined>(undefined);
  readonly selectedYear = signal('');
  readonly isImageEnlarged = signal(false);
  readonly showStats = signal(false);
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

  /** Section headings for the Favorites grid's pictures, empty for every other view. */
  readonly selectedSections = signal<ReadonlyMap<Image, string>>(new Map());
  // Paths from a share link being viewed; the prompt to add them shows while there are any
  readonly sharedPaths = signal<string[]>([]);
  readonly sharedNewCount = computed(() => this.sharedPaths().filter(path => !this.favorites.hasPath(path)).length);
  // Names both kinds: '1 project and 2 photos'
  readonly sharedSummary = computed(() => {
    const photos = this.sharedPaths().filter(isPhotoFavoritePath).length;
    const projects = this.sharedPaths().length - photos;
    return [
      ...(projects > 0 ? [`${projects} ${projects === 1 ? 'project' : 'projects'}`] : []),
      ...(photos > 0 ? [`${photos} ${photos === 1 ? 'photo' : 'photos'}`] : []),
    ].join(' and ');
  });
  /** The open project's own favorite state; false for a year, All, Favorites or Featured. */
  readonly isProjectFavorite = computed(() => {
    const project = this.selectedProject();
    return !!project?.name && this.favorites.isFavorite(this.selectedYear(), project);
  });
  readonly shareCopied = signal(false);
  private shareCopiedTimer?: ReturnType<typeof setTimeout>;

  readonly selectedMonthRange = computed(() => {
    const project = this.selectedProject();
    return project ? projectMonthRange(project.images, this.selectedYear()) : null;
  });

  /** The photo the single view shows, null for the grid. */
  readonly shownImage = signal<Image | null>(null);

  // Previous and next around a project, or around a loose photo shown on its own in its year; the All and
  // Favorites views have none, as their photos aren't one place in the home page list
  readonly adjacent = computed(() => {
    const project = this.selectedProject();
    const year = this.selectedYear();
    if (!project) {
      return null;
    }
    if (project.name) {
      return adjacentLinks(this.data().projectsByYear, year, { project: project.name });
    }

    // Only a photo of the view now open; the viewer reports a new one after a swap
    const image = this.shownImage();
    return image && isYearSegment(year) && project.images.includes(image) && this.loosePhotoYears().get(image.url) === year
      ? adjacentLinks(this.data().projectsByYear, year, { photo: image.name })
      : null;
  });

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

      this.selectedProject.set(undefined);
      this.selectedYear.set('');
      this.showStats.set(false);
      this.isImageEnlarged.set(false);
      this.sharedPaths.set([]);
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
        this.openShared(shared);
      } else if (this.favoriteCount() > 0) {
        this.selectAllFavorites();
      }
    } else if (photo) {
      this.selectPhotoPage(photo);
    } else if (target && yearGroup) {
      if (target.year === ALL) {
        this.select(yearGroup.projects[0], ALL);
      } else if (target.slug === null) {
        this.selectAllProjectsByYear(target.year);
      } else {
        const foundProject = yearGroup.projects.find(p => projectSlug(p.name) === target.slug);
        if (foundProject) {
          this.select(foundProject, target.year);
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
        this.select(project, photo.year);
        if (this.isBrowser && !project.images.some(image => image.name === photo.name)) {
          this.location.replaceState(projectPath(photo.year, project.name));
        }
      }
      return;
    }

    this.selectAllProjectsByYear(photo.year);
    if (this.isBrowser && !looseImages(yearGroup).some(image => image.name === photo.name)) {
      this.location.replaceState(projectPath(photo.year));
    }
  }

  searchChange(term: string): void {
    this.searchTerm.set(term);
  }

  allFavorites(): void {
    this.selectAllFavorites();
    this.location.go(projectPath(FAVORITES));
    this.updateSeo();
  }

  /** The `?shared=` paths of a share link that name projects or photos which exist. */
  private sharedFromPath(path: string): string[] {
    const query = path.split('#')[0].split('?')[1] ?? '';
    const paths = new Set(parseSharedFavorites(new URLSearchParams(query).get(URL_PARAM_SHARED)));

    return existingFavoritePaths(this.data().projectsByYear, paths);
  }

  /**
   * A favorites grid: the projects' photos under one heading, then the single photos under another, so a
   * favorited project's photos and a favorited photo never read as the same kind.
   */
  private favoritesGrid(projects: ProjectsByYear[], photos: PhotoPlace[]): { images: Image[]; sections: Map<Image, string> } {
    const projectImages = projects.flatMap(yearGroup => extractImagesByYear(yearGroup));
    const photoImages = photos.map(place => createImageForAll(place.year, place.project, place.image));

    return {
      images: [...projectImages, ...photoImages],
      sections: new Map([
        ...projectImages.map(image => [image, 'Projects'] as const),
        ...photoImages.map(image => [image, 'Photos'] as const),
      ]),
    };
  }

  /** No favorites yet, or nothing new: take the shared ones. Otherwise show them and ask before merging. */
  private openShared(paths: string[]): void {
    if (this.favoriteCount() === 0 || paths.every(path => this.favorites.hasPath(path))) {
      this.favorites.addAll(paths);
      this.location.replaceState(projectPath(FAVORITES));
      this.selectAllFavorites();
      return;
    }

    const shared = new Set(paths);
    const { images, sections } = this.favoritesGrid(
      favoriteProjectsAtPaths(this.data().projectsByYear, shared), photosAtPaths(this.data().projectsByYear, shared));

    this.select({
      name: '',
      desc: 'Shared favorites',
      images: images
    }, FAVORITES, sections);
    this.sharedPaths.set(paths);
  }

  addSharedFavorites(): void {
    this.favorites.addAll(this.sharedPaths());
    this.isImageEnlarged.set(false);
    this.selectAllFavorites();
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

  private selectAllFavorites(): void {
    // Search-aware like a year's 'All'; each image keeps its year and project in the description
    const { images, sections } = this.favoritesGrid(this.filteredFavoriteProjects(), this.filteredFavoritePhotos());

    this.select({
      name: '',
      desc: `All of ${FAVORITES}`,
      images: images
    }, FAVORITES, sections);
  }

  projectClick(project: Project, year: string): void {
    this.select(project, year);

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
    this.sharedPaths.set([]);
    this.selectedProject.set(undefined);
    this.selectedYear.set('');
    this.showStats.set(true);

    this.location.go(`/${STATS_SEGMENT}`);
    this.updateSeo();
  }

  homeClick(): void {
    this.sharedPaths.set([]);
    this.selectedProject.set(undefined);
    this.selectedYear.set('');
    this.showStats.set(false);
    this.isImageEnlarged.set(false);

    this.location.go('/');
    this.updateSeo();
  }

  allProjectsByYear(year: string): void {
    this.selectAllProjectsByYear(year);
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
    const project = this.selectedProject();
    if (project?.name) {
      this.favorites.toggle(this.selectedYear(), project);
    }
  }

  /** A photo in no project opens in its year, shown on its own; one in a project opens in that project at it. */
  photoClick(year: string, imageName: string, projectName?: string | null): void {
    const project = projectName
      ? this.data().projectsByYear.find(x => x.year === year)?.projects.find(p => p.name === projectName)
      : undefined;
    if (project) {
      this.isImageEnlarged.set(false);
      this.location.go(photoUrl(year, imageName, project.name));
      this.select(project, year);
      this.updateSeo();
      return;
    }

    this.location.go(photoUrl(year, imageName));
    this.selectAllProjectsByYear(year);
    this.updateSeo();
  }

  private selectAllProjectsByYear(year: string): void {
    // Search-aware: 'All' covers the projects currently visible for that year
    const yearGroup = this.filteredProjectsByYear().find(x => x.year === year)
      ?? this.data().projectsByYear.find(x => x.year === year)!;
    const images = extractImagesByYear(yearGroup);

    this.select({
      name: '',
      desc: `All of ${year}`,
      images: images
    }, year);
  }

  private select(project: Project, year: string, sections: ReadonlyMap<Image, string> = new Map()): void {
    this.sharedPaths.set([]);
    this.selectedSections.set(sections);
    this.showStats.set(false);
    this.selectedProject.set(project);
    this.selectedYear.set(year);
  }

  private selectedPath(): string {
    const project = this.selectedProject();
    if (this.showStats()) {
      return `/${STATS_SEGMENT}`;
    }
    return project ? projectPath(this.selectedYear(), project.name) : '/';
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
