import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Image, PhotoPlace, Project, ProjectsByYear } from '../../type/project.type';
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
  /** Favorited whole projects by year, already narrowed by the search. */
  readonly favoriteProjects = input<ProjectsByYear[]>([]);
  /** Favorited single photos, in projects or not, already narrowed by the search. */
  readonly favoritePhotos = input<PhotoPlace[]>([]);
  readonly favoriteCount = input(0);
  readonly showFavorites = input(true);
  readonly searchTerm = input('');
  readonly matchingCount = input(0);
  readonly totalCount = input(0);
  readonly shareCopied = input(false);

  readonly searchChange = output<string>();
  readonly projectSelect = output<{ project: Project; year: string }>();
  readonly yearSelect = output<string>();
  /** A photo to open: in its year when `project` is missing, else in that project. */
  readonly photoSelect = output<{ year: string; image: string; project?: string | null }>();
  readonly favoritesSelect = output<void>();
  readonly favoritesShare = output<void>();

  readonly favorites = inject(FavoritesService);

  /** The favorited photos as one thumbnail row per year, newest first like the rest of the list. */
  readonly favoritePhotoRows = computed(() => {
    const rows: { year: string; photos: PhotoPlace[] }[] = [];
    this.favoritePhotos().forEach(place => {
      const last = rows.at(-1);
      if (last && last.year === place.year) {
        last.photos.push(place);
      } else {
        rows.push({ year: place.year, photos: [place] });
      }
    });
    return rows;
  });

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

  /** A favorited photo's name, saying which project it's from when it's in one: 'Walnut lid, from Lidded Box'. */
  placeLabel(place: PhotoPlace): string {
    if (!place.project) {
      return this.photoLabel(place.image, place.year);
    }
    const own = place.image.desc.trim();
    return own ? `${own}, from ${place.project}` : `Photo from ${place.project}, ${place.year}`;
  }

  thumbnail(project: Project): string | null {
    return projectThumbnailUrl(project);
  }

  toggleFavorite(event: Event, project: Project, year: string): void {
    event.stopPropagation(); // the row behind the heart opens the project
    this.favorites.toggle(year, project);
  }
}
