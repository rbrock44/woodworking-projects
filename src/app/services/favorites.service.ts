import { Injectable, signal } from '@angular/core';
import { FAVORITES, URL_PARAM_SHARED } from '../constant/constants';
import { existingFavoritePaths, favoritePhotoPath, favoriteProjectsAtPaths, photosAtPaths, projectPath, sharedFavoritesParam } from '../constant/project-url';
import { PhotoPlace, Project, ProjectsByYear } from '../type/project.type';

// Named before photos could be favorited; kept so stored project-only favorites still load
const STORAGE_KEY = 'favorite-projects';

/**
 * Two kinds of favorites, kept in localStorage as one list of paths: whole projects (`/<year>/<slug>`) and single
 * photos, in no project (`/<year>/photo/<name>`) or in one (`/<year>/<slug>/photo/<name>`).
 */
@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly paths = signal<ReadonlySet<string>>(readStoredPaths());

  isFavorite(year: string, project: Project): boolean {
    return this.paths().has(projectPath(year, project.name));
  }

  /** True for a favorited photo; pass its project's name for a photo inside a project. */
  isPhotoFavorite(year: string, imageName: string, projectName?: string | null): boolean {
    return this.paths().has(favoritePhotoPath(year, imageName, projectName));
  }

  /** True for a project or photo path already favorited. */
  hasPath(path: string): boolean {
    return this.paths().has(path);
  }

  toggle(year: string, project: Project): void {
    this.togglePath(projectPath(year, project.name));
  }

  /** Favorites or unfavorites one photo; pass its project's name for a photo inside a project. */
  togglePhoto(year: string, imageName: string, projectName?: string | null): void {
    this.togglePath(favoritePhotoPath(year, imageName, projectName));
  }

  /** Favorites or unfavorites whatever a project or photo path names. */
  togglePath(path: string): void {
    const paths = new Set(this.paths());

    if (paths.has(path)) {
      paths.delete(path);
    } else {
      paths.add(path);
    }

    this.paths.set(paths);
    writeStoredPaths(paths);
  }

  /** Adds project and photo paths, as from a share link, keeping the ones already there. */
  addAll(added: Iterable<string>): void {
    const paths = new Set([...this.paths(), ...added]);

    this.paths.set(paths);
    writeStoredPaths(paths);
  }

  /** The favorited projects, grouped by year in the same order as the full list. Years with none are left out. */
  favoriteProjects(projectsByYear: ProjectsByYear[]): ProjectsByYear[] {
    return favoriteProjectsAtPaths(projectsByYear, this.paths());
  }

  /** The favorited photos, in projects or not, in home page order. */
  favoritePhotos(projectsByYear: ProjectsByYear[]): PhotoPlace[] {
    return photosAtPaths(projectsByYear, this.paths());
  }

  /** A link that hands these favorites to someone else: `<origin>/favorites?shared=2024/walnut-bench,...`. */
  shareUrl(origin: string, projectsByYear: ProjectsByYear[]): string {
    // Only projects and photos that still exist, so a renamed one's stale path isn't passed on
    const paths = existingFavoritePaths(projectsByYear, this.paths());

    return `${origin}${projectPath(FAVORITES)}?${URL_PARAM_SHARED}=${sharedFavoritesParam(paths)}`;
  }
}

// Storage can be missing (prerendering) or blocked (private mode), so favorites just don't persist there.
function readStoredPaths(): Set<string> {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return new Set(Array.isArray(stored) ? stored.filter(path => typeof path === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeStoredPaths(paths: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...paths]));
  } catch {
    // keep the in-memory favorites for this visit
  }
}
