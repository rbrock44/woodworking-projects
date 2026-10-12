import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Projects, ProjectsByYear } from './type/project.type';

let projectsByYear: ProjectsByYear[] | undefined;

/** Reads public/project-list.json (written by the images repo's generate-json script) at build time. */
export function readProjectList(): ProjectsByYear[] {
  if (!projectsByYear) {
    const projects: Projects = JSON.parse(
      readFileSync(join(process.cwd(), 'public/project-list.json'), 'utf8'),
    );
    projectsByYear = projects.projectsByYear;
  }

  return projectsByYear;
}
