import {Component, OnInit} from '@angular/core';
import {RouterOutlet, ActivatedRoute} from '@angular/router';
import {Project, Projects} from "./type/project.type";
import {getProjects} from "./services/project.service";
import {CommonModule, Location} from "@angular/common";
import {ImagesViewerComponent} from "./components/images-viewer/images-viewer.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    ActivatedRoute,
    CommonModule,
    Location,
    RouterOutlet,
    ImagesViewerComponent,
  ],
  providers: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
    title = 'woodworking-projects';
    selectedProject: Project | undefined = undefined;
    selectedYear: string = '';
    data: Projects = { projectsByYear: [] };
    yearParam = 'year';
    projectParam = 'project';

    constructor(
      private route: ActivatedRoute,
      private location: Location
      ) {}

    ngOnInit(): void {
      getProjects().then((response) => {
        this.data = response;

        const yearParam = this.route.snapshot.queryParamMap.get(yearParam);
        const projectParam = this.route.snapshot.queryParamMap.get(projectParam);

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

    projectClick(project: Project, year: string): void {
      this.selectedProject = project;
      this.selectedYear = year;

      const newUrl = this.buildUrl(year, project.name);
      this.location.replaceState(newUrl);
    }

    homeClick(): void {
      this.selectedProject = undefined;
      this.selectedYear = '';

      this.location.replaceState(this.buildUrl(null, null));
    }

    allProjectsByYear(year: string): void {
      const images = this.data.projectsByYear
        .filter(x => x.year === year)
        .flatMap(entry => entry.projects)
        .flatMap(project => project.images);

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
        queryParams.set(yearParam, year);
      }

      if (project !== null) {
        queryParams.set(projectParam, project);
      }

      return `${location.pathname}?${queryParams.toString()}`;
    }
  }
}
