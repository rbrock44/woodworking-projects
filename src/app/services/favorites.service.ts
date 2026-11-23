import { Injectable, signal } from '@angular/core';
import { FAVORITES, URL_PARAM_SHARED } from '../constant/constants';
import { pathsInGroups, photoPath, projectPath, projectsAtPaths, sharedFavoritesParam } from '../constant/project-url';
import { Project, ProjectsByYear } from '../type/project.type';

// Named before photos could be favorited; kept so stored project-only favorites still load
const STORAGE_KEY = 'favorite-projects';

/**
 * Projects and loose photos favorited in this browser, kept in localStorage as one list of paths: `/<year>/<slug>`
 * for a project, `/<year>/photo/<name>` for a photo in no project.
 */
@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly paths = signal<ReadonlySet<string>>(readStoredPaths());

  isFavorite(year: string, project: Project): boolean {
    return this.paths().has(projectPath(year, project.name));
  }

  /** True for a loose photo (one in no project) that is favorited. */
  isPhotoFavorite(year: string, imageName: string): boolean {
    return this.paths().has(photoPath(year, imageName));
  }

  /** True for a `/<year>/<slug>` or `/<year>/photo/<name>` path already favorited. */
  hasPath(path: string): boolean {
    return this.paths().has(path);
  }

  toggle(year: string, project: Project): void {
    this.togglePath(projectPath(year, project.name));
  }

  /** Favorites or unfavorites a loose photo; project photos go with their project. */
  togglePhoto(year: string, imageName: string): void {
    this.togglePath(photoPath(year, imageName));
  }

  private togglePath(path: string): void {
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

  /**
   * The favorited projects, and loose photos in each group's `images`, grouped by year in the same order as the
   * full list. Years with none are left out.
   */
  favoritesByYear(projectsByYear: ProjectsByYear[]): ProjectsByYear[] {
    return projectsAtPaths(projectsByYear, this.paths());
  }

  /** A link that hands these favorites to someone else: `<origin>/favorites?shared=2024/walnut-bench,...`. */
  shareUrl(origin: string, projectsByYear: ProjectsByYear[]): string {
    // Only projects and photos that still exist, so a renamed one's stale path isn't passed on
    const paths = pathsInGroups(this.favoritesByYear(projectsByYear));

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
