import { ALL, FAVORITES } from './constants';
import { adjacentProjects, isStatsPath, legacyProjectPath, parseProjectPath, parseSharedFavorites, projectPath, projectsAtPaths, projectSlug, sharedFavoritesParam } from './project-url';
import { ProjectsByYear } from '../type/project.type';

describe('project-url', () => {
  it('should write shared favorites as comma joined paths and read them back', () => {
    const param = sharedFavoritesParam(['/2024/walnut-bench', '/2023/lidded-box']);

    expect(param).toEqual('2024/walnut-bench,2023/lidded-box');
    expect(parseSharedFavorites(param)).toEqual(['/2024/walnut-bench', '/2023/lidded-box']);
  });

  it('should drop shared favorites that are not project paths, and repeats', () => {
    expect(parseSharedFavorites('2024/bench,2024,all,stats,abc/def,2024/bench, 2023/box ,')).toEqual(['/2024/bench', '/2023/box']);
    expect(parseSharedFavorites(null)).toEqual([]);
  });

  it('should group the projects at a set of paths by year', () => {
    const bench = { name: 'Walnut Bench', images: [] };
    const box = { name: 'Lidded Box', images: [] };
    const groups: ProjectsByYear[] = [
      { year: ALL, projects: [{ name: ALL, images: [] }] },
      { year: '2024', projects: [bench] },
      { year: '2023', projects: [box] },
    ];

    expect(projectsAtPaths(groups, new Set(['/2023/lidded-box', '/2022/gone']))).toEqual([{ year: '2023', projects: [box] }]);
  });

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

  it('should recognize the stats path and nothing else', () => {
    expect(isStatsPath('/stats')).toBe(true);
    expect(isStatsPath('/stats/?x=1')).toBe(true);
    expect(isStatsPath('stats')).toBe(true);
    expect(isStatsPath('/')).toBe(false);
    expect(isStatsPath('/stats/x')).toBe(false);
    expect(parseProjectPath('/stats')).toBeNull();
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
    return adjacent && [adjacent.previous?.project.name ?? null, adjacent.next?.project.name ?? null];
  };

  it('should step within a year in listed order', () => {
    expect(names('2023', 'Oak Bench')).toEqual([null, 'Walnut Box']);
  });

  it('should step across years, oldest first', () => {
    expect(names('2023', 'Walnut Box')).toEqual(['Oak Bench', 'Pergola']);
    expect(names('2024', 'Pergola')).toEqual(['Walnut Box', null]);
  });

  it('should carry the year of the neighbor', () => {
    expect(adjacentProjects(projectsByYear, '2023', 'Walnut Box')?.next?.year).toEqual('2024');
  });

  it('should be null for the synthetic All group or an unknown project', () => {
    expect(adjacentProjects(projectsByYear, ALL, ALL)).toBeNull();
    expect(adjacentProjects(projectsByYear, '2023', 'Pergola')).toBeNull();
  });
});
