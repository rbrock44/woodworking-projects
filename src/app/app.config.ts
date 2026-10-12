import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy, withEnabledBlockingInitialNavigation } from '@angular/router';

import { routes } from './app.routes';
import { SeoTitleStrategy } from './services/seo.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Blocking, so the first browser render already knows the URL and swaps in for the prerendered page without a flash
    provideRouter(routes, withEnabledBlockingInitialNavigation()),
    { provide: TitleStrategy, useClass: SeoTitleStrategy },
  ]
};
