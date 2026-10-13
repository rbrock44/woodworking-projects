import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { describePage, homePage, SeoService } from './seo.service';
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
    expect(page?.noindex).toBe(true);
  });

  it('should return null for home and for years or projects that do not exist', () => {
    expect(describePage(projectsByYear, '/')).toBeNull();
    expect(describePage(projectsByYear, '/1999')).toBeNull();
    expect(describePage(projectsByYear, '/2024/nope')).toBeNull();
  });

  it('should describe the stats page with the totals', () => {
    expect(describePage(projectsByYear, '/stats')).toEqual({
      path: '/stats',
      title: 'Shop Stats - Woodworking Projects',
      description: '2 woodworking projects and 0 photos, 2024: projects per year, the most photographed and the longest builds.',
    });
  });
});

describe('preview images', () => {
  const photo = (name: string, desc = '') => ({ name, desc, url: `https://example.com/${name}.jpg` });
  // Newest year first with All on top, the way prepareProjects leaves them
  const projectsByYear: ProjectsByYear[] = [
    { year: 'All', projects: [{ name: 'All', images: [photo('20990101_0000')] }] },
    {
      year: '2025',
      projects: [
        { name: 'Urn', cover: '20250505_1630', images: [photo('20250430_1716'), photo('20250505_1630', 'Finished urn'), photo('20250510_1200')] },
        { name: 'Lathe', images: [photo('20250614_1424'), photo('20250702_2342')] },
      ],
    },
    { year: '2024', projects: [{ name: 'Hammer', images: [photo('20240228_2350')] }] },
  ];

  it("should show a project's cover, with its description as alt text", () => {
    expect(describePage(projectsByYear, '/2025/urn')?.image).toEqual({
      url: 'https://example.com/20250505_1630.jpg',
      alt: 'Finished urn',
    });
  });

  it('should fall back to the last photo, named by project and date, with no cover', () => {
    expect(describePage(projectsByYear, '/2025/lathe')?.image).toEqual({
      url: 'https://example.com/20250702_2342.jpg',
      alt: 'Lathe, photo from July 2, 2025',
    });
  });

  it('should show the cover of the latest project in a year', () => {
    expect(describePage(projectsByYear, '/2024')?.image?.url).toEqual('https://example.com/20240228_2350.jpg');
    expect(describePage(projectsByYear, '/2025')?.image?.url).toEqual('https://example.com/20250702_2342.jpg');
  });

  it("should show the newest project's cover on pages covering every project, skipping the All group", () => {
    const newest = 'https://example.com/20250702_2342.jpg';
    expect(homePage(projectsByYear).image?.url).toEqual(newest);
    expect(describePage(projectsByYear, '/all')?.image?.url).toEqual(newest);
    expect(describePage(projectsByYear, '/stats')?.image?.url).toEqual(newest);
    expect(describePage(projectsByYear, '/favorites')?.image?.url).toEqual(newest);
  });

  it('should leave the image out when there are no photos', () => {
    expect(homePage([]).image).toBeUndefined();
    expect(describePage([{ year: '2024', projects: [{ name: 'Bench', images: [] }] }], '/2024/bench')?.image).toBeUndefined();
  });
});

describe('SeoService', () => {
  const content = (selector: string) => TestBed.inject(Meta).getTag(selector)?.content;

  it('should set the image tags and a large card for a page with a photo', () => {
    TestBed.inject(SeoService).update({
      path: '/2025/urn',
      title: 'Urn',
      description: 'An urn',
      image: { url: 'https://example.com/a.jpg', alt: 'Finished urn' },
    });

    expect(content('property="og:image"')).toEqual('https://example.com/a.jpg');
    expect(content('property="og:image:alt"')).toEqual('Finished urn');
    expect(content('name="twitter:image"')).toEqual('https://example.com/a.jpg');
    expect(content('name="twitter:image:alt"')).toEqual('Finished urn');
    expect(content('name="twitter:card"')).toEqual('summary_large_image');
  });

  it("should drop the last page's image and use the plain card for a page with none", () => {
    const seo = TestBed.inject(SeoService);
    seo.update({ path: '/a', title: 'A', description: 'A', image: { url: 'https://example.com/a.jpg', alt: 'A' } });
    seo.update({ path: '/b', title: 'B', description: 'B' });

    expect(content('property="og:image"')).toBeUndefined();
    expect(content('name="twitter:image"')).toBeUndefined();
    expect(content('name="twitter:card"')).toEqual('summary');
  });
});
