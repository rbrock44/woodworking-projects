import { ImageSize, Image, Projects, ProjectsByYear, Project } from "../type/project.type";

export const PROJECT_LIST: string = 'project-list.json';
export const ALL: string = 'All';

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
