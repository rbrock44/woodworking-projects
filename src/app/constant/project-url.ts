import { ALL, FAVORITES, looseImages, yearEntries } from './constants';
import { Image, Project, ProjectsByYear } from '../type/project.type';

/** The middle segment of a favorited loose photo's key, `/<year>/photo/<name>`; three segments never match a project. */
export const PHOTO_SEGMENT: string = 'photo';

/** The favorites key for a photo in no project: `/<year>/photo/<name>`. */
export function photoPath(year: string, name: string): string {
    return `/${year}/${PHOTO_SEGMENT}/${name}`;
}

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

/** A photo in no project as a step in the previous/next sequence. */
export interface PhotoLink {
    kind: 'photo';
    image: Image;
    year: string;
}

/** A project or loose photo as a step in the previous/next sequence. */
export type SequenceLink = (ProjectLink & { kind: 'project' }) | PhotoLink;

export interface AdjacentLinks {
    previous: SequenceLink | null;
    next: SequenceLink | null;
}

/** What the previous/next links sit around: a project by name, or a loose photo by file name. */
export type SequenceTarget = { project: string } | { photo: string };

/**
 * Every project and loose photo in the order the home page lists them: newest year first, each year as
 * `yearEntries` lays it out, a run of loose photos one step per photo. The synthetic groups are left out.
 */
export function homeSequence(projectsByYear: ProjectsByYear[]): SequenceLink[] {
    return projectsByYear
        .filter(group => isYearSegment(group.year))
        .sort((a, b) => Number(b.year) - Number(a.year))
        .flatMap(group => yearEntries(group).flatMap((entry): SequenceLink[] => 'project' in entry
            ? [{ kind: 'project', project: entry.project, year: group.year }]
            : entry.photos.map(image => ({ kind: 'photo', image, year: group.year }))));
}

/**
 * The steps just before and after a project or loose photo in `homeSequence`. Null when it isn't found, as for
 * the synthetic All and Favorites groups.
 */
export function adjacentLinks(projectsByYear: ProjectsByYear[], year: string, target: SequenceTarget): AdjacentLinks | null {
    const ordered = homeSequence(projectsByYear);
    const index = ordered.findIndex(link => link.year === year && ('project' in target
        ? link.kind === 'project' && link.project.name === target.project
        : link.kind === 'photo' && link.image.name === target.photo));

    if (index === -1) {
        return null;
    }

    return { previous: ordered[index - 1] ?? null, next: ordered[index + 1] ?? null };
}

const SHARED_PHOTO = new RegExp(`^/?(\\d{4})/${PHOTO_SEGMENT}/(.+)$`);

/**
 * The `?shared=` value for a favorites share link: each `/<year>/<slug>` path without its leading slash, joined
 * by commas, so the link stays readable: `2024/walnut-bench,2023/lidded-box,2023/photo/stamp`. A photo's name is
 * encoded for the list (so a comma in it can't split it) and again for the URL, which the browser decodes once.
 */
export function sharedFavoritesParam(paths: Iterable<string>): string {
    return [...paths].map(path => {
        const photo = SHARED_PHOTO.exec(path);
        return photo
            ? `${photo[1]}/${PHOTO_SEGMENT}/${encodeURIComponent(encodeURIComponent(photo[2]))}`
            : path.replace(/^\/+/, '');
    }).join(',');
}

/**
 * The `/<year>/<slug>` and `/<year>/photo/<name>` paths in a `?shared=` value (as decoded from the URL). Anything
 * else is dropped.
 */
export function parseSharedFavorites(param: string | null): string[] {
    const paths = (param ?? '').split(',').map(part => part.trim()).flatMap(part => {
        const photo = SHARED_PHOTO.exec(part);
        if (photo) {
            try {
                return [photoPath(photo[1], decodeURIComponent(photo[2]))];
            } catch {
                return [];
            }
        }

        const target = parseProjectPath(part);
        return target !== null && isYearSegment(target.year) && target.slug !== null ? [`/${target.year}/${target.slug}`] : [];
    });

    return [...new Set(paths)];
}

/**
 * The projects whose `/<year>/<slug>` paths and loose photos whose `/<year>/photo/<name>` paths are in `paths`,
 * grouped by year in list order (photos in the group's `images`). Years with none are left out.
 */
export function projectsAtPaths(projectsByYear: ProjectsByYear[], paths: ReadonlySet<string>): ProjectsByYear[] {
    return projectsByYear
        .filter(group => isYearSegment(group.year))
        .map(group => {
            const projects = group.projects.filter(project => paths.has(projectPath(group.year, project.name)));
            const images = looseImages(group).filter(image => paths.has(photoPath(group.year, image.name)));
            return images.length > 0 ? { year: group.year, projects, images } : { year: group.year, projects };
        })
        .filter(group => group.projects.length > 0 || (group.images?.length ?? 0) > 0);
}

/** The project and photo paths of a grouped list, as from `projectsAtPaths`. */
export function pathsInGroups(groups: ProjectsByYear[]): string[] {
    return groups.flatMap(group => [
        ...group.projects.map(project => projectPath(group.year, project.name)),
        ...looseImages(group).map(image => photoPath(group.year, image.name)),
    ]);
}
