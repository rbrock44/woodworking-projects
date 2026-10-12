import { countProjects, filterImagesBySearch, filterProjectsBySearch, projectMonthRange, splitSearchTerms } from './constants';
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

describe('projectMonthRange', () => {
  const photos = (...names: string[]): Image[] => names.map(name => ({ name, desc: '', url: '' }));

  it('should show a single month', () => {
    expect(projectMonthRange(photos('20240305_1200', '20240322_0900'))).toEqual('Mar 2024');
  });

  it('should show a range within one year, whatever order the photos are in', () => {
    expect(projectMonthRange(photos('20240512_1200', '20240305_1200', '20240401_1200'))).toEqual('Mar – May 2024');
  });

  it('should show both years when the range crosses one', () => {
    expect(projectMonthRange(photos('20230715_1200', '20240203_1200'))).toEqual('Jul 2023 – Feb 2024');
  });

  it('should leave the year off when the whole range is in the project year', () => {
    expect(projectMonthRange(photos('20240305_1200'), '2024')).toEqual('Mar');
    expect(projectMonthRange(photos('20240305_1200', '20240512_1200'), '2024')).toEqual('Mar – May');
    expect(projectMonthRange(photos('20240305_1200'), '2023')).toEqual('Mar 2024');
    expect(projectMonthRange(photos('20230715_1200', '20240203_1200'), '2023')).toEqual('Jul 2023 – Feb 2024');
  });

  it('should skip names that are not a date and return null when none are', () => {
    expect(projectMonthRange(photos('cover', '20241399_0000', '20240601_1200'))).toEqual('Jun 2024');
    expect(projectMonthRange(photos('cover'))).toBeNull();
    expect(projectMonthRange([])).toBeNull();
  });
});