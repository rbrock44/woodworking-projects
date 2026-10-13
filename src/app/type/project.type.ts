export interface ImageSize {
  width: number;
  height: number;
}

export interface Image {
  name: string;
  desc: string;
  url: string;
}

export interface Project {
  name: string;
  desc?: string | undefined;
  /** Name of the image that represents the project; projectCover falls back to the last photo. */
  cover?: string | undefined;
  images: Image[];
}

export interface ProjectsByYear {
  year: string;
  projects: Project[];
}

export interface Projects {
  projectsByYear: ProjectsByYear[];
}

