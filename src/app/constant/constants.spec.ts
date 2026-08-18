import { countProjects, filterImagesBySearch, filterProjectsBySearch, splitSearchTerms } from './constants';
import { Image, ProjectsByYear } from '../type/project.type';

const projectsByYear: ProjectsByYear[] = [
  {
    year: '2023',
    projects: [
      { name: 'Walnut Bench', desc: 'Built for the back porch', images: [] },
      { name: 'Cutting Board', desc: 'Maple and cherry', images: [] },
    ],
  },
  {
    year: '2024',
    projects: [
      { name: 'Oak Bench', desc: undefined, images: [] },
    ],
  },
];

describe('filterProjectsBySearch', () => {
  it('should return everything for an empty search', () => {
    expect(filterProjectsBySearch(projectsByYear, '')).toBe(projectsByYear);
    expect(filterProjectsBySearch(projectsByYear, '   ')).toBe(projectsByYear);
  });

  it('should match on project name across years', () => {
    const result = filterProjectsBySearch(projectsByYear, 'bench');

    expect(countProjects(result)).toEqual(2);
    expect(result.map(group => group.year)).toEqual(['2023', '2024']);
  });

  it('should match on description', () => {
    const result = filterProjectsBySearch(projectsByYear, 'maple');

    expect(countProjects(result)).toEqual(1);
    expect(result[0].projects[0].name).toEqual('Cutting Board');
  });

  it('should match every term, including the year', () => {
    const result = filterProjectsBySearch(projectsByYear, '2024 bench');

    expect(countProjects(result)).toEqual(1);
    expect(result[0].year).toEqual('2024');
  });

  it('should drop years with no matches', () => {
    expect(filterProjectsBySearch(projectsByYear, 'birdhouse')).toEqual([]);
  });

  it('should ignore case', () => {
    expect(countProjects(filterProjectsBySearch(projectsByYear, 'WALNUT'))).toEqual(1);
  });
});

describe('filterImagesBySearch', () => {
  const images: Image[] = [
    { name: '20230101_1200', desc: '(2023 - Walnut Bench) - glue up', url: 'a.jpg' },
    { name: '20240202_1300', desc: '', url: 'b.jpg' },
  ];

  it('should return everything for an empty search', () => {
    expect(filterImagesBySearch(images, '')).toBe(images);
  });

  it('should match on description', () => {
    expect(filterImagesBySearch(images, 'glue')).toEqual([images[0]]);
  });

  it('should match on name', () => {
    expect(filterImagesBySearch(images, '20240202')).toEqual([images[1]]);
  });

  it('should return nothing when no image matches', () => {
    expect(filterImagesBySearch(images, 'lathe')).toEqual([]);
  });
});

describe('splitSearchTerms', () => {
  it('should lowercase and drop empty terms', () => {
    expect(splitSearchTerms('  Walnut   BENCH ')).toEqual(['walnut', 'bench']);
  });
});
