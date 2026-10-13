import {Component, OnInit, ChangeDetectionStrategy, PLATFORM_ID, TransferState, computed, inject, signal} from '@angular/core';
import {RouterOutlet, Router, NavigationEnd} from '@angular/router';
import {Project, Projects} from "./type/project.type";
import {getProjects, prepareProjects, PROJECTS_STATE_KEY} from "./services/project.service";
import { isPlatformBrowser, Location } from "@angular/common";
import { filter, firstValueFrom } from 'rxjs';
import {ImagesViewerComponent} from "./components/images-viewer/images-viewer.component";
import {ProjectListComponent} from "./components/project-list/project-list.component";
import {CommandPaletteComponent} from "./components/command-palette/command-palette.component";
import {StatsComponent} from "./components/stats/stats.component";
import {CommandPaletteService} from "./services/command-palette.service";
import {describePage, HOME_PAGE, PROJECT_LIST, SeoService} from "./services/seo.service";
import {FavoritesService} from "./services/favorites.service";
import { ALL, FAVORITES, countProjects, extractImagesByYear, filterProjectsBySearch, projectMonthRange } from './constant/constants';
import { adjacentProjects, isPlainLeftClick, isStatsPath, parseProjectPath, ProjectLink, projectPath, projectSlug, STATS_SEGMENT } from './constant/project-url';

@Component({
    selector: 'app-root',
    imports: [
    RouterOutlet,
    ImagesViewerComponent,
    ProjectListComponent,
    CommandPaletteComponent,
    StatsComponent
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
  readonly data = signal<Projects>({ projectsByYear: [] });
  readonly isImageEnlarged = signal(false);
  readonly searchTerm = signal('');
  readonly dataLoaded = signal(false);
  readonly showStats = signal(false);
  readonly palette = inject(CommandPaletteService);
  private readonly favorites = inject(FavoritesService);
  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly transferState = inject(TransferState);
  private readonly projectList = inject(PROJECT_LIST, { optional: true });

  readonly filteredProjectsByYear = computed(() => filterProjectsBySearch(this.data().projectsByYear, this.searchTerm()));
  // The synthetic 'All' group is a shortcut, not a project, so it stays out of the count
  readonly totalProjectCount = computed(() => countProjects(this.data().projectsByYear.filter(group => group.year !== ALL)));
  readonly matchingProjectCount = computed(() => countProjects(this.filteredProjectsByYear()));
  private readonly favoritesByYear = computed(() => this.favorites.favoritesByYear(this.data().projectsByYear));
  readonly filteredFavoritesByYear = computed(() => filterProjectsBySearch(this.favoritesByYear(), this.searchTerm()));
  readonly favoriteCount = computed(() => countProjects(this.favoritesByYear()));

  readonly selectedMonthRange = computed(() => {
    const project = this.selectedProject();
    return project ? projectMonthRange(project.images, this.selectedYear()) : null;
  });

  // Previous and next projects around a real one; year, All and Favorites views have none
  readonly adjacent = computed(() => {
    const project = this.selectedProject();
    return project?.name ? adjacentProjects(this.data().projectsByYear, this.selectedYear(), project.name) : null;
  });

  // Hidden while searching unless a favorite matches; otherwise always there so the empty hint can show
  readonly showFavorites = computed(() => this.filteredFavoritesByYear().length > 0 || this.searchTerm().trim() === '');

  constructor(private location: Location) {}

  ngOnInit(): void {
    // Prerendering renders the page from project-list.json and hands the list on to the browser.
    if (!this.isBrowser) {
      if (this.projectList) {
        this.transferState.set(PROJECTS_STATE_KEY, this.projectList);
        this.data.set(prepareProjects(this.projectList));
        this.dataLoaded.set(true);
        this.selectFromPath(this.location.path());
      }
      return;
    }

    const prerendered = this.transferState.get(PROJECTS_STATE_KEY, null);
    const projects = prerendered ? Promise.resolve(prepareProjects(prerendered)) : getProjects();

    // Wait for the router too, so an old ?year= link has already been redirected to its path.
    Promise.all([projects, this.initialNavigation()]).then(([response]) => {
      this.data.set(response);
      this.dataLoaded.set(true);
      this.selectFromPath(this.location.path());

      // Slot a home entry in underneath a deep link so browser/mouse back lands on home.
      if (this.selectedProject() || this.showStats()) {
        const deepLink = this.location.path();
        this.location.replaceState('/');
        this.location.go(deepLink);
      }
    });

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
      this.selectFromPath(path);
    });
  }

  private initialNavigation(): Promise<unknown> {
    return this.router.navigated
      ? Promise.resolve()
      : firstValueFrom(this.router.events.pipe(filter(event => event instanceof NavigationEnd)));
  }

  private selectFromPath(path: string): void {
    const target = parseProjectPath(path);
    const yearGroup = target && this.data().projectsByYear.find(x => x.year === target.year);

    if (isStatsPath(path)) {
      this.showStats.set(true);
    } else if (target?.year === FAVORITES) {
      if (this.favoriteCount() > 0) {
        this.selectAllFavorites();
      }
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

  searchChange(term: string): void {
    this.searchTerm.set(term);
  }

  allFavorites(): void {
    this.selectAllFavorites();
    this.location.go(projectPath(FAVORITES));
    this.updateSeo();
  }

  private selectAllFavorites(): void {
    // Search-aware like a year's 'All'; each image keeps its year and project in the description
    const images = this.filteredFavoritesByYear().flatMap(yearGroup => extractImagesByYear(yearGroup));

    this.select({
      name: '',
      desc: `All of ${FAVORITES}`,
      images: images
    }, FAVORITES);
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

  /** Real links so they prerender and open in new tabs; a plain click swaps the project in place. */
  adjacentClick(event: MouseEvent, link: ProjectLink): void {
    if (isPlainLeftClick(event)) {
      event.preventDefault();
      this.jumpToProject(link.project, link.year);
    }
  }

  statsClick(event: MouseEvent): void {
    if (!isPlainLeftClick(event)) {
      return;
    }

    event.preventDefault();
    this.selectedProject.set(undefined);
    this.selectedYear.set('');
    this.showStats.set(true);

    this.location.go(`/${STATS_SEGMENT}`);
    this.updateSeo();
  }

  linkPath(link: ProjectLink): string {
    return projectPath(link.year, link.project.name);
  }

  homeClick(): void {
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

  private select(project: Project, year: string): void {
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

  private pathOnly(path: string): string {
    return path.split(/[?#]/)[0].replace(/\/+$/, '');
  }

  private updateSeo(): void {
    this.seo.update(describePage(this.data().projectsByYear, this.selectedPath()) ?? HOME_PAGE);
  }
}
