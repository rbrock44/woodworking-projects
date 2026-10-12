import { Injectable, signal } from '@angular/core';
import { ALL } from '../constant/constants';
import { projectPath } from '../constant/project-url';
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

  /** The favorited projects grouped by year, in the same order as the full list. Years with none are left out. */
  favoritesByYear(projectsByYear: ProjectsByYear[]): ProjectsByYear[] {
    return projectsByYear
      .filter(group => group.year !== ALL)
      .map(group => ({ year: group.year, projects: group.projects.filter(project => this.isFavorite(group.year, project)) }))
      .filter(group => group.projects.length > 0);
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
