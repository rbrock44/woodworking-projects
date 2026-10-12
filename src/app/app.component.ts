import {Component, OnInit, ChangeDetectionStrategy, PLATFORM_ID, inject} from '@angular/core';
import {RouterOutlet, Router, NavigationEnd} from '@angular/router';
import {Project, Projects, ProjectsByYear} from "./type/project.type";
import {getProjects} from "./services/project.service";
import { isPlatformBrowser, Location } from "@angular/common";
import { filter, firstValueFrom } from 'rxjs';
import {ImagesViewerComponent} from "./components/images-viewer/images-viewer.component";
import {SearchBarComponent} from "./components/search-bar/search-bar.component";
import {CommandPaletteComponent} from "./components/command-palette/command-palette.component";
import {CommandPaletteService} from "./services/command-palette.service";
import {describePage, HOME_PAGE, SeoService} from "./services/seo.service";
import {FavoritesService} from "./services/favorites.service";
import { ALL, FAVORITES, countProjects, extractImagesByYear, filterProjectsBySearch } from './constant/constants';
import { parseProjectPath, projectPath, projectSlug } from './constant/project-url';

@Component({
    selector: 'app-root',
    imports: [
    RouterOutlet,
    ImagesViewerComponent,
    SearchBarComponent,
    CommandPaletteComponent
],
    providers: [],
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'woodworking-projects';
  selectedProject: Project | undefined = undefined;
  selectedYear: string = '';
  data: Projects = { projectsByYear: [] };
  isImageEnlarged: boolean = false;
  searchTerm: string = '';
  filteredProjectsByYear: ProjectsByYear[] = [];
  filteredFavoritesByYear: ProjectsByYear[] = [];
  totalProjectCount: number = 0;
  matchingProjectCount: number = 0;
  dataLoaded: boolean = false;
  readonly palette = inject(CommandPaletteService);
  readonly favorites = inject(FavoritesService);
  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  constructor(private location: Location) {}

  ngOnInit(): void {
    // Prerendering only bakes in each page's meta tags; projects load and render in the browser.
    if (!this.isBrowser) {
      return;
    }

    // Wait for the router too, so an old ?year= link has already been redirected to its path.
    Promise.all([getProjects(), this.initialNavigation()]).then(([response]) => {
      this.data = response;
      this.dataLoaded = true;
      this.applySearch();
      this.selectFromPath(this.location.path());

      // Slot a home entry in underneath a deep link so browser/mouse back lands on home.
      if (this.selectedProject) {
        const deepLink = this.location.path();
        this.location.replaceState('/');
        this.location.go(deepLink);
      }
    });

    // Browser/mouse back and forward land here; show whichever project the URL now names.
    this.location.subscribe(() => {
      const path = this.location.path();

      if (this.selectedProject && this.pathOnly(path) === this.selectedPath()) {
        return; // same project; the images viewer handles image-level history
      }

      this.selectedProject = undefined;
      this.selectedYear = '';
      this.isImageEnlarged = false;
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
    const yearGroup = target && this.data.projectsByYear.find(x => x.year === target.year);

    if (target?.year === FAVORITES) {
      if (this.favoriteCount > 0) {
        this.selectAllFavorites();
      }
    } else if (target && yearGroup) {
      if (target.year === ALL) {
        this.selectedProject = yearGroup.projects[0];
        this.selectedYear = ALL;
      } else if (target.slug === null) {
        this.selectAllProjectsByYear(target.year);
      } else {
        const foundProject = yearGroup.projects.find(p => projectSlug(p.name) === target.slug);
        if (foundProject) {
          this.selectedProject = foundProject;
          this.selectedYear = target.year;
        }
      }
    }

    // A year or project that doesn't exist (or no longer does) falls back to home.
    if (!this.selectedProject && this.pathOnly(path) !== '') {
      this.location.replaceState('/');
    }

    this.updateSeo();
  }

  searchChange(term: string): void {
    this.searchTerm = term;
    this.applySearch();
  }

  private applySearch(): void {
    this.filteredProjectsByYear = filterProjectsBySearch(this.data.projectsByYear, this.searchTerm);
    // The synthetic 'All' group is a shortcut, not a project, so it stays out of the count
    this.totalProjectCount = countProjects(this.data.projectsByYear.filter(group => group.year !== ALL));
    this.matchingProjectCount = countProjects(this.filteredProjectsByYear);
    this.filteredFavoritesByYear = filterProjectsBySearch(this.favorites.favoritesByYear(this.data.projectsByYear), this.searchTerm);
  }

  get favoriteCount(): number {
    return countProjects(this.favorites.favoritesByYear(this.data.projectsByYear));
  }

  // Hidden while searching unless a favorite matches; otherwise always there so the empty hint can show
  get showFavorites(): boolean {
    return this.filteredFavoritesByYear.length > 0 || this.searchTerm.trim() === '';
  }

  toggleFavorite(event: Event, project: Project, year: string): void {
    event.stopPropagation(); // the row behind the heart opens the project
    this.favorites.toggle(year, project);
    this.applySearch();
  }

  allFavorites(): void {
    this.selectAllFavorites();
    this.location.go(projectPath(FAVORITES));
    this.updateSeo();
  }

  private selectAllFavorites(): void {
    // Search-aware like a year's 'All'; each image keeps its year and project in the description
    const images = this.filteredFavoritesByYear.flatMap(yearGroup => extractImagesByYear(yearGroup));

    this.selectedProject = {
      name: '',
      desc: `All of ${FAVORITES}`,
      images: images
    };
    this.selectedYear = FAVORITES;
  }

  projectClick(project: Project, year: string): void {
    this.selectedProject = project;
    this.selectedYear = year;

    this.location.go(projectPath(year, project.name));
    this.updateSeo();
  }

  jumpToProject(project: Project, year: string): void {
    if (project === this.selectedProject) {
      return;
    }

    this.isImageEnlarged = false;
    this.projectClick(project, year);
  }

  homeClick(): void {
    this.selectedProject = undefined;
    this.selectedYear = '';
    this.isImageEnlarged = false;

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
    const yearGroup = this.filteredProjectsByYear.find(x => x.year === year)
      ?? this.data.projectsByYear.find(x => x.year === year)!;
    const images = extractImagesByYear(yearGroup);
    const yearProject: Project = {
      name: '',
      desc: `All of ${year}`,
      images: images
    };

    this.selectedProject = yearProject;
    this.selectedYear = year;
  }

  private selectedPath(): string {
    return this.selectedProject ? projectPath(this.selectedYear, this.selectedProject.name) : '/';
  }

  private pathOnly(path: string): string {
    return path.split(/[?#]/)[0].replace(/\/+$/, '');
  }

  private updateSeo(): void {
    this.seo.update(describePage(this.data.projectsByYear, this.selectedPath()) ?? HOME_PAGE);
  }
}
