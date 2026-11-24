import { TestBed } from '@angular/core/testing';
import { TransferState } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import axe from 'axe-core';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { PROJECTS_STATE_KEY } from './services/project.service';
import { ProjectsByYear } from './type/project.type';

function image(name: string, desc = '') {
  return { name, desc, url: `https://example.com/${name}.jpg` };
}

// Every kind of thing a view can hold: projects, described and undescribed photos, loose photos
const PROJECTS: ProjectsByYear[] = [
  {
    year: '2024',
    projects: [
      { name: 'Owl Box', desc: 'A box', images: [image('20240301_1200', 'Owl'), image('20240302_1200')] },
    ],
    images: [{ ...image('20241101_0900', 'Fox'), after: 'Owl Box' }],
  },
  { year: '2023', projects: [{ name: 'Oak Bench', images: [image('20230415_1200')] }] },
];

/**
 * axe over each view as the app renders it. jsdom has no layout, so the rules that need one (colour contrast, target
 * size) can't run here; everything structural can: names, roles, labels, landmarks, duplicate ids, list markup.
 */
describe('accessibility', () => {
  const settle = () => new Promise(resolve => setTimeout(resolve));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes), provideLocationMocks()],
    }).compileComponents();
    TestBed.inject(TransferState).set(PROJECTS_STATE_KEY, PROJECTS);
  });

  async function violations(url: string): Promise<string[]> {
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();

    const results = await axe.run(fixture.nativeElement as HTMLElement, {
      rules: { 'color-contrast': { enabled: false }, 'target-size': { enabled: false } },
      resultTypes: ['violations'],
    });
    return results.violations.map(violation =>
      `${violation.id}: ${violation.nodes.map(node => node.target.join(' ')).join(', ')}`);
  }

  for (const [name, url] of [
    ['home', '/'],
    ['a year', '/2024'],
    ['a project', '/2024/owl-box'],
    ["a project photo's page", '/2024/owl-box/photo/20240301_1200'],
    ["a loose photo's page", '/2024/photo/20241101_0900'],
    ['everything', '/all'],
    ['stats', '/stats'],
  ]) {
    it(`should have no violations on ${name}`, async () => {
      expect(await violations(url)).toEqual([]);
    });
  }
});
