import { ALL, FAVORITES } from './constants';
import { adjacentProjects, legacyProjectPath, parseProjectPath, projectPath, projectSlug } from './project-url';
import { ProjectsByYear } from '../type/project.type';

describe('project-url', () => {
  it('should slug names to lowercase ascii with hyphens', () => {
    expect(projectSlug('Cookie Slice (Tree)')).toEqual('cookie-slice-tree');
    expect(projectSlug('Box from Log')).toEqual('box-from-log');
    expect(projectSlug('Tables & Chairs')).toEqual('tables-and-chairs');
    expect(projectSlug('Café Sign')).toEqual('cafe-sign');
  });

  it('should build project, year and all paths', () => {
    expect(projectPath('2024', 'Baby Rattles')).toEqual('/2024/baby-rattles');
    expect(projectPath('2024', '')).toEqual('/2024');
    expect(projectPath('2024')).toEqual('/2024');
    expect(projectPath(ALL, 'All')).toEqual('/all');
    expect(projectPath(FAVORITES)).toEqual('/favorites');
  });

  it('should parse paths back, ignoring query, hash and trailing slash', () => {
    expect(parseProjectPath('/2024/baby-rattles?image=x')).toEqual({ year: '2024', slug: 'baby-rattles' });
    expect(parseProjectPath('/2024/')).toEqual({ year: '2024', slug: null });
    expect(parseProjectPath('/all#top')).toEqual({ year: ALL, slug: null });
    expect(parseProjectPath('/favorites/')).toEqual({ year: FAVORITES, slug: null });
  });

  it('should not parse home or paths that are not a year', () => {
    expect(parseProjectPath('')).toBeNull();
    expect(parseProjectPath('/')).toBeNull();
    expect(parseProjectPath('/benches')).toBeNull();
    expect(parseProjectPath('/2024/a/b')).toBeNull();
    expect(parseProjectPath('/all/x')).toBeNull();
    expect(parseProjectPath('/favorites/x')).toBeNull();
  });

  it('should map old year and project params to paths', () => {
    expect(legacyProjectPath('2012', 'Walnut Jewelry Box')).toEqual('/2012/walnut-jewelry-box');
    expect(legacyProjectPath('2012', '')).toEqual('/2012');
    expect(legacyProjectPath('2012', null)).toEqual('/2012');
    expect(legacyProjectPath('All', 'All')).toEqual('/all');
    expect(legacyProjectPath('All', '')).toEqual('/all');
  });
});

describe('adjacentProjects', () => {
  const project = (name: string) => ({ name, images: [] });
  // Newest year first with All on top, the way prepareProjects leaves them
  const projectsByYear: ProjectsByYear[] = [
    { year: ALL, projects: [project(ALL)] },
    { year: '2024', projects: [project('Pergola')] },
    { year: '2023', projects: [project('Oak Bench'), project('Walnut Box')] },
  ];
  const names = (year: string, name: string) => {
    const adjacent = adjacentProjects(projectsByYear, year, name);
    return adjacent && [adjacent.older?.project.name ?? null, adjacent.newer?.project.name ?? null];
  };

  it('should step within a year in listed order', () => {
    expect(names('2023', 'Oak Bench')).toEqual([null, 'Walnut Box']);
  });

  it('should step across years, oldest first', () => {
    expect(names('2023', 'Walnut Box')).toEqual(['Oak Bench', 'Pergola']);
    expect(names('2024', 'Pergola')).toEqual(['Walnut Box', null]);
  });

  it('should carry the year of the neighbor', () => {
    expect(adjacentProjects(projectsByYear, '2023', 'Walnut Box')?.newer?.year).toEqual('2024');
  });

  it('should be null for the synthetic All group or an unknown project', () => {
    expect(adjacentProjects(projectsByYear, ALL, ALL)).toBeNull();
    expect(adjacentProjects(projectsByYear, '2023', 'Pergola')).toBeNull();
  });
});
