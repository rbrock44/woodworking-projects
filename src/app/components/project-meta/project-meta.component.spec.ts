import { TestBed } from '@angular/core/testing';
import { ProjectMetaComponent } from './project-meta.component';

describe('ProjectMetaComponent', () => {
  function render(name: string) {
    const fixture = TestBed.createComponent(ProjectMetaComponent);
    fixture.componentRef.setInput('year', '2024');
    fixture.componentRef.setInput('project', { name, desc: 'A bench', images: [] });
    fixture.componentRef.setInput('monthRange', 'March to April');
    fixture.detectChanges();
    return fixture;
  }

  it('should show a project with its favorite pill, when it was built and its description', () => {
    const fixture = render('Oak Bench');
    const toggles: number[] = [];
    fixture.componentInstance.favoriteToggle.subscribe(() => toggles.push(1));

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Year: 2024');
    expect(text).toContain('Oak Bench');
    expect(text).toContain('Built: March to April');
    expect(text).toContain('Desc: A bench');
    (fixture.nativeElement.querySelector('.project-favorite') as HTMLButtonElement).click();
    expect(toggles).toEqual([1]);
  });

  it('should show only the year and description for a view with no name', () => {
    const fixture = render('');

    expect(fixture.nativeElement.querySelector('.project-favorite')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Built:');
  });
});
