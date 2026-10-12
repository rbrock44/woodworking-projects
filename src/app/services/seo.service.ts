import { DOCUMENT, Injectable, InjectionToken, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { ALL } from '../constant/constants';
import { parseProjectPath, projectPath, projectSlug } from '../constant/project-url';
import { ProjectsByYear } from '../type/project.type';

export const SITE_URL = 'https://woodworking-projects.ryan-brock.com';
const SITE_TITLE = 'Woodworking Projects';

export interface PageMeta {
  path: string;
  title: string;
  description: string;
}

export const HOME_PAGE: PageMeta = {
  path: '',
  title: SITE_TITLE,
  description: "A showcase of Ryan Brock's woodworking projects, featuring builds organized by year with detailed photo galleries for each project.",
};

/** Every project by year, read from project-list.json. Only provided during prerendering. */
export const PROJECT_LIST = new InjectionToken<ProjectsByYear[]>('PROJECT_LIST');

/** The title and description for a path, or null when it names no year or project that exists. */
export function describePage(projectsByYear: ProjectsByYear[], path: string): PageMeta | null {
  const target = parseProjectPath(path);
  if (!target) {
    return null;
  }

  if (target.year === ALL) {
    return {
      path: projectPath(ALL),
      title: `All Projects - ${SITE_TITLE}`,
      description: 'Every photo from every woodworking project, newest year first.',
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
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
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

    this.seo.update(describePage(this.projectList, snapshot.url) ?? HOME_PAGE);
  }
}
