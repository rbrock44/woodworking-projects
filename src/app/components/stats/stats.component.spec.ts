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
    const tiles: string[] = Array.from(render().nativeElement.querySelectorAll('.tile dd'), (dd: HTMLElement) => dd.textContent!.trim());
    expect(tiles).toEqual(['3', '4', '2023 – 2024', 'October']);
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
