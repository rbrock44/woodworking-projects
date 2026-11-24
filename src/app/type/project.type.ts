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


/** Where a photo lives: its year, its project (null for a photo in no project) and its favorites key. */
export interface PhotoPlace {
  year: string;
  /** The project's name, or null for a photo that belongs to the year only. */
  project: string | null;
  /** `/<year>/<slug>/photo/<name>` in a project, `/<year>/photo/<name>` in none. */
  path: string;
  /** The photo as the project list has it, before a mixed view relabels its description. */
  image: Image;
}
