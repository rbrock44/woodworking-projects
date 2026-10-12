import {Component, OnInit, ChangeDetectionStrategy, inject} from '@angular/core';
import {RouterOutlet, ActivatedRoute} from '@angular/router';
import {Project, Projects, ProjectsByYear} from "./type/project.type";
import {getProjects} from "./services/project.service";
import { Location } from "@angular/common";
import {ImagesViewerComponent} from "./components/images-viewer/images-viewer.component";
import {SearchBarComponent} from "./components/search-bar/search-bar.component";
import {CommandPaletteComponent} from "./components/command-palette/command-palette.component";
import {CommandPaletteService} from "./services/command-palette.service";
import { ALL, countProjects, extractImagesByYear, filterProjectsBySearch, URL_PARAM_PROJECT, URL_PARAM_YEAR } from './constant/constants';

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
  totalProjectCount: number = 0;
  matchingProjectCount: number = 0;
  dataLoaded: boolean = false;
  readonly palette = inject(CommandPaletteService);

  constructor(
    private route: ActivatedRoute,
    private location: Location
    ) {}

  ngOnInit(): void {
    getProjects().then((response) => {
      this.data = response;
      this.dataLoaded = true;
      this.applySearch();

      const yearParam = this.route.snapshot.queryParamMap.get(URL_PARAM_YEAR);
      const projectParam = this.route.snapshot.queryParamMap.get(URL_PARAM_PROJECT);
      this.selectFromParams(yearParam, projectParam);

      // Slot a home entry in underneath a deep link so browser/mouse back lands on home.
      if (this.selectedProject) {
        const deepLink = this.location.path();
        this.location.replaceState(this.buildUrl(null, null));
        this.location.go(deepLink);
      }
    });

    // Browser/mouse back and forward land here; show whichever project the URL now names.
    this.location.subscribe(() => {
      const params = new URLSearchParams(this.location.path().split('?')[1] ?? '');
      const yearParam = params.get(URL_PARAM_YEAR);
      const projectParam = params.get(URL_PARAM_PROJECT);

      if (this.selectedProject && yearParam === this.selectedYear && projectParam === this.selectedProject.name) {
        return; // same project; the images viewer handles image-level history
      }

      this.selectedProject = undefined;
      this.selectedYear = '';
      this.isImageEnlarged = false;
      this.selectFromParams(yearParam, projectParam);
    });
  }

  private selectFromParams(yearParam: string | null, projectParam: string | null): void {
    if (yearParam && projectParam !== null) {
      this.selectedYear = yearParam;

      if (projectParam === '') {
        this.selectAllProjectsByYear(yearParam);
      } else {
        const yearGroup = this.data.projectsByYear.find(x => x.year === yearParam);
        const foundProject = yearGroup?.projects.find(p => p.name === projectParam);
        if (foundProject) {
          this.selectedProject = foundProject;
        }
      }
    }
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
  }

  projectClick(project: Project, year: string): void {
    this.selectedProject = project;
    this.selectedYear = year;

    const newUrl = this.buildUrl(year, project.name);
    this.location.go(newUrl);
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

    this.location.go(this.buildUrl(null, null));
  }

  allProjectsByYear(year: string): void {
    this.selectAllProjectsByYear(year);
    this.location.go(this.buildUrl(year, ''));
  }

  private selectAllProjectsByYear(year: string): void {
    // Search-aware: 'All' covers the projects currently visible for that year
    const images = extractImagesByYear(this.filteredProjectsByYear.filter(x => x.year === year)[0]);
    const yearProject: Project = {
      name: '',
      desc: `All of ${year}`,
      images: images
    };

    this.selectedProject = yearProject;
    this.selectedYear = year;
  }

  private buildUrl(year: string | null, project: string | null): string {
    const queryParams = new URLSearchParams();

    if (year !== null && year !== '') {
      queryParams.set(URL_PARAM_YEAR, year);
    }

    if (project !== null) {
      queryParams.set(URL_PARAM_PROJECT, project);
    }
    const end = queryParams.toString();
    if (end !== '') {
      return `${location.pathname}?${queryParams.toString()}`;
    } else {
      return location.pathname;
    }
  }
}
