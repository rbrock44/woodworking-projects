import { ALL, FAVORITES } from './constants';
import { adjacentLinks, existingFavoritePaths, favoritePhotoPath, favoriteProjectsAtPaths, homeSequence, isPhotoFavoritePath, isStatsPath, SequenceLink, legacyProjectPath, parseProjectPath, parseSharedFavorites, pathsInGroups, photoPath, photoPlaces, photosAtPaths, projectPath, projectPhotoPath, projectsAtPaths, projectSlug, sharedFavoritesParam } from './project-url';
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

  it('should key a loose photo by year and name under a segment no project path has', () => {
    expect(photoPath('2023', 'stamp')).toEqual('/2023/photo/stamp');
    expect(parseProjectPath(photoPath('2023', 'stamp'))).toBeNull();
  });

  it('should share loose photos readably and read them back', () => {
    const param = sharedFavoritesParam(['/2024/walnut-bench', '/2023/photo/stamp']);

    expect(param).toEqual('2024/walnut-bench,2023/photo/stamp');
    expect(parseSharedFavorites(param)).toEqual(['/2024/walnut-bench', '/2023/photo/stamp']);
  });

  it('should keep a photo name with commas and spaces whole through a share link', () => {
    const param = sharedFavoritesParam(['/2023/photo/a, b+c', '/2023/lidded-box']);
    const decoded = new URLSearchParams(`shared=${param}`).get('shared');

    expect(parseSharedFavorites(decoded)).toEqual(['/2023/photo/a, b+c', '/2023/lidded-box']);
  });

  it('should drop shared photos with a broken name or no year', () => {
    expect(parseSharedFavorites('2023/photo/%E0%A4%A,abc/photo/x,2023/photo/ok')).toEqual(['/2023/photo/ok']);
  });

  it('should group loose photos at a set of paths with the projects of their year', () => {
    const box = { name: 'Lidded Box', images: [] };
    const stamp = { name: 'stamp', desc: '', url: '/images/2023/stamp.jpg' };
    const other = { name: 'other', desc: '', url: '/images/2023/other.jpg' };
    const groups: ProjectsByYear[] = [
      { year: ALL, projects: [{ name: ALL, images: [] }] },
      { year: '2024', projects: [], images: [{ name: 'stamp', desc: '', url: '/images/2024/stamp.jpg' }] },
      { year: '2023', projects: [box], images: [stamp, other] },
    ];
    const found = projectsAtPaths(groups, new Set(['/2023/photo/stamp', '/2023/photo/gone']));

    expect(found).toEqual([{ year: '2023', projects: [], images: [stamp] }]);
    expect(pathsInGroups(found)).toEqual(['/2023/photo/stamp']);
    expect(pathsInGroups(projectsAtPaths(groups, new Set(['/2023/photo/other', '/2023/lidded-box']))))
      .toEqual(['/2023/lidded-box', '/2023/photo/other']);
  });

  it('should key a loose photo by year and name under a segment no project path has', () => {
    expect(photoPath('2023', 'stamp')).toEqual('/2023/photo/stamp');
    expect(parseProjectPath(photoPath('2023', 'stamp'))).toBeNull();
  });

  it('should share loose photos readably and read them back', () => {
    const param = sharedFavoritesParam(['/2024/walnut-bench', '/2023/photo/stamp']);

    expect(param).toEqual('2024/walnut-bench,2023/photo/stamp');
    expect(parseSharedFavorites(param)).toEqual(['/2024/walnut-bench', '/2023/photo/stamp']);
  });

  it('should keep a photo name with commas and spaces whole through a share link', () => {
    const param = sharedFavoritesParam(['/2023/photo/a, b+c', '/2023/lidded-box']);
    const decoded = new URLSearchParams(`shared=${param}`).get('shared');

    expect(parseSharedFavorites(decoded)).toEqual(['/2023/photo/a, b+c', '/2023/lidded-box']);
  });

  it('should drop shared photos with a broken name or no year', () => {
    expect(parseSharedFavorites('2023/photo/%E0%A4%A,abc/photo/x,2023/photo/ok')).toEqual(['/2023/photo/ok']);
  });

  it('should group loose photos at a set of paths with the projects of their year', () => {
    const box = { name: 'Lidded Box', images: [] };
    const stamp = { name: 'stamp', desc: '', url: '/images/2023/stamp.jpg' };
    const other = { name: 'other', desc: '', url: '/images/2023/other.jpg' };
    const groups: ProjectsByYear[] = [
      { year: ALL, projects: [{ name: ALL, images: [] }] },
      { year: '2024', projects: [], images: [{ name: 'stamp', desc: '', url: '/images/2024/stamp.jpg' }] },
      { year: '2023', projects: [box], images: [stamp, other] },
    ];
    const found = projectsAtPaths(groups, new Set(['/2023/photo/stamp', '/2023/photo/gone']));

    expect(found).toEqual([{ year: '2023', projects: [], images: [stamp] }]);
    expect(pathsInGroups(found)).toEqual(['/2023/photo/stamp']);
    expect(pathsInGroups(projectsAtPaths(groups, new Set(['/2023/photo/other', '/2023/lidded-box']))))
      .toEqual(['/2023/lidded-box', '/2023/photo/other']);
  });

  describe('photos inside a project', () => {
    const lid = { name: 'lid', desc: '', url: '/images/2023/lidded-box/lid.jpg' };
    const base = { name: 'base', desc: '', url: '/images/2023/lidded-box/base.jpg' };
    const box = { name: 'Lidded Box', images: [lid, base] };
    const stamp = { name: 'stamp', desc: '', url: '/images/2023/stamp.jpg' };
    const groups: ProjectsByYear[] = [
      { year: ALL, projects: [{ name: ALL, images: [] }] },
      { year: '2023', projects: [box], images: [stamp] },
    ];

    it('should key a project photo under its project, apart from the project and loose photos', () => {
      expect(projectPhotoPath('2023', 'Lidded Box', 'lid')).toEqual('/2023/lidded-box/photo/lid');
      expect(favoritePhotoPath('2023', 'lid', 'Lidded Box')).toEqual('/2023/lidded-box/photo/lid');
      expect(favoritePhotoPath('2023', 'stamp')).toEqual('/2023/photo/stamp');
      expect(parseProjectPath('/2023/lidded-box/photo/lid')).toBeNull();
      expect(isPhotoFavoritePath('/2023/lidded-box/photo/lid')).toBe(true);
      expect(isPhotoFavoritePath('/2023/photo/stamp')).toBe(true);
      expect(isPhotoFavoritePath('/2023/lidded-box')).toBe(false);
      expect(isPhotoFavoritePath('/2023/photo')).toBe(false);
    });

    it('should resolve project photo paths to the right photo', () => {
      const found = photosAtPaths(groups, new Set(['/2023/lidded-box/photo/base', '/2023/photo/lid', '/2023/other/photo/lid']));

      expect(found).toEqual([{ year: '2023', project: 'Lidded Box', path: '/2023/lidded-box/photo/base', image: base }]);
      expect(photoPlaces(groups).get(lid.url)).toEqual({ year: '2023', project: 'Lidded Box', path: '/2023/lidded-box/photo/lid', image: lid });
      expect(photoPlaces(groups).get(stamp.url)).toEqual({ year: '2023', project: null, path: '/2023/photo/stamp', image: stamp });
    });

    it('should keep old project and loose photo paths meaning what they did', () => {
      const old = new Set(['/2023/lidded-box', '/2023/photo/stamp']);

      expect(favoriteProjectsAtPaths(groups, old)).toEqual([{ year: '2023', projects: [box] }]);
      expect(photosAtPaths(groups, old).map(place => place.image)).toEqual([stamp]);
      expect(projectsAtPaths(groups, old)).toEqual([{ year: '2023', projects: [box], images: [stamp] }]);
      expect(parseSharedFavorites('2023/lidded-box,2023/photo/stamp')).toEqual(['/2023/lidded-box', '/2023/photo/stamp']);
    });

    it('should read a project slugged photo as a project, and its photos as its own', () => {
      const photoProject = { name: 'Photo', images: [lid] };
      const odd: ProjectsByYear[] = [{ year: '2023', projects: [photoProject], images: [] }];

      expect(parseSharedFavorites('2023/photo,2023/photo/photo/lid')).toEqual(['/2023/photo', '/2023/photo/photo/lid']);
      expect(photosAtPaths(odd, new Set(['/2023/photo/photo/lid']))[0].project).toEqual('Photo');
    });

    it('should round trip project photos through a share link, odd names included', () => {
      const paths = ['/2023/lidded-box', '/2023/photo/a, b', '/2023/lidded-box/photo/c,d+e f'];
      const param = sharedFavoritesParam(paths);
      const decoded = new URLSearchParams(`shared=${param}`).get('shared');

      expect(param.split(',')).toHaveLength(3);
      expect(parseSharedFavorites(decoded)).toEqual(paths);
      expect(parseSharedFavorites('2023/lidded-box/photo/%E0%A4%A,2023/lidded-box/photo/ok')).toEqual(['/2023/lidded-box/photo/ok']);
    });

    it('should list only existing favorites, projects then photos', () => {
      expect(existingFavoritePaths(groups, new Set(['/2023/photo/stamp', '/2023/lidded-box/photo/lid', '/2023/lidded-box', '/2023/gone/photo/x'])))
        .toEqual(['/2023/lidded-box', '/2023/photo/stamp', '/2023/lidded-box/photo/lid']); // stamp has no after, so it leads its year
    });
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

describe('adjacentLinks', () => {
  const project = (name: string) => ({ name, images: [] });
  const photo = (name: string, after?: string) => ({ name, desc: '', url: `/images/${name}.jpg`, after });
  const label = (link: SequenceLink | null) =>
    link === null ? null : link.kind === 'project' ? link.project.name : `photo ${link.image.name}`;

  describe('with projects only', () => {
    // Newest year first with All on top, the way prepareProjects leaves them
    const projectsByYear: ProjectsByYear[] = [
      { year: ALL, projects: [project(ALL)] },
      { year: '2024', projects: [project('Pergola')] },
      { year: '2023', projects: [project('Oak Bench'), project('Walnut Box')] },
    ];
    const names = (year: string, name: string) => {
      const adjacent = adjacentLinks(projectsByYear, year, { project: name });
      return adjacent && [label(adjacent.previous), label(adjacent.next)];
    };

    it('should step within a year in listed order', () => {
      expect(names('2023', 'Oak Bench')).toEqual(['Pergola', 'Walnut Box']);
    });

    it('should step across years, newest first like the home page', () => {
      expect(names('2024', 'Pergola')).toEqual([null, 'Oak Bench']);
      expect(names('2023', 'Walnut Box')).toEqual(['Oak Bench', null]);
    });

    it('should carry the year of the neighbor', () => {
      expect(adjacentLinks(projectsByYear, '2023', { project: 'Oak Bench' })?.previous?.year).toEqual('2024');
    });

    it('should be null for the synthetic All group or an unknown project', () => {
      expect(adjacentLinks(projectsByYear, ALL, { project: ALL })).toBeNull();
      expect(adjacentLinks(projectsByYear, '2023', { project: 'Pergola' })).toBeNull();
    });
  });

  describe('with loose photos', () => {
    // Listed oldest first on purpose: the order comes from the years, not the input
    const projectsByYear: ProjectsByYear[] = [
      { year: '2024', projects: [project('Studies')] },
      { year: '2025', projects: [], images: [photo('p5a'), photo('p5b')] },
      {
        year: '2026',
        projects: [project('Bench'), project('Box')],
        images: [photo('first'), photo('afterBench1', 'Bench'), photo('afterBench2', 'Bench'), photo('gone', 'Missing')],
      },
    ];

    it('should list projects and photos the way the home page does, a photo per step', () => {
      expect(homeSequence(projectsByYear).map(link => `${link.year} ${label(link)}`)).toEqual([
        '2026 photo first',
        '2026 Bench',
        '2026 photo afterBench1',
        '2026 photo afterBench2',
        '2026 Box',
        '2026 photo gone',
        '2025 photo p5a',
        '2025 photo p5b',
        '2024 Studies',
      ]);
    });

    it('should step from a project onto a photo', () => {
      const adjacent = adjacentLinks(projectsByYear, '2026', { project: 'Bench' });
      expect([label(adjacent!.previous), label(adjacent!.next)]).toEqual(['photo first', 'photo afterBench1']);
    });

    it('should step from a photo onto a project, across years too', () => {
      const between = adjacentLinks(projectsByYear, '2026', { photo: 'afterBench2' });
      expect([label(between!.previous), label(between!.next)]).toEqual(['photo afterBench1', 'Box']);

      const lastOfYear = adjacentLinks(projectsByYear, '2025', { photo: 'p5b' });
      expect(label(lastOfYear!.next)).toEqual('Studies');
      expect(lastOfYear!.next!.year).toEqual('2024');
    });

    it('should have no previous for the first step and no next for the last', () => {
      expect(adjacentLinks(projectsByYear, '2026', { photo: 'first' })?.previous).toBeNull();
      expect(adjacentLinks(projectsByYear, '2024', { project: 'Studies' })?.next).toBeNull();
    });

    it('should not mix up a photo and a project of the same name, or a photo of another year', () => {
      expect(adjacentLinks(projectsByYear, '2026', { photo: 'Bench' })).toBeNull();
      expect(adjacentLinks(projectsByYear, '2024', { photo: 'p5a' })).toBeNull();
    });
  });
});
