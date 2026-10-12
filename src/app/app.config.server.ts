import { provideServerRendering, withRoutes } from '@angular/ssr';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { readProjectList } from './project-list.server';
import { PROJECT_LIST } from './services/seo.service';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: PROJECT_LIST, useFactory: readProjectList },
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
