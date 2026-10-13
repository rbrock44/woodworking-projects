import { DOCUMENT, Injectable, InjectionToken, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { ALL, FAVORITES, imageAltText, projectCover } from '../constant/constants';
import { isStatsPath, isYearSegment, parseProjectPath, projectPath, projectSlug, STATS_SEGMENT } from '../constant/project-url';
import { shopStats } from '../constant/stats';
import { Project, ProjectsByYear } from '../type/project.type';

export const SITE_URL = 'https://woodworking-projects.ryan-brock.com';
const SITE_TITLE = 'Woodworking Projects';

export interface PageMeta {
  path: string;
  title: string;
  description: string;
  /** Kept out of search results and the sitemap. */
  noindex?: boolean;
  /** The preview photo link previews show; left out when there is no photo to show. */
  image?: PageImage;
}

export interface PageImage {
  url: string;
  alt: string;
}

/**
 * A project's cover as a preview photo. The original jpg rather than the midsize webp, since some link preview
 * crawlers skip webp; at ~1MB it is well under every platform's limit.
 */
function coverImage(project: Project | undefined): PageImage | undefined {
  const cover = project && projectCover(project);
  return cover && { url: cover.url, alt: imageAltText(cover, project!.name) };
}

/** The latest project in a year's list, or of the newest year; it stands for pages that cover many projects. */
function newestProject(projectsByYear: ProjectsByYear[]): Project | undefined {
  const newestYear = projectsByYear
    .filter(group => isYearSegment(group.year))
    .reduce<ProjectsByYear | undefined>((newest, group) => !newest || Number(group.year) > Number(newest.year) ? group : newest, undefined);

  return newestYear?.projects.at(-1);
}

/** Home, also the fallback for any path describePage doesn't know, with the newest project's cover. */
export function homePage(projectsByYear: ProjectsByYear[]): PageMeta {
  return {
    path: '',
    title: SITE_TITLE,
    description: "A showcase of Ryan Brock's woodworking projects, featuring builds organized by year with detailed photo galleries for each project.",
    image: coverImage(newestProject(projectsByYear)),
  };
}

/** Every project by year, read from project-list.json. Only provided during prerendering. */
export const PROJECT_LIST = new InjectionToken<ProjectsByYear[]>('PROJECT_LIST');

/** The title and description for a path, or null when it names no year or project that exists. */
export function describePage(projectsByYear: ProjectsByYear[], path: string): PageMeta | null {
  if (isStatsPath(path)) {
    const stats = shopStats(projectsByYear);
    const [first, last] = [stats.years[0]?.year, stats.years.at(-1)?.year];
    const span = !first ? '' : first === last ? `, ${first}` : `, ${first} to ${last}`;
    return {
      path: `/${STATS_SEGMENT}`,
      title: `Shop Stats - ${SITE_TITLE}`,
      description: `${stats.projectCount} woodworking projects and ${stats.photoCount} photos${span}: projects per year, the most photographed and the longest builds.`,
      image: coverImage(newestProject(projectsByYear)),
    };
  }

  const target = parseProjectPath(path);
  if (!target) {
    return null;
  }

  if (target.year === ALL) {
    return {
      path: projectPath(ALL),
      title: `All Projects - ${SITE_TITLE}`,
      description: 'Every photo from every woodworking project, newest year first.',
      image: coverImage(newestProject(projectsByYear)),
    };
  }

  // Favorites live in each visitor's browser, so the prerendered page has nothing worth indexing.
  if (target.year === FAVORITES) {
    return {
      path: projectPath(FAVORITES),
      title: `Favorite Projects - ${SITE_TITLE}`,
      description: 'The woodworking projects you have favorited.',
      noindex: true,
      image: coverImage(newestProject(projectsByYear)),
    };
  }

  const group = projectsByYear.find(group => group.year === target.year);
  if (!group) {
    return null;
  }

  if (target.slug === null) {
    return {
      path: projectPath(group.year),
      title: `${group.year} Projects - ${SITE_TITLE}`,
      description: `Woodworking projects built in ${group.year}: ${group.projects.map(project => project.name).join(', ')}.`,
      image: coverImage(group.projects.at(-1)),
    };
  }

  const project = group.projects.find(project => projectSlug(project.name) === target.slug);
  if (!project) {
    return null;
  }

  return {
    path: projectPath(group.year, project.name),
    title: `${project.name} (${group.year}) - ${SITE_TITLE}`,
    description: project.desc?.trim() || `${project.name}, a woodworking project from ${group.year}.`,
    image: coverImage(project),
  };
}

/** Sets the title and every description, social, and canonical tag for a page. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  update(page: PageMeta): void {
    // GitHub Pages serves each prerendered page from its folder, so the trailing slash is the real URL.
    const url = `${SITE_URL}${page.path}/`;

    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ name: 'robots', content: page.noindex ? 'noindex' : 'index, follow' });
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.updateImage(page.image);
    this.document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
  }

  /** A large photo card when there is a photo; otherwise the plain card, with no stale photo left from the last page. */
  private updateImage(image: PageImage | undefined): void {
    this.meta.updateTag({ name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' });

    if (image) {
      this.meta.updateTag({ property: 'og:image', content: image.url });
      this.meta.updateTag({ property: 'og:image:alt', content: image.alt });
      this.meta.updateTag({ name: 'twitter:image', content: image.url });
      this.meta.updateTag({ name: 'twitter:image:alt', content: image.alt });
    } else {
      this.meta.removeTag('property="og:image"');
      this.meta.removeTag('property="og:image:alt"');
      this.meta.removeTag('name="twitter:image"');
      this.meta.removeTag('name="twitter:image:alt"');
    }
  }
}

/**
 * Bakes each page's tags in during prerendering. In the browser AppComponent keeps them in
 * sync instead, since view changes move the URL through Location rather than the router.
 */
@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly seo = inject(SeoService);
  private readonly projectList = inject(PROJECT_LIST, { optional: true });

  override updateTitle(snapshot: RouterStateSnapshot): void {
    if (!this.projectList) {
      return;
    }

    this.seo.update(describePage(this.projectList, snapshot.url) ?? homePage(this.projectList));
  }
}
