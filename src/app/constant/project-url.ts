import { ALL, FAVORITES, looseImages, yearEntries } from './constants';
import { Image, PhotoPlace, Project, ProjectsByYear } from '../type/project.type';

/**
 * The segment before a favorited photo's name: `/<year>/photo/<name>` in no project, `/<year>/<slug>/photo/<name>`
 * in one. Three or four segments never match a project, which is always two.
 */
export const PHOTO_SEGMENT: string = 'photo';

/** The favorites key for a photo in no project: `/<year>/photo/<name>`. */
export function photoPath(year: string, name: string): string {
    return `/${year}/${PHOTO_SEGMENT}/${name}`;
}

/** The favorites key for a photo inside a project: `/<year>/<slug>/photo/<name>`. */
export function projectPhotoPath(year: string, projectName: string, name: string): string {
    return `${projectPath(year, projectName)}/${PHOTO_SEGMENT}/${name}`;
}

/** A photo's favorites key, in its project when it has one. */
export function favoritePhotoPath(year: string, name: string, projectName?: string | null): string {
    return projectName ? projectPhotoPath(year, projectName, name) : photoPath(year, name);
}

// Checked before the loose form: photo names have no slash, so `2023/photo/photo/x` is photo x of a project
// slugged 'photo', never a loose photo named 'photo/x'. The loose form keeps its old `.+` so old keys read as before.
const PROJECT_PHOTO_KEY = new RegExp(`^/?(\\d{4})/([^/]+)/${PHOTO_SEGMENT}/([^/]+)$`);
const LOOSE_PHOTO_KEY = new RegExp(`^/?(\\d{4})/${PHOTO_SEGMENT}/(.+)$`);

/** True for a favorited photo's key, in a project or not; false for a project's. */
export function isPhotoFavoritePath(path: string): boolean {
    return PROJECT_PHOTO_KEY.test(path) || LOOSE_PHOTO_KEY.test(path);
}

/**
 * A photo's own page, the same path as its favorites key with the name encoded for a URL. Each one is prerendered,
 * so a shared link previews that photo rather than its project.
 */
export function photoUrl(year: string, name: string, projectName?: string | null): string {
    return favoritePhotoPath(year, encodeURIComponent(name), projectName);
}

export interface PhotoTarget {
    year: string;
    /** The project's slug, or null for a photo in no project. */
    slug: string | null;
    /** The photo's file name, decoded. */
    name: string;
}

const PROJECT_PHOTO_URL = new RegExp(`^/?(\\d{4})/([^/]+)/${PHOTO_SEGMENT}/([^/]+)$`);
const LOOSE_PHOTO_URL = new RegExp(`^/?(\\d{4})/${PHOTO_SEGMENT}/([^/]+)$`);

/** The photo a `/<year>/photo/<name>` or `/<year>/<slug>/photo/<name>` page shows, or null for any other path. */
export function parsePhotoPath(path: string): PhotoTarget | null {
    const clean = path.split(/[?#]/)[0].replace(/\/+$/, '');
    const inProject = PROJECT_PHOTO_URL.exec(clean);
    const loose = inProject ? null : LOOSE_PHOTO_URL.exec(clean);
    const [year, slug, encoded] = inProject ? [inProject[1], inProject[2], inProject[3]] : loose ? [loose[1], null, loose[2]] : [];
    if (!year || encoded === undefined) {
        return null;
    }

    try {
        return { year, slug: slug ?? null, name: decodeURIComponent(encoded) };
    } catch {
        return null;
    }
}

/**
 * The view a path shows, without query, hash, trailing slash or a photo page's `/photo/<name>`: `/2024/owl` for
 * `/2024/owl/photo/a?index=2`, `/2024` for `/2024/photo/b`, '' for home.
 */
export function viewPathOf(path: string): string {
    const clean = path.split(/[?#]/)[0].replace(/\/+$/, '');
    const photo = parsePhotoPath(clean);
    if (!photo) {
        return clean;
    }

    return photo.slug === null ? `/${photo.year}` : `/${photo.year}/${photo.slug}`;
}

/**
 * The photo's own page when the view at `viewPath` is where it lives (its project's page, or its year for a photo
 * in no project); null in any other view, such as a year, All or Favorites showing a project's photo.
 */
export function ownPhotoUrl(viewPath: string, place: PhotoPlace): string | null {
    const home = projectPath(place.year, place.project);
    return viewPathOf(viewPath) === home ? photoUrl(place.year, place.image.name, place.project) : null;
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

/**
 * The `?shared=` value for a favorites share link: each path without its leading slash, joined by commas, so the
 * link stays readable: `2024/walnut-bench,2023/photo/stamp,2023/lidded-box/photo/lid`. A photo's name is encoded
 * for the list (so a comma in it can't split it) and again for the URL, which the browser decodes once.
 */
export function sharedFavoritesParam(paths: Iterable<string>): string {
    const twice = (name: string) => encodeURIComponent(encodeURIComponent(name));

    return [...paths].map(path => {
        const inProject = PROJECT_PHOTO_KEY.exec(path);
        if (inProject) {
            return `${inProject[1]}/${inProject[2]}/${PHOTO_SEGMENT}/${twice(inProject[3])}`;
        }

        const loose = LOOSE_PHOTO_KEY.exec(path);
        return loose ? `${loose[1]}/${PHOTO_SEGMENT}/${twice(loose[2])}` : path.replace(/^\/+/, '');
    }).join(',');
}

/**
 * The `/<year>/<slug>`, `/<year>/photo/<name>` and `/<year>/<slug>/photo/<name>` paths in a `?shared=` value (as
 * decoded from the URL). Anything else is dropped.
 */
export function parseSharedFavorites(param: string | null): string[] {
    const decoded = (name: string): string | null => {
        try {
            return decodeURIComponent(name);
        } catch {
            return null;
        }
    };

    const paths = (param ?? '').split(',').map(part => part.trim()).flatMap(part => {
        const inProject = PROJECT_PHOTO_KEY.exec(part);
        if (inProject) {
            const name = decoded(inProject[3]);
            return name === null ? [] : [`/${inProject[1]}/${inProject[2]}/${PHOTO_SEGMENT}/${name}`];
        }

        const loose = LOOSE_PHOTO_KEY.exec(part);
        if (loose) {
            const name = decoded(loose[2]);
            return name === null ? [] : [photoPath(loose[1], name)];
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

/** The projects whose `/<year>/<slug>` paths are in `paths`, grouped by year in list order, without any photos. */
export function favoriteProjectsAtPaths(projectsByYear: ProjectsByYear[], paths: ReadonlySet<string>): ProjectsByYear[] {
    return projectsAtPaths(projectsByYear, paths)
        .filter(group => group.projects.length > 0)
        .map(group => ({ year: group.year, projects: group.projects }));
}

/** Every real year's photos, in a project or not, by url: where each one lives and its favorites key. */
export function photoPlaces(projectsByYear: ProjectsByYear[]): Map<string, PhotoPlace> {
    return new Map(homeOrderPhotos(projectsByYear).map(place => [place.image.url, place] as const));
}

/** The photos, in projects or not, whose favorites keys are in `paths`, newest year first in home page order. */
export function photosAtPaths(projectsByYear: ProjectsByYear[], paths: ReadonlySet<string>): PhotoPlace[] {
    return homeOrderPhotos(projectsByYear).filter(place => paths.has(place.path));
}

/** The paths in `paths` that still name a project or photo: projects first, then photos, both in list order. */
export function existingFavoritePaths(projectsByYear: ProjectsByYear[], paths: ReadonlySet<string>): string[] {
    return [
        ...pathsInGroups(favoriteProjectsAtPaths(projectsByYear, paths)),
        ...photosAtPaths(projectsByYear, paths).map(place => place.path),
    ];
}

function homeOrderPhotos(projectsByYear: ProjectsByYear[]): PhotoPlace[] {
    return projectsByYear
        .filter(group => isYearSegment(group.year))
        .flatMap(group => yearEntries(group).flatMap((entry): PhotoPlace[] => 'project' in entry
            ? entry.project.images.map(image => ({
                year: group.year,
                project: entry.project.name,
                path: projectPhotoPath(group.year, entry.project.name, image.name),
                image,
            }))
            : entry.photos.map(image => ({ year: group.year, project: null, path: photoPath(group.year, image.name), image }))));
}
