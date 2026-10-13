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

  describe('thumbnails', () => {
    const photo = (name: string) => ({ name, desc: '', url: `https://example.com/${name}.jpg` });
    const withPhotos: ProjectsByYear[] = [
      { year: 'All', projects: [{ name: 'All', images: [photo('a'), photo('b')] }] },
      {
        year: '2024',
        projects: [
          { name: 'Urn', cover: 'a', images: [photo('a'), photo('b')] },
          { name: 'Lathe', images: [photo('c'), photo('d')] },
          { name: 'Sketch', images: [] },
        ],
      },
    ];

    function render() {
      const fixture = TestBed.createComponent(ProjectListComponent);
      fixture.componentRef.setInput('projectsByYear', withPhotos);
      fixture.detectChanges();
      return fixture;
    }

    const thumbs = (row: Element) => row.querySelector<HTMLImageElement>('.project-thumb');

    it("should show each project's cover thumbnail, else its last photo's", () => {
      const rows = Array.from(render().nativeElement.querySelectorAll('.list-group-item:not(.favorites-group) .sub-list-item'));

      expect(rows.map(row => thumbs(row as Element)?.getAttribute('src') ?? null)).toEqual([
        null, // the All shortcut is not a project
        'https://example.com/a-150x200.jpg',
        'https://example.com/d-150x200.jpg',
        null, // no photos
      ]);
    });

    it('should load thumbnails lazily and keep them out of screen readers, since the name sits beside them', () => {
      const thumb = render().nativeElement.querySelector('.project-thumb') as HTMLImageElement;

      expect(thumb.getAttribute('loading')).toEqual('lazy');
      expect(thumb.getAttribute('alt')).toEqual('');
    });

    it('should show thumbnails on favorites too', () => {
      TestBed.inject(FavoritesService).toggle('2024', withPhotos[1].projects[0]);
      const fixture = TestBed.createComponent(ProjectListComponent);
      fixture.componentRef.setInput('projectsByYear', withPhotos);
      fixture.componentRef.setInput('favoritesByYear', [{ year: '2024', projects: [withPhotos[1].projects[0]] }]);
      fixture.componentRef.setInput('favoriteCount', 1);
      fixture.detectChanges();

      const favorite = fixture.nativeElement.querySelector('.favorites-group .sub-list-item');
      expect(thumbs(favorite)?.getAttribute('src')).toEqual('https://example.com/a-150x200.jpg');
    });
  });
});
