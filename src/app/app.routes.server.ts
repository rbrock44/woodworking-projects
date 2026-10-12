import { RenderMode, ServerRoute } from '@angular/ssr';
import { readProjectList } from './project-list.server';
import { ALL_SEGMENT, FAVORITES_SEGMENT, projectSlug } from './constant/project-url';

/** GitHub Pages only serves files, so every year and project page is prerendered at build time. */
export const serverRoutes: ServerRoute[] = [
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
