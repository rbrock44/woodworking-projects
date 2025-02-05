export interface Image {
  name: string;
  desc: string;
  url: string;
}

export interface Project {
  name: string;
  images: Image[];
}

export interface ProjectsByYear {
  year: string;
  projects: Project[];
}

export interface Projects {
  projectsByYear: ProjectsByYear[];
}

