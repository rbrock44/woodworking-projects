import { Injectable, computed, inject, signal } from '@angular/core';
import { Image, PhotoPlace, Project, ProjectsByYear } from '../type/project.type';
import { FAVORITES, createImageForAll, extractImagesByYear, projectMonthRange } from '../constant/constants';
import { adjacentLinks, favoriteProjectsAtPaths, isPhotoFavoritePath, isYearSegment, photosAtPaths, projectPath, STATS_SEGMENT } from '../constant/project-url';
import { FavoritesService } from './favorites.service';
import { GalleryService } from './gallery.service';

/**
 * Which view is open: the selected year and project (or a year's All or Favorites), stats, the photo shown,
 * and a share link's prompt, plus what follows from them. It never reads or moves the URL; `AppComponent` picks the
 * view from the URL, calls in here, and moves the URL and SEO to match.
 */
@Injectable({ providedIn: 'root' })
export class ViewStateService {
  private readonly gallery = inject(GalleryService);
  private readonly favorites = inject(FavoritesService);

  readonly selectedProject = signal<Project | undefined>(undefined);
  readonly selectedYear = signal('');
  readonly isImageEnlarged = signal(false);
  readonly showStats = signal(false);
  /** Section headings for the Favorites grid's pictures, empty for every other view. */
  readonly selectedSections = signal<ReadonlyMap<Image, string>>(new Map());
  /** The photo the single view shows, null for the grid. */
  readonly shownImage = signal<Image | null>(null);

  // Paths from a share link being viewed; the prompt to add them shows while there are any
  readonly sharedPaths = signal<string[]>([]);
  readonly sharedNewCount = computed(() => this.sharedPaths().filter(path => !this.favorites.hasPath(path)).length);
  // Names both kinds: '1 project and 2 photos'
  readonly sharedSummary = computed(() => {
    const photos = this.sharedPaths().filter(isPhotoFavoritePath).length;
    const projects = this.sharedPaths().length - photos;
    return [
      ...(projects > 0 ? [`${projects} ${projects === 1 ? 'project' : 'projects'}`] : []),
      ...(photos > 0 ? [`${photos} ${photos === 1 ? 'photo' : 'photos'}`] : []),
    ].join(' and ');
  });

  /** The open project's own favorite state; false for a year, All, Favorites or Featured. */
  readonly isProjectFavorite = computed(() => {
    const project = this.selectedProject();
    return !!project?.name && this.favorites.isFavorite(this.selectedYear(), project);
  });

  readonly selectedMonthRange = computed(() => {
    const project = this.selectedProject();
    return project ? projectMonthRange(project.images, this.selectedYear()) : null;
  });

  // Previous and next around a project, or around a loose photo shown on its own in its year; the All and
  // Favorites views have none, as their photos aren't one place in the home page list
  readonly adjacent = computed(() => {
    const project = this.selectedProject();
    const year = this.selectedYear();
    if (!project) {
      return null;
    }
    const projectsByYear = this.gallery.data().projectsByYear;
    if (project.name) {
      return adjacentLinks(projectsByYear, year, { project: project.name });
    }

    // Only a photo of the view now open; the viewer reports a new one after a swap
    const image = this.shownImage();
    return image && isYearSegment(year) && project.images.includes(image) && this.gallery.loosePhotoYears().get(image.url) === year
      ? adjacentLinks(projectsByYear, year, { photo: image.name })
      : null;
  });

  /** The path of the open view: a project or year, stats, or home. */
  readonly selectedPath = computed(() => {
    if (this.showStats()) {
      return `/${STATS_SEGMENT}`;
    }
    const project = this.selectedProject();
    return project ? projectPath(this.selectedYear(), project.name) : '/';
  });

  select(project: Project, year: string, sections: ReadonlyMap<Image, string> = new Map()): void {
    this.sharedPaths.set([]);
    this.selectedSections.set(sections);
    this.showStats.set(false);
    this.selectedProject.set(project);
    this.selectedYear.set(year);
  }

  /** Home: nothing selected. */
  clear(): void {
    this.sharedPaths.set([]);
    this.selectedProject.set(undefined);
    this.selectedYear.set('');
    this.showStats.set(false);
    this.isImageEnlarged.set(false);
  }

  selectStats(): void {
    this.sharedPaths.set([]);
    this.selectedProject.set(undefined);
    this.selectedYear.set('');
    this.showStats.set(true);
  }

  selectAllProjectsByYear(year: string): void {
    // Search-aware: 'All' covers the projects currently visible for that year
    const yearGroup = this.gallery.filteredProjectsByYear().find(x => x.year === year)
      ?? this.gallery.data().projectsByYear.find(x => x.year === year)!;

    this.select({
      name: '',
      desc: `All of ${year}`,
      images: extractImagesByYear(yearGroup)
    }, year);
  }

  selectAllFavorites(): void {
    // Search-aware like a year's 'All'; each image keeps its year and project in the description
    const { images, sections } = this.favoritesGrid(this.gallery.filteredFavoriteProjects(), this.gallery.filteredFavoritePhotos());

    this.select({
      name: '',
      desc: `All of ${FAVORITES}`,
      images: images
    }, FAVORITES, sections);
  }

  /**
   * A share link's paths. No favorites yet, or nothing new: they're taken and Favorites opens, returning true.
   * Otherwise they're shown with the prompt to merge them, returning false.
   */
  openShared(paths: string[]): boolean {
    if (this.gallery.favoriteCount() === 0 || paths.every(path => this.favorites.hasPath(path))) {
      this.favorites.addAll(paths);
      this.selectAllFavorites();
      return true;
    }

    const shared = new Set(paths);
    const projectsByYear = this.gallery.data().projectsByYear;
    const { images, sections } = this.favoritesGrid(
      favoriteProjectsAtPaths(projectsByYear, shared), photosAtPaths(projectsByYear, shared));

    this.select({
      name: '',
      desc: 'Shared favorites',
      images: images
    }, FAVORITES, sections);
    this.sharedPaths.set(paths);
    return false;
  }

  /** Merges the shared favorites being viewed into this browser's own and opens Favorites. */
  addSharedFavorites(): void {
    this.favorites.addAll(this.sharedPaths());
    this.isImageEnlarged.set(false);
    this.selectAllFavorites();
  }

  /** The heart beside an open project's name: favorites the whole project, not the photo shown. */
  toggleProjectFavorite(): void {
    const project = this.selectedProject();
    if (project?.name) {
      this.favorites.toggle(this.selectedYear(), project);
    }
  }

  /**
   * A favorites grid: the projects' photos under one heading, then the single photos under another, so a
   * favorited project's photos and a favorited photo never read as the same kind.
   */
  private favoritesGrid(projects: ProjectsByYear[], photos: PhotoPlace[]): { images: Image[]; sections: Map<Image, string> } {
    const projectImages = projects.flatMap(yearGroup => extractImagesByYear(yearGroup));
    const photoImages = photos.map(place => createImageForAll(place.year, place.project, place.image));

    return {
      images: [...projectImages, ...photoImages],
      sections: new Map([
        ...projectImages.map(image => [image, 'Projects'] as const),
        ...photoImages.map(image => [image, 'Photos'] as const),
      ]),
    };
  }
}
