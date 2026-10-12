import { ALL, FAVORITES } from './constants';

/** The path segment for the synthetic group holding every image from every year. */
export const ALL_SEGMENT: string = 'all';

/** The path segment for every image from the projects favorited in this browser. */
export const FAVORITES_SEGMENT: string = 'favorites';

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
