import { RenderMode, ServerRoute } from '@angular/ssr';
import { readProjectList } from './project-list.server';
import { ALL_SEGMENT, FAVORITES_SEGMENT, PHOTO_SEGMENT, projectSlug } from './constant/project-url';
import { looseImages } from './constant/constants';

/** GitHub Pages only serves files, so every year, project and photo page is prerendered at build time. */
export const serverRoutes: ServerRoute[] = [
  {
    // Each photo's own page, so a shared link previews that photo
    path: `:year/:project/${PHOTO_SEGMENT}/:name`,
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return readProjectList().flatMap(group => group.projects.flatMap(project =>
        project.images.map(image => ({ year: group.year, project: projectSlug(project.name), name: image.name }))));
    },
  },
  {
    path: `:year/${PHOTO_SEGMENT}/:name`,
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return readProjectList().flatMap(group => looseImages(group).map(image => ({ year: group.year, name: image.name })));
    },
  },
  {
    path: ':year/:project',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return readProjectList().flatMap(group =>
        group.projects.map(project => ({ year: group.year, project: projectSlug(project.name) })),
      );
    },
  },
  {
    path: ':year',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return [...readProjectList().map(group => ({ year: group.year })), { year: ALL_SEGMENT }, { year: FAVORITES_SEGMENT }];
    },
  },
  { path: '**', renderMode: RenderMode.Prerender },
];
