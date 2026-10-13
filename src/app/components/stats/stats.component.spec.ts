import { TestBed } from '@angular/core/testing';
import { StatsComponent } from './stats.component';
import { ProjectLink } from '../../constant/project-url';
import { ProjectsByYear } from '../../type/project.type';

function images(...names: string[]) {
  return names.map(name => ({ name, desc: '', url: `https://example.com/${name}.jpg` }));
}

const PROJECTS: ProjectsByYear[] = [
  { year: '2024', projects: [{ name: 'Pergola', images: images('20241001_1200', '20241101_1200') }, { name: 'Hammer', images: images('20241005_1200') }] },
  { year: '2023', projects: [{ name: 'Oak Bench', images: images('20230301_1200') }] },
];

describe('StatsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatsComponent] }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(StatsComponent);
    fixture.componentRef.setInput('projectsByYear', PROJECTS);
    fixture.detectChanges();
    return fixture;
  }

  it('should show the totals', () => {
    const element = render().nativeElement;
    const text = (dd: HTMLElement) => dd.textContent!.replace(/\s+/g, ' ').trim();

    expect(Array.from(element.querySelectorAll('.tile:not(.years-tile) dd'), text)).toEqual(['3', '4', 'October']);
    expect(text(element.querySelector('.years-summary'))).toEqual('1 year 2023 – 2024 · 2 with projects');
  });

  it('should show total years, active years and the range, with a dot per calendar year', () => {
    const fixture = TestBed.createComponent(StatsComponent);
    fixture.componentRef.setInput('projectsByYear', [
      { year: '2026', projects: [{ name: 'Rug Beater', images: [] }] },
      { year: '2012', projects: [{ name: 'Walnut Jewelry Box', images: [] }] },
      { year: '2010', projects: [{ name: 'Pond Bicycle Jump', images: [] }, { name: 'Ramp', images: [] }] },
    ]);
    fixture.detectChanges();
    const text = (selector: string) => fixture.nativeElement.querySelector(selector).textContent.trim();

    expect(fixture.componentInstance.yearCount()).toEqual(16);
    expect(text('.tile-unit')).toEqual('years');
    expect(text('.tile-range')).toEqual('2010 – 2026');
    expect(text('.tile-active')).toEqual('3 with projects');

    const dots: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.year-dot'));
    expect(dots.length).toEqual(17);
    expect(dots.filter(dot => dot.classList.contains('active')).length).toEqual(3);
    expect(dots.map(dot => dot.title).slice(0, 3)).toEqual(['2010: 2 projects', '2011: no projects', '2012: 1 project']);
  });

  it('should draw a bar per year, oldest first, scaled to the busiest year', () => {
    const rows: HTMLElement[] = Array.from(render().nativeElement.querySelectorAll('.bar-row'));

    expect(rows.map(row => row.getAttribute('aria-label'))).toEqual(['2023: 1 project, 1 photo', '2024: 2 projects, 3 photos']);
    expect(rows.map(row => (row.querySelector('.bar') as HTMLElement).style.width)).toEqual(['50%', '100%']);
  });

  it('should link each ranked project to its page', () => {
    const links: HTMLAnchorElement[] = Array.from(render().nativeElement.querySelectorAll('.ranking a'));
    expect(links[0].getAttribute('href')).toEqual('/2024/pergola');
    expect(links[0].textContent).toEqual('Pergola');
  });

  it('should emit the project on a plain click instead of following the link', () => {
    const fixture = render();
    const selected: ProjectLink[] = [];
    fixture.componentInstance.projectSelect.subscribe(link => selected.push(link));

    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    fixture.nativeElement.querySelector('.ranking a').dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(selected.map(link => [link.year, link.project.name])).toEqual([['2024', 'Pergola']]);
  });
});
