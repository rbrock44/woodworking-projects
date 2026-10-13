import { ImageSize, Image, Projects, ProjectsByYear, Project } from "../type/project.type";

export const PROJECT_LIST: string = 'project-list.json';
export const ALL: string = 'All';
export const FAVORITES: string = 'Favorites';

export const URL_PARAM_IMAGE: string = 'image';
export const URL_PARAM_PROJECT: string = 'project';
export const URL_PARAM_YEAR: string = 'year';
export const URL_PARAM_INDEX: string = 'index';

export const CSS_SELECTOR_IMAGES: string = '.image-item img'

export const IMAGE_SIZE_DEFAULT: ImageSize = { height: 400, width: 300 };
const IMAGE_SIZE_SUPER_TINY: ImageSize = { height: 150, width: 112.5 };
const IMAGE_SIZE_TINY: ImageSize = { height: 200, width: 150 };
const IMAGE_SIZE_SMALL: ImageSize = { height: 267, width: 200 };
const IMAGE_SIZE_LARGE: ImageSize = { height: 533, width: 400 };

export function adjustImageToScreenSize(width: number, height: number): ImageSize {
    let widthImage = { height: 0, width: 0 };
    let heightImage = { height: 0, width: 0 };

    if (width < 315) {
        widthImage = { ...IMAGE_SIZE_TINY };
    } else if (width < 500) {
        widthImage = { ...IMAGE_SIZE_SMALL };
    } else if (width > 900) {
        widthImage = { ...IMAGE_SIZE_LARGE };
    } else {
        widthImage = { ...IMAGE_SIZE_DEFAULT };
    }

    if (height < 500) {
        heightImage = { ...IMAGE_SIZE_SUPER_TINY };
    } else if (height < 600) {
        heightImage = { ...IMAGE_SIZE_TINY };
    } else if (height < 700) {
        heightImage = { ...IMAGE_SIZE_SMALL };
    } else if (height > 800) {
        heightImage = { ...IMAGE_SIZE_LARGE };
    } else {
        heightImage = { ...IMAGE_SIZE_DEFAULT };
    }

    if (widthImage.height > heightImage.height) {
        return heightImage;
    } else {
        return widthImage;
    }
}

export function createThumbnailImageUrl(url: string): string {
    if (url.endsWith('.jpg')) {
        return url.slice(0, -4) + '-150x200.jpg';
    } else {
        return url;
    }
}

/** The 900x1200 .webp copy of a photo made by the images repo's create-midsize-images.ps1, ~200KB instead of ~1MB. */
export function createMidsizeImageUrl(url: string): string {
    if (url.endsWith('.jpg')) {
        return url.slice(0, -4) + '-900x1200.webp';
    } else {
        return url;
    }
}

export function createImageForAll(year: string, projectName: string, image: Image): Image {
    return {
        name: image.name,
        desc: `(${year} - ${projectName})` + (image.desc.trim() !== '' ? ` - ${image.desc}` : ''),
        url: image.url
    }
}

export function extractAllImages(projectsData: Projects): Image[] {
    // OLD flatmap method, fast but no way to trace project name and year to image
    // const allImages = projectsData.projectsByYear
    //   .flatMap(entry => entry.projects)
    //   .flatMap(project => project.images);

    const allImages: Image[] = [];

    // NEW method - placing year and project name into image description
    projectsData.projectsByYear.forEach(projectsByYear => {
        projectsByYear.projects.forEach(projects => {
            projects.images.forEach(image => {
                allImages.push(createImageForAll(projectsByYear.year, projects.name, image));
            });
        });
    });

    return allImages;
}

export function extractImagesByYear(projectsByYear: ProjectsByYear): Image[] {
    const allImages: Image[] = [];

    projectsByYear.projects.forEach(projects => {
        projects.images.forEach(image => {
            allImages.push(createImageForAll(projectsByYear.year, projects.name, image));
        });
    });

    return allImages;
}

function createAllProjectsByYear(images: Image[]): ProjectsByYear {
    const allProject: Project = {
        name: ALL,
        desc: 'All of the projects from all of the years',
        images: images,
    };

    const allProjectsByYear: ProjectsByYear = {
        year: ALL,
        projects: [allProject],
    };

    return allProjectsByYear;
}

export function addAllProjectsByYear(projectsData: Projects): Projects {
    const allImages: Image[] = extractAllImages(projectsData);
    const allProjectsByYear: ProjectsByYear = createAllProjectsByYear(allImages);

    const updatedProjects: Projects = {
        projectsByYear: [allProjectsByYear, ...projectsData.projectsByYear],
    };

    return updatedProjects;
}

const MONTHS: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * The months a project's photos were taken in, read from their YYYYMMDD names. Back-to-back months join into a
 * range and gaps are listed: 'March 2024', 'March – May 2024', 'February, May 2024', 'July 2023 – February 2024'.
 * The year is left off when every month falls in `projectYear`, since the page already shows it: 'March – May'.
 */
export function projectMonthRange(images: Image[], projectYear?: string): string | null {
    // Months counted from year 0, so consecutive months differ by 1 even across a new year
    const months = [...new Set(images
        .map(image => /^(\d{4})(\d{2})\d{2}/.exec(image.name))
        .filter(match => match !== null && Number(match[2]) >= 1 && Number(match[2]) <= 12)
        .map(match => Number(match![1]) * 12 + Number(match![2]) - 1))]
        .sort((a, b) => a - b);

    if (months.length === 0) {
        return null;
    }

    const runs: [number, number][] = [];
    months.forEach(month => {
        const run = runs.at(-1);
        if (run && month === run[1] + 1) {
            run[1] = month;
        } else {
            runs.push([month, month]);
        }
    });

    const year = (month: number) => Math.floor(month / 12);
    const monthName = (month: number) => MONTHS[month % 12];
    const hideYears = months.every(month => String(year(month)) === projectYear);
    // A year is written once, after the last month in it, the way 'February, May 2024' reads
    const label = (month: number, yearEndsHere: boolean) =>
        hideYears || !yearEndsHere ? monthName(month) : `${monthName(month)} ${year(month)}`;

    return runs.map(([first, last], i) => {
        const next = runs[i + 1];
        const lastLabel = label(last, !next || year(next[0]) !== year(last));

        return first === last ? lastLabel : `${label(first, year(first) !== year(last))} – ${lastLabel}`;
    }).join(', ');
}

/**
 * Alt text for a photo: its description when it has one, otherwise the project and the date in its YYYYMMDD name,
 * like 'Baby Rattles, photo from October 13, 2024'.
 */
export function imageAltText(image: Image, projectName?: string): string {
    if (image.desc.trim() !== '') {
        return image.desc;
    }

    const subject = projectName?.trim() ? `${projectName.trim()}, photo` : 'Woodworking project photo';
    const match = /^(\d{4})(\d{2})(\d{2})/.exec(image.name);
    const month = match ? Number(match[2]) : 0;

    return month >= 1 && month <= 12
        ? `${subject} from ${MONTHS[month - 1]} ${Number(match![3])}, ${match![1]}`
        : subject;
}

export function splitSearchTerms(search: string): string[] {
    return search.toLowerCase().split(/\s+/).filter(term => term !== '');
}

function matchesAllTerms(terms: string[], ...fields: (string | undefined)[]): boolean {
    const haystack = fields.filter(field => field !== undefined).join(' ').toLowerCase();

    return terms.every(term => haystack.includes(term));
}

export function filterProjectsBySearch(projectsByYear: ProjectsByYear[], search: string): ProjectsByYear[] {
    const terms = splitSearchTerms(search);

    if (terms.length === 0) {
        return projectsByYear;
    }

    // The year is part of every project's haystack, so 'bench' and '2023 bench' both work
    const filtered: ProjectsByYear[] = [];

    projectsByYear.forEach(yearGroup => {
        const projects = yearGroup.projects.filter(project =>
            matchesAllTerms(terms, yearGroup.year, project.name, project.desc));

        if (projects.length > 0) {
            filtered.push({ year: yearGroup.year, projects: projects });
        }
    });

    return filtered;
}

export function countProjects(projectsByYear: ProjectsByYear[]): number {
    return projectsByYear.reduce((total, yearGroup) => total + yearGroup.projects.length, 0);
}

export function filterImagesBySearch(images: Image[], search: string): Image[] {
    const terms = splitSearchTerms(search);

    if (terms.length === 0) {
        return images;
    }

    return images.filter(image => matchesAllTerms(terms, image.name, image.desc));
}

export type SwipeDirection = 'previous' | 'next';

/** How far, in px, a finger has to travel sideways before a touch counts as a swipe. */
export const SWIPE_MIN_DISTANCE: number = 50;

/**
 * 'next' for a swipe to the left, 'previous' for one to the right, null for a tap, a short drag or anything more
 * vertical than sideways, so scrolling the page never flips a photo.
 */
export function swipeDirection(deltaX: number, deltaY: number): SwipeDirection | null {
    if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE || Math.abs(deltaX) <= Math.abs(deltaY) * 1.5) {
        return null;
    }

    return deltaX < 0 ? 'next' : 'previous';
}

/** Remembers where a touch started so its end can be read as a swipe. A second finger (pinch zoom) cancels it. */
export class SwipeTracker {
    private start: { x: number; y: number } | null = null;

    begin(event: TouchEvent): void {
        const touch = event.touches.length === 1 ? event.changedTouches[0] : undefined;
        this.start = touch ? { x: touch.clientX, y: touch.clientY } : null;
    }

    end(event: TouchEvent): SwipeDirection | null {
        const touch = event.changedTouches[0];
        const start = this.start;
        this.start = null;

        return start && touch ? swipeDirection(touch.clientX - start.x, touch.clientY - start.y) : null;
    }
}

/**
 * The photos either side of the one shown, so the next arrow or swipe is instant: midsize copies in the single
 * view, originals in the full screen overlay since that is what it loads.
 */
export function neighborImageUrls(images: Image[], index: number, fullSize: boolean): string[] {
    return [images[index + 1], images[index - 1]]
        .filter((image): image is Image => image !== undefined)
        .map(image => fullSize ? image.url : createMidsizeImageUrl(image.url));
}
