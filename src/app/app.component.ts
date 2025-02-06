import {Component, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {Project, Projects} from "./type/project.type";
import {getProjects} from "./services/project.service";
import {CommonModule} from "@angular/common";
import {ProjectComponent} from "./components/project/project.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ProjectComponent,
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

  ngOnInit(): void {
    getProjects().then((response) => {
      this.data = response;
    });
  }

  projectClick(project: Project, year: string): void {
    this.selectedProject = project;
    this.selectedYear = year;
  }

  homeClick(): void {
    this.selectedProject = undefined;
    this.selectedYear = '';
  }
}
