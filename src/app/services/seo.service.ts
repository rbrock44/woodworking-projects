import { DOCUMENT, Injectable, InjectionToken, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { ALL, FAVORITES, imageAltText, looseImages, photoLabel, projectCover } from '../constant/constants';
import { isStatsPath, isYearSegment, parsePhotoPath, parseProjectPath, photoUrl, projectPath, projectSlug, STATS_SEGMENT } from '../constant/project-url';
import { shopStats } from '../constant/stats';
import { Project, ProjectsByYear } from '../type/project.type';

export const SITE_URL = 'https://woodworking-projects.ryan-brock.com';
const SITE_TITLE = 'Woodworking Projects by Ryan Brock';

export interface PageMeta {
  path: string;
  title: string;
  description: string;
  /** Kept out of search results and the sitemap. */
  noindex?: boolean;
  /** The preview photo link previews show; left out when there is no photo to show. */
  image?: PageImage;
  /** The way here from home, home first and this page last; left out for home and pages kept out of search. */
  breadcrumbs?: Crumb[];
  /** Every photo a year or project page shows, for its schema.org ImageGallery. */
  gallery?: PageImage[];
  /** A photo's own page, described as a schema.org ImageObject of its `image`. */
  photo?: boolean;
}

export interface PageImage {
  url: string;
  alt: string;
}

export interface Crumb {
  name: string;
  path: string;
}

/** Search engines only need a sample of a big gallery, and the page stays light. */
const MAX_GALLERY_IMAGES = 100;

const pageUrl = (path: string) => `${SITE_URL}${path}/`;
const HOME_CRUMB: Crumb = { name: SITE_TITLE, path: '' };

/**
 * schema.org data for a page: its breadcrumb trail, a year or project's ImageGallery and a photo page's ImageObject,
 * as one `@graph`. Null when there's none, as on home or a page kept out of search.
 */
export function pageData(page: PageMeta): Record<string, unknown> | null {
  if (page.noindex) {
    return null;
  }

  const url = pageUrl(page.path);
  const graph: Record<string, unknown>[] = [];
  if (page.breadcrumbs && page.breadcrumbs.length > 1) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: page.breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: pageUrl(crumb.path),
      })),
    });
  }
  if (page.gallery && page.gallery.length > 0) {
    graph.push({
      '@type': 'ImageGallery',
      name: page.title,
      description: page.description,
      url,
      image: page.gallery.slice(0, MAX_GALLERY_IMAGES).map(image => ({ '@type': 'ImageObject', contentUrl: image.url, name: image.alt })),
    });
  }
  if (page.photo && page.image) {
    graph.push({
      '@type': 'ImageObject',
      contentUrl: page.image.url,
      name: page.title,
      description: page.description,
      url,
    });
  }

  return graph.length > 0 ? { '@context': 'https://schema.org', '@graph': graph } : null;
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
      breadcrumbs: [HOME_CRUMB, { name: 'Shop Stats', path: `/${STATS_SEGMENT}` }],
    };
  }

  const photo = parsePhotoPath(path);
  if (photo) {
    return describePhoto(projectsByYear, photo.year, photo.slug, photo.name);
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
      breadcrumbs: [HOME_CRUMB, { name: 'All Projects', path: projectPath(ALL) }],
    };
  }

  // Favorites live in each visitor's browser, so the prerendered page has nothing worth indexing.
  if (target.year === FAVORITES) {
    return {
      path: projectPath(FAVORITES),
      title: `Favorite Projects - ${SITE_TITLE}`,
      description: 'The woodworking projects and photos you have favorited.',
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
      description: yearDescription(group),
      image: yearImage(group),
      breadcrumbs: [HOME_CRUMB, yearCrumb(group.year)],
      gallery: [
        ...group.projects.flatMap(project => project.images.map(image => ({ url: image.url, alt: imageAltText(image, project.name) }))),
        ...looseImages(group).map(image => ({ url: image.url, alt: imageAltText(image) })),
      ],
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
    breadcrumbs: [HOME_CRUMB, yearCrumb(group.year), projectCrumb(group.year, project.name)],
    gallery: project.images.map(image => ({ url: image.url, alt: imageAltText(image, project.name) })),
  };
}

function yearCrumb(year: string): Crumb {
  return { name: year, path: projectPath(year) };
}

function projectCrumb(year: string, name: string): Crumb {
  return { name, path: projectPath(year, name) };
}

/** A photo's own page, previewing that photo; null when its year, project or the photo itself doesn't exist. */
function describePhoto(projectsByYear: ProjectsByYear[], year: string, slug: string | null, name: string): PageMeta | null {
  const group = projectsByYear.find(group => group.year === year && isYearSegment(year));
  const project = slug === null ? undefined : group?.projects.find(project => projectSlug(project.name) === slug);
  const image = slug === null
    ? group && looseImages(group).find(image => image.name === name)
    : project?.images.find(image => image.name === name);
  if (!group || !image) {
    return null;
  }

  // A photo with no description is named by its project, else as 'Photo from <year>'
  const named = image.desc.trim() !== '';
  const label = project && !named ? `${project.name}, photo` : photoLabel(image, year);
  // 'Photo from 2024' already says the year
  const heading = project ? `${label} - ${project.name} (${year})` : named ? `${label} (${year})` : label;
  const description = image.desc.trim()
    || (project ? `${label}, a photo from ${project.name}, ${year}.` : `${label}, a woodworking photo.`);

  const path = photoUrl(year, image.name, project?.name);
  return {
    path,
    title: `${heading} - ${SITE_TITLE}`,
    description,
    image: { url: image.url, alt: imageAltText(image, project?.name) },
    breadcrumbs: [
      HOME_CRUMB,
      yearCrumb(year),
      ...(project ? [projectCrumb(year, project.name)] : []),
      { name: label, path },
    ],
    photo: true,
  };
}

/** Sets the title and every description, social, and canonical tag for a page. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private static readonly PAGE_SCRIPT_ID = 'page-data';

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
    this.updateJsonLd(SeoService.PAGE_SCRIPT_ID, pageData(page) ?? undefined);
    this.document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
  }

  /** The page's JSON-LD block, replaced or removed as pages change. */
  private updateJsonLd(id: string, data: Record<string, unknown> | undefined): void {
    const existing = this.document.getElementById(id);
    if (!data) {
      existing?.remove();
      return;
    }

    const script = existing ?? this.document.createElement('script');
    script.id = id;
    script.setAttribute('type', 'application/ld+json');
    // '<' escaped so no text in the data can close the script tag
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    if (!existing) {
      this.document.head.appendChild(script);
    }
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

/** 'Woodworking projects built in 2024: Bench, Box.' with loose photos counted: '...: Bench and 6 more photos.' */
function yearDescription(group: ProjectsByYear): string {
  const names = group.projects.map(project => project.name);
  const loose = looseImages(group).length;
  const looseText = loose > 0 ? `${loose} ${names.length > 0 ? 'more ' : ''}photo${loose === 1 ? '' : 's'}` : '';
  const parts = names.length > 0 && looseText ? `${names.join(', ')} and ${looseText}` : names.join(', ') || looseText;

  return `Woodworking projects built in ${group.year}: ${parts}.`;
}

/** The newest project's cover, or the year's last loose photo when it has no projects. */
function yearImage(group: ProjectsByYear): PageImage | undefined {
  const photo = looseImages(group).at(-1);
  return coverImage(group.projects.at(-1)) ?? (photo && { url: photo.url, alt: imageAltText(photo) });
}
