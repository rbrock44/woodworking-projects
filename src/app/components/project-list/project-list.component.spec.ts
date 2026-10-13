import { TestBed } from '@angular/core/testing';
import { ProjectListComponent } from './project-list.component';
import { FavoritesService } from '../../services/favorites.service';
import { Project, ProjectsByYear } from '../../type/project.type';

const bench: Project = { name: 'Bench', images: [] };
const stool: Project = { name: 'Stool', images: [] };
const projectsByYear: ProjectsByYear[] = [
  { year: '2024', projects: [bench, stool] },
  { year: '2023', projects: [{ name: 'Box', images: [] }] },
];

describe('ProjectListComponent', () => {
  beforeEach(async () => {
    localStorage.removeItem('favorite-projects');
    await TestBed.configureTestingModule({
      imports: [ProjectListComponent],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(ProjectListComponent);
    fixture.componentRef.setInput('projectsByYear', projectsByYear);
    fixture.detectChanges();
    return fixture;
  }

  it('should list every year and project, with All only for years of more than one', () => {
    const element: HTMLElement = create().nativeElement;
    const years = Array.from(element.querySelectorAll('.year-text')).map(year => year.textContent?.trim());

    expect(years).toEqual(['Favorites', '2024', '2023']);
    expect(element.querySelectorAll('.list-group-item:not(.favorites-group) .sub-list-item').length).toEqual(3);
    expect(element.querySelectorAll('.list-group-item:not(.favorites-group) .all-button').length).toEqual(1);
  });

  it('should emit the project and its year when a row is clicked', () => {
    const fixture = create();
    let selected: { project: Project; year: string } | undefined;
    fixture.componentInstance.projectSelect.subscribe(event => (selected = event));

    (fixture.nativeElement.querySelector('.list-group-item:not(.favorites-group) .sub-list-item') as HTMLElement).click();

    expect(selected).toEqual({ project: bench, year: '2024' });
  });

  it('should emit the year when its All button is clicked', () => {
    const fixture = create();
    let year: string | undefined;
    fixture.componentInstance.yearSelect.subscribe(value => (year = value));

    (fixture.nativeElement.querySelector('.list-group-item:not(.favorites-group) .all-button') as HTMLElement).click();

    expect(year).toEqual('2024');
  });

  it('should toggle a favorite from the heart without opening the project', () => {
    const fixture = create();
    let opened = false;
    fixture.componentInstance.projectSelect.subscribe(() => (opened = true));

    (fixture.nativeElement.querySelector('.list-group-item:not(.favorites-group) .heart-button') as HTMLElement).click();

    expect(opened).toBe(false);
    expect(TestBed.inject(FavoritesService).isFavorite('2024', bench)).toBe(true);
  });

  it('should show the no results message only while searching', () => {
    const fixture = TestBed.createComponent(ProjectListComponent);
    fixture.componentRef.setInput('searchTerm', 'walnut');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.no-results')?.textContent).toContain('walnut');
  });
});
