import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

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
  data: ProjectsByYear = [];

  ngOnInit(): void {
    getProjects().then((response) => {
      this.data = response;
    });
  }

  projectClick(project: Project): void {
    this.selectedProject = project;
  }

  toggleCategory(category: any, event: Event) {
    const target = event.target as HTMLElement;

    if (target.tagName === 'LI') {
      return;
    }

    if (this.selectedCategory === category) {
      this.selectedCategory = undefined;
    } else {
      this.selectedCategory = category;
    }
  }

  homeClick(): void {
    this.selectedProject = undefined;
  }

}
