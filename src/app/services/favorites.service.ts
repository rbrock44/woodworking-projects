import { Injectable, signal } from '@angular/core';
import { FAVORITES, URL_PARAM_SHARED } from '../constant/constants';
import { projectPath, projectsAtPaths, sharedFavoritesParam } from '../constant/project-url';
import { Project, ProjectsByYear } from '../type/project.type';

const STORAGE_KEY = 'favorite-projects';

/** Projects favorited in this browser, kept in localStorage by their `/<year>/<slug>` path. */
@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly paths = signal<ReadonlySet<string>>(readStoredPaths());

  isFavorite(year: string, project: Project): boolean {
    return this.paths().has(projectPath(year, project.name));
  }

  /** True for a `/<year>/<slug>` path already favorited. */
  hasPath(path: string): boolean {
    return this.paths().has(path);
  }

  toggle(year: string, project: Project): void {
    const path = projectPath(year, project.name);
    const paths = new Set(this.paths());

    if (paths.has(path)) {
      paths.delete(path);
    } else {
      paths.add(path);
    }

    this.paths.set(paths);
    writeStoredPaths(paths);
  }

  /** Adds `/<year>/<slug>` paths, as from a share link, keeping the ones already there. */
  addAll(added: Iterable<string>): void {
    const paths = new Set([...this.paths(), ...added]);

    this.paths.set(paths);
    writeStoredPaths(paths);
  }

  /** The favorited projects grouped by year, in the same order as the full list. Years with none are left out. */
  favoritesByYear(projectsByYear: ProjectsByYear[]): ProjectsByYear[] {
    return projectsAtPaths(projectsByYear, this.paths());
  }

  /** A link that hands these favorites to someone else: `<origin>/favorites?shared=2024/walnut-bench,...`. */
  shareUrl(origin: string, projectsByYear: ProjectsByYear[]): string {
    // Only projects that still exist, so a renamed one's stale path isn't passed on
    const paths = this.favoritesByYear(projectsByYear)
      .flatMap(group => group.projects.map(project => projectPath(group.year, project.name)));

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
