import { formatDays, shopStats } from './stats';
import { ProjectsByYear } from '../type/project.type';

function images(...names: string[]) {
  return names.map(name => ({ name, desc: '', url: `https://example.com/${name}.jpg` }));
}

const projectsByYear: ProjectsByYear[] = [
  { year: 'All', projects: [{ name: 'All', images: images('20240101_1200', '20240102_1200') }] },
  {
    year: '2024',
    projects: [
      { name: 'Pergola', images: images('20241001_1200', '20241015_1200', '20241101_1200') },
      { name: 'Hammer', images: images('20241005_1200') },
    ],
  },
  { year: '2023', projects: [{ name: 'Oak Bench', images: images('20230301_1200', '20231001_1200', '20231002_1200') }] },
];

describe('shopStats', () => {
  const stats = shopStats(projectsByYear);

  it('should count projects and photos, skipping the All group', () => {
    expect(stats.projectCount).toEqual(3);
    expect(stats.photoCount).toEqual(7);
  });

  it('should list years oldest first', () => {
    expect(stats.years).toEqual([
      { year: '2023', projects: 1, photos: 3 },
      { year: '2024', projects: 2, photos: 4 },
    ]);
    expect(stats.busiestYear?.year).toEqual('2024');
  });

  it('should find the month with the most photos across years', () => {
    expect(stats.busiestMonth).toEqual('October');
  });

  it('should rank the most photographed projects, older first on a tie', () => {
    expect(stats.mostPhotographed.map(stat => [stat.project.name, stat.year, stat.value])).toEqual([
      ['Oak Bench', '2023', 3],
      ['Pergola', '2024', 3],
      ['Hammer', '2024', 1],
    ]);
  });

  it('should rank builds by days from first to last photo, leaving out single day ones', () => {
    expect(stats.longestBuilds.map(stat => [stat.project.name, stat.value])).toEqual([
      ['Oak Bench', 215],
      ['Pergola', 31],
    ]);
  });

  it('should handle no projects at all', () => {
    const empty = shopStats([]);
    expect(empty.projectCount).toEqual(0);
    expect(empty.busiestYear).toBeNull();
    expect(empty.busiestMonth).toBeNull();
    expect(empty.longestBuilds).toEqual([]);
  });
});

describe('formatDays', () => {
  it('should count days up to two months, then months', () => {
    expect(formatDays(1)).toEqual('1 day');
    expect(formatDays(31)).toEqual('31 days');
    expect(formatDays(59)).toEqual('59 days');
    expect(formatDays(215)).toEqual('7 months');
  });
});
