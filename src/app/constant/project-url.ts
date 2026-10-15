import { ALL, FAVORITES } from './constants';
import { Project, ProjectsByYear } from '../type/project.type';

/** The path segment for the synthetic group holding every image from every year. */
export const ALL_SEGMENT: string = 'all';

/** The path segment for every image from the projects favorited in this browser. */
export const FAVORITES_SEGMENT: string = 'favorites';

/** The path segment for the shop stats page. */
export const STATS_SEGMENT: string = 'stats';

/** True for the stats page's path, ignoring query, hash and trailing slash. */
export function isStatsPath(path: string): boolean {
    return path.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '') === STATS_SEGMENT;
}

/** A plain left click; anything with a modifier is left to the browser so links open in new tabs. */
export function isPlainLeftClick(event: MouseEvent): boolean {
    return event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
}

/** Lowercase, hyphenated, ascii-only form of a project name for its URL. */
export function projectSlug(name: string): string {
    return name
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** `/<year>/<slug>` for a project, `/<year>` for all of a year, `/all` for everything, `/favorites` for favorites. */
export function projectPath(year: string, name?: string | null): string {
    if (year === ALL) {
        return `/${ALL_SEGMENT}`;
    }

    if (year === FAVORITES) {
        return `/${FAVORITES_SEGMENT}`;
    }

    const slug = name ? projectSlug(name) : '';
    return slug ? `/${year}/${slug}` : `/${year}`;
}

/** True for a URL segment that can be a year. */
export function isYearSegment(segment: string | undefined): boolean {
    return !!segment && /^\d{4}$/.test(segment);
}

export interface ProjectTarget {
    /** A year, ALL for everything, or FAVORITES for the favorited projects. */
    year: string;
    /** The project's slug, or null for the whole year. */
    slug: string | null;
}

/** What a path points at, or null for home and anything that isn't a project path. */
export function parseProjectPath(path: string): ProjectTarget | null {
    const segments = path.split(/[?#]/)[0].split('/').filter(Boolean);

    if (segments.length === 1 && segments[0] === ALL_SEGMENT) {
        return { year: ALL, slug: null };
    }

    if (segments.length === 1 && segments[0] === FAVORITES_SEGMENT) {
        return { year: FAVORITES, slug: null };
    }

    if (!isYearSegment(segments[0]) || segments.length > 2) {
        return null;
    }

    return { year: segments[0], slug: segments[1] ?? null };
}

/** The new path for an old `?year=<year>&project=<name>` link. */
export function legacyProjectPath(year: string, project: string | null): string {
    if (year.toLowerCase() === ALL.toLowerCase()) {
        return projectPath(ALL);
    }

    return projectPath(year, project);
}

export interface ProjectLink {
    project: Project;
    year: string;
}

export interface AdjacentProjects {
    previous: ProjectLink | null;
    next: ProjectLink | null;
}

/**
 * The projects built just before and after one: oldest year first, each year's projects in the order listed.
 * Null when the project isn't found, as for the synthetic All and Favorites groups.
 */
export function adjacentProjects(projectsByYear: ProjectsByYear[], year: string, name: string): AdjacentProjects | null {
    const ordered: ProjectLink[] = projectsByYear
        .filter(group => isYearSegment(group.year))
        .sort((a, b) => Number(a.year) - Number(b.year))
        .flatMap(group => group.projects.map(project => ({ project, year: group.year })));
    const index = ordered.findIndex(link => link.year === year && link.project.name === name);

    if (index === -1) {
        return null;
    }

    return { previous: ordered[index - 1] ?? null, next: ordered[index + 1] ?? null };
}

/**
 * The `?shared=` value for a favorites share link: each `/<year>/<slug>` path without its leading slash, joined
 * by commas, so the link stays readable: `2024/walnut-bench,2023/lidded-box`.
 */
export function sharedFavoritesParam(paths: Iterable<string>): string {
    return [...paths].map(path => path.replace(/^\/+/, '')).join(',');
}

/** The `/<year>/<slug>` paths in a `?shared=` value. Anything that isn't a project path is dropped. */
export function parseSharedFavorites(param: string | null): string[] {
    const paths = (param ?? '').split(',')
        .map(part => parseProjectPath(part.trim()))
        .filter((target): target is ProjectTarget => target !== null && isYearSegment(target.year) && target.slug !== null)
        .map(target => `/${target.year}/${target.slug}`);

    return [...new Set(paths)];
}

/** The projects whose `/<year>/<slug>` paths are in `paths`, grouped by year in list order. Years with none are left out. */
export function projectsAtPaths(projectsByYear: ProjectsByYear[], paths: ReadonlySet<string>): ProjectsByYear[] {
    return projectsByYear
        .filter(group => isYearSegment(group.year))
        .map(group => ({ year: group.year, projects: group.projects.filter(project => paths.has(projectPath(group.year, project.name))) }))
        .filter(group => group.projects.length > 0);
}
