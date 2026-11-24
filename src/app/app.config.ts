import { ApplicationConfig } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';

import { routes } from './app.routes';
import { SeoTitleStrategy } from './services/seo.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // Not blocking: hydration needs the first render to happen at once, and AppComponent reads the URL itself
    provideRouter(routes),
    { provide: TitleStrategy, useClass: SeoTitleStrategy },
    // The browser takes over the prerendered markup instead of drawing it again; clicks made before it's ready
    // are replayed once it is
    provideClientHydration(withEventReplay()),
  ]
};
