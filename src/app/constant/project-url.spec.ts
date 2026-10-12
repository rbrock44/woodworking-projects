import { ALL } from './constants';
import { legacyProjectPath, parseProjectPath, projectPath, projectSlug } from './project-url';

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
  });

  it('should parse paths back, ignoring query, hash and trailing slash', () => {
    expect(parseProjectPath('/2024/baby-rattles?image=x')).toEqual({ year: '2024', slug: 'baby-rattles' });
    expect(parseProjectPath('/2024/')).toEqual({ year: '2024', slug: null });
    expect(parseProjectPath('/all#top')).toEqual({ year: ALL, slug: null });
  });

  it('should not parse home or paths that are not a year', () => {
    expect(parseProjectPath('')).toBeNull();
    expect(parseProjectPath('/')).toBeNull();
    expect(parseProjectPath('/benches')).toBeNull();
    expect(parseProjectPath('/2024/a/b')).toBeNull();
    expect(parseProjectPath('/all/x')).toBeNull();
  });

  it('should map old year and project params to paths', () => {
    expect(legacyProjectPath('2012', 'Walnut Jewelry Box')).toEqual('/2012/walnut-jewelry-box');
    expect(legacyProjectPath('2012', '')).toEqual('/2012');
    expect(legacyProjectPath('2012', null)).toEqual('/2012');
    expect(legacyProjectPath('All', 'All')).toEqual('/all');
    expect(legacyProjectPath('All', '')).toEqual('/all');
  });
});
