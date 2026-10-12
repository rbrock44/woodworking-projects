import { makeStateKey } from "@angular/core";
import { addAllProjectsByYear, PROJECT_LIST } from "../constant/constants";
import { Project, Projects, ProjectsByYear } from "../type/project.type";

/** The project list, handed from the prerendered page to the browser so it renders without a fetch. */
export const PROJECTS_STATE_KEY = makeStateKey<ProjectsByYear[]>('projects');

export async function getProjects(): Promise<Projects> {
  try {
    const response = await fetch(PROJECT_LIST);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const projects = (await response.json()) as Projects;
    return prepareProjects(projects.projectsByYear);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return addAllYearAndProject(await getLocalProjects(error));
  }
}

/** Newest year first, with the synthetic 'All' group on top. Leaves the given list untouched. */
export function prepareProjects(projectsByYear: ProjectsByYear[]): Projects {
  const sorted = [...projectsByYear].sort((a, b) => Number(b.year) - Number(a.year));
  return addAllProjectsByYear({ projectsByYear: sorted });
}

async function addAllYearAndProject(projectsData: Projects): Promise<Projects> {
  return addAllProjectsByYear(projectsData);
}

function getLocalProjects(error: any): Promise<Projects> {
  const project1: Project = {
    name: 'benches',
    images:
      [
        { name: "20231013_1750", desc: "", url: "https://raw.githubusercontent.com/rbrock44/woodworking-projects-images/master/2024/baby-rattles/20241013_1750.jpg" },
      ],
  };

  return Promise.resolve({
    projectsByYear: [
      {
        year: '2023',
        projects: [
          project1
        ]
      },
      {
        year: `${error}`,
        projects: []
      }
    ]
  });
}

