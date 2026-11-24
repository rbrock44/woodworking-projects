import { Injectable, computed, inject, signal } from '@angular/core';
import { Projects } from '../type/project.type';
import { ALL, countProjects, filterPhotoPlacesBySearch, filterProjectsBySearch, looseImages } from '../constant/constants';
import { isYearSegment, photoPlaces } from '../constant/project-url';
import { FavoritesService } from './favorites.service';

/**
 * The gallery as loaded and searched: every project and photo, the home search, and what follows from them (the
 * favorites lists, each photo's place). It knows nothing of which view is open or the URL; `AppComponent` owns that
 * and reads everything else from here.
 */
@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly favorites = inject(FavoritesService);

  /** Years newest first with the synthetic All group in front, as `prepareProjects` makes it. */
  readonly data = signal<Projects>({ projectsByYear: [] });
  readonly dataLoaded = signal(false);
  /** The home page search, which also narrows a year's All and Favorites. */
  readonly searchTerm = signal('');

  readonly filteredProjectsByYear = computed(() => filterProjectsBySearch(this.data().projectsByYear, this.searchTerm()));
  // The synthetic 'All' group is a shortcut, not a project, so it stays out of the count
  readonly totalProjectCount = computed(() => countProjects(this.data().projectsByYear.filter(group => group.year !== ALL)));
  readonly matchingProjectCount = computed(() => countProjects(this.filteredProjectsByYear()));

  // Two kinds: whole projects, and single photos whether in a project or not
  readonly favoriteProjects = computed(() => this.favorites.favoriteProjects(this.data().projectsByYear));
  readonly favoritePhotos = computed(() => this.favorites.favoritePhotos(this.data().projectsByYear));
  readonly filteredFavoriteProjects = computed(() => filterProjectsBySearch(this.favoriteProjects(), this.searchTerm()));
  readonly filteredFavoritePhotos = computed(() => filterPhotoPlacesBySearch(this.favoritePhotos(), this.searchTerm()));
  readonly favoriteCount = computed(() => countProjects(this.favoriteProjects()) + this.favoritePhotos().length);
  // Hidden while searching unless a favorite matches; otherwise always there so the empty hint can show
  readonly showFavorites = computed(() => this.filteredFavoriteProjects().length > 0
    || this.filteredFavoritePhotos().length > 0 || this.searchTerm().trim() === '');

  /** Every photo's year, project and favorites key by its url, so any grid tile or single view can heart it. */
  readonly placesByUrl = computed(() => photoPlaces(this.data().projectsByYear));
  /** Each loose photo's year by its url, so previous/next can follow a loose photo shown on its own. */
  readonly loosePhotoYears = computed(() => new Map(this.data().projectsByYear
    .filter(group => isYearSegment(group.year))
    .flatMap(group => looseImages(group).map(image => [image.url, group.year] as const))));

  /** Takes a loaded list (already through `prepareProjects`). */
  load(projects: Projects): void {
    this.data.set(projects);
    this.dataLoaded.set(true);
  }
}
