import { Image, ProjectsByYear } from '../type/project.type';
import { MONTHS } from './constants';
import { isYearSegment, ProjectLink } from './project-url';

export interface YearStat {
    year: string;
    projects: number;
    photos: number;
}

export interface ProjectStat extends ProjectLink {
    value: number;
}

export interface ShopStats {
    projectCount: number;
    photoCount: number;
    /** Oldest year first; years with no projects are left out, as the data leaves them out. */
    years: YearStat[];
    busiestYear: YearStat | null;
    /** The month of the year the most photos were taken in, across every year. */
    busiestMonth: string | null;
    mostPhotographed: ProjectStat[];
    /** Days from a project's first photo to its last. */
    longestBuilds: ProjectStat[];
}

const TOP_COUNT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The UTC day a YYYYMMDD photo name was taken on, or null when the name holds no real date. */
function photoDay(image: Image): number | null {
    const match = /^(\d{4})(\d{2})(\d{2})/.exec(image.name);
    if (!match) {
        return null;
    }

    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }

    return Date.UTC(year, month - 1, day) / DAY_MS;
}

function top(stats: ProjectStat[]): ProjectStat[] {
    // Stable sort, so ties keep build order and the older project wins
    return stats.filter(stat => stat.value > 0).sort((a, b) => b.value - a.value).slice(0, TOP_COUNT);
}

/** Counts and standouts across every real year; the synthetic All group is skipped. */
export function shopStats(projectsByYear: ProjectsByYear[]): ShopStats {
    const groups = projectsByYear
        .filter(group => isYearSegment(group.year))
        .sort((a, b) => Number(a.year) - Number(b.year));
    const links: ProjectLink[] = groups.flatMap(group => group.projects.map(project => ({ project, year: group.year })));

    const years: YearStat[] = groups.map(group => ({
        year: group.year,
        projects: group.projects.length,
        photos: group.projects.reduce((total, project) => total + project.images.length, 0),
    }));

    const busiestYear = years.reduce<YearStat | null>((best, year) => !best || year.projects > best.projects ? year : best, null);

    const monthCounts = new Array(12).fill(0);
    links.forEach(link => link.project.images.forEach(image => {
        const month = Number(/^\d{4}(\d{2})/.exec(image.name)?.[1]);
        if (month >= 1 && month <= 12) {
            monthCounts[month - 1]++;
        }
    }));
    const busiestMonthIndex = monthCounts.indexOf(Math.max(...monthCounts));

    const longestBuilds = links.map(link => {
        const days = link.project.images.map(photoDay).filter((day): day is number => day !== null);
        return { ...link, value: days.length > 0 ? Math.max(...days) - Math.min(...days) : 0 };
    });

    return {
        projectCount: links.length,
        photoCount: years.reduce((total, year) => total + year.photos, 0),
        years,
        busiestYear,
        busiestMonth: monthCounts[busiestMonthIndex] > 0 ? MONTHS[busiestMonthIndex] : null,
        mostPhotographed: top(links.map(link => ({ ...link, value: link.project.images.length }))),
        longestBuilds: top(longestBuilds),
    };
}

/** '1 day', '45 days', then months once it passes two: '3 months', '14 months'. */
export function formatDays(days: number): string {
    if (days < 60) {
        return days === 1 ? '1 day' : `${days} days`;
    }

    return `${Math.round(days / (365.25 / 12))} months`;
}
