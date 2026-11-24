import { TestBed } from '@angular/core/testing';
import { ProjectNavComponent } from './project-nav.component';
import { AdjacentLinks } from '../../constant/project-url';

describe('ProjectNavComponent', () => {
  const owl = { name: 'owl-1', desc: 'Carved owl', url: '/images/2024/owl-1.jpg' };
  const bench = { name: 'Oak Bench', images: [] };
  const adjacent: AdjacentLinks = {
    previous: { kind: 'project', project: bench, year: '2023' },
    next: { kind: 'photo', image: owl, year: '2024' },
  };

  function render() {
    const fixture = TestBed.createComponent(ProjectNavComponent);
    fixture.componentRef.setInput('adjacent', adjacent);
    fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('a')] as HTMLAnchorElement[];
    return { fixture, links };
  }

  it('should link to a project and to a photo page, saying which kind each is', () => {
    const { links } = render();

    expect(links.map(link => link.getAttribute('href'))).toEqual(['/2023/oak-bench', '/2024/photo/owl-1']);
    expect(links.map(link => link.getAttribute('aria-label'))).toEqual([
      'Previous project: Oak Bench, 2023',
      'Next photo: Carved owl, 2024',
    ]);
  });

  it('should ask for the swap on a plain click and leave a modified click to the browser', () => {
    const { fixture, links } = render();
    const projects: unknown[] = [];
    const photos: unknown[] = [];
    fixture.componentInstance.projectSelect.subscribe(event => projects.push(event));
    fixture.componentInstance.photoSelect.subscribe(event => photos.push(event));

    links[1].dispatchEvent(new MouseEvent('click', { button: 0, ctrlKey: true, cancelable: true }));
    expect(photos).toEqual([]);

    links[0].dispatchEvent(new MouseEvent('click', { button: 0, cancelable: true }));
    links[1].dispatchEvent(new MouseEvent('click', { button: 0, cancelable: true }));
    expect(projects).toEqual([{ project: bench, year: '2023' }]);
    expect(photos).toEqual([{ year: '2024', image: 'owl-1' }]);
  });
});
