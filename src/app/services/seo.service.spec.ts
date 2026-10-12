import { describePage } from './seo.service';
import { ProjectsByYear } from '../type/project.type';

describe('describePage', () => {
  const projectsByYear: ProjectsByYear[] = [
    { year: 'All', projects: [{ name: 'All', images: [] }] },
    { year: '2024', projects: [{ name: 'Walnut Bench', desc: 'Live edge seat', images: [] }, { name: 'Baby Rattles', desc: ' ', images: [] }] },
  ];

  it('should describe a project from its description', () => {
    expect(describePage(projectsByYear, '/2024/walnut-bench')).toEqual({
      path: '/2024/walnut-bench',
      title: 'Walnut Bench (2024) - Woodworking Projects',
      description: 'Live edge seat',
    });
  });

  it('should fall back to a generated description when a project has none', () => {
    expect(describePage(projectsByYear, '/2024/baby-rattles')?.description)
      .toEqual('Baby Rattles, a woodworking project from 2024.');
  });

  it('should describe a year by listing its projects', () => {
    const page = describePage(projectsByYear, '/2024');
    expect(page?.title).toEqual('2024 Projects - Woodworking Projects');
    expect(page?.description).toEqual('Woodworking projects built in 2024: Walnut Bench, Baby Rattles.');
  });

  it('should describe the all page', () => {
    expect(describePage(projectsByYear, '/all')?.path).toEqual('/all');
  });

  it('should keep the favorites page out of search results', () => {
    const page = describePage(projectsByYear, '/favorites');
    expect(page?.path).toEqual('/favorites');
    expect(page?.noindex).toBeTrue();
  });

  it('should return null for home and for years or projects that do not exist', () => {
    expect(describePage(projectsByYear, '/')).toBeNull();
    expect(describePage(projectsByYear, '/1999')).toBeNull();
    expect(describePage(projectsByYear, '/2024/nope')).toBeNull();
  });
});
