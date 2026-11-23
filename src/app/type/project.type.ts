export interface ImageSize {
  width: number;
  height: number;
}

export interface Image {
  name: string;
  desc: string;
  url: string;
  /** For a photo in no project: the project it's listed after on the home page. Missing means before every project. */
  after?: string | undefined;
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
  /** Photos that belong to the year but to no project; each one's `after` places it among the projects. */
  images?: Image[] | undefined;
}

export interface Projects {
  projectsByYear: ProjectsByYear[];
}

