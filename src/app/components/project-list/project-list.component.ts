import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Image, Project, ProjectsByYear } from '../../type/project.type';
import { FavoritesService } from '../../services/favorites.service';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { createThumbnailImageUrl, looseImages, projectThumbnailUrl, YearEntry, yearEntries } from '../../constant/constants';

/** The home page: title, project search, and every year's projects with the favorites group on top. */
@Component({
  imports: [
    NgTemplateOutlet,
    SearchBarComponent,
  ],
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './project-list.component.scss'
})
export class ProjectListComponent {
  readonly projectsByYear = input<ProjectsByYear[]>([]);
  readonly favoritesByYear = input<ProjectsByYear[]>([]);
  readonly favoriteCount = input(0);
  readonly showFavorites = input(true);
  readonly searchTerm = input('');
  readonly matchingCount = input(0);
  readonly totalCount = input(0);
  readonly shareCopied = input(false);

  readonly searchChange = output<string>();
  readonly projectSelect = output<{ project: Project; year: string }>();
  readonly yearSelect = output<string>();
  readonly photoSelect = output<{ year: string; image: string }>();
  readonly favoritesSelect = output<void>();
  readonly favoritesShare = output<void>();

  readonly favorites = inject(FavoritesService);

  looseCount(group: ProjectsByYear): number {
    return looseImages(group).length;
  }

  /** Projects one per row, with runs of loose photos between them as rows of thumbnails. */
  entries(group: ProjectsByYear): YearEntry[] {
    return group.year === 'All' ? group.projects.map(project => ({ project })) : yearEntries(group);
  }

  photoThumbnail(photo: Image): string {
    return createThumbnailImageUrl(photo.url);
  }

  photoLabel(photo: Image, year: string): string {
    return photo.desc.trim() !== '' ? photo.desc : `Photo from ${year}`;
  }

  thumbnail(project: Project): string | null {
    return projectThumbnailUrl(project);
  }

  toggleFavorite(event: Event, project: Project, year: string): void {
    event.stopPropagation(); // the row behind the heart opens the project
    this.favorites.toggle(year, project);
  }
}
