import { readProjectList } from './project-list.server';

describe('project-list.json', () => {
  it('should name an existing photo in every cover, so a typo never silently falls back', () => {
    const badCovers = readProjectList().flatMap(group => group.projects
      .filter(project => project.cover && !project.images.some(image => image.name === project.cover))
      .map(project => `${group.year} ${project.name}: ${project.cover}`));

    expect(badCovers).toEqual([]);
  });
});
