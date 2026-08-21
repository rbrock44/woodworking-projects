import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {RouterOutlet, ActivatedRoute} from '@angular/router';
import {Project, Projects, ProjectsByYear} from "./type/project.type";
import {getProjects} from "./services/project.service";
import { Location } from "@angular/common";
import {ImagesViewerComponent} from "./components/images-viewer/images-viewer.component";
import {SearchBarComponent} from "./components/search-bar/search-bar.component";
import { ALL, countProjects, extractImagesByYear, filterProjectsBySearch, URL_PARAM_PROJECT, URL_PARAM_YEAR } from './constant/constants';

@Component({
    selector: 'app-root',
    imports: [
    RouterOutlet,
    ImagesViewerComponent,
    SearchBarComponent
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

      if (yearParam && projectParam !== null) {
        this.selectedYear = yearParam;

        if (projectParam === '') {
          this.allProjectsByYear(yearParam);
        } else {
          const yearGroup = this.data.projectsByYear.find(x => x.year === yearParam);
          const foundProject = yearGroup?.projects.find(p => p.name === projectParam);
          if (foundProject) {
            this.selectedProject = foundProject;
          }
        }
      }
    });
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
    this.location.replaceState(newUrl);
  }

  homeClick(): void {
    this.selectedProject = undefined;
    this.selectedYear = '';
    this.isImageEnlarged = false;

    this.location.replaceState(this.buildUrl(null, null));
  }

  allProjectsByYear(year: string): void {
    // Search-aware: 'All' covers the projects currently visible for that year
    const images = extractImagesByYear(this.filteredProjectsByYear.filter(x => x.year === year)[0]);
    const yearProject: Project = {
      name: '',
      desc: `All of ${year}`,
      images: images
    };

    this.selectedProject = yearProject;
    this.selectedYear = year;

    this.location.replaceState(this.buildUrl(year, ''));
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
