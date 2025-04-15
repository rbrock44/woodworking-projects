import { Projects, Project } from "../type/project.type";

export async function getProjects(): Promise<Projects> {
  try {
    const response = await fetch("project-list.json");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const projects = (await response.json()) as Projects;
    projects.projectsByYear.sort((a, b) => Number(b.year) - Number(a.year));
    return addAllCategory(projects);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return addAllCategory(getLocalProjects(error));
  }
}

async function addAllCategory(projectsData: Projects): Promise<Projects> {
  const allProjects = projectsData.projectsByYear.flatMap(entry => entry.projects);

  const allProjectsByYear: ProjectsByYear = {
    year: 'All',
    projects: allProjects,
  };

  const updatedProjects: Projects = {
    projectsByYear: [allProjectsByYear, ...projectsData.projectsByYear],
  };

  return updatedProjects;
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
