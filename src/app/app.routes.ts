import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, Routes } from '@angular/router';
import { ALL_SEGMENT, FAVORITES_SEGMENT, isYearSegment, legacyProjectPath, STATS_SEGMENT } from './constant/project-url';
import { URL_PARAM_PROJECT, URL_PARAM_YEAR } from './constant/constants';

/** Sends old `/?year=<year>&project=<name>` links to the project's own page, keeping other params. */
export const redirectLegacyProject: CanActivateFn = route => {
  const year = route.queryParamMap.get(URL_PARAM_YEAR);
  if (!year) {
    return true;
  }

  const { [URL_PARAM_YEAR]: _, [URL_PARAM_PROJECT]: __, ...queryParams } = route.queryParams;
  const path = legacyProjectPath(year, route.queryParamMap.get(URL_PARAM_PROJECT));
  return inject(Router).createUrlTree([path], { queryParams });
};

const matchesYear: CanMatchFn = (_, segments) =>
  isYearSegment(segments[0]?.path) || segments[0]?.path === ALL_SEGMENT || segments[0]?.path === FAVORITES_SEGMENT;

const matchesProject: CanMatchFn = (_, segments) => isYearSegment(segments[0]?.path);

// AppComponent picks the view from the URL, so these routes only decide which URLs are valid.
export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [redirectLegacyProject], children: [] },
  { path: STATS_SEGMENT, children: [] },
  { path: ':year', canMatch: [matchesYear], children: [] },
  { path: ':year/:project', canMatch: [matchesProject], children: [] },
  { path: '**', redirectTo: '' },
];
