import { TestBed } from '@angular/core/testing';
import { ProjectListComponent } from './project-list.component';
import { FavoritesService } from '../../services/favorites.service';
import { PhotoPlace, Project, ProjectsByYear } from '../../type/project.type';

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

  it('should offer sharing only once there is a favorite', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelector('.share-button')).toBeNull();

    let shared = false;
    fixture.componentInstance.favoritesShare.subscribe(() => (shared = true));
    fixture.componentRef.setInput('favoriteCount', 1);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.share-button') as HTMLElement).click();

    expect(shared).toBe(true);

    fixture.componentRef.setInput('shareCopied', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.share-button').textContent.trim()).toEqual('Copied');
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
      fixture.componentRef.setInput('favoriteProjects', [{ year: '2024', projects: [withPhotos[1].projects[0]] }]);
      fixture.componentRef.setInput('favoriteCount', 1);
      fixture.detectChanges();

      const favorite = fixture.nativeElement.querySelector('.favorites-group .sub-list-item');
      expect(thumbs(favorite)?.getAttribute('src')).toEqual('https://example.com/a-150x200.jpg');
    });
  });

  describe('photos in no project', () => {
    const photo = (name: string, after?: string) =>
      ({ name, desc: '', url: `https://example.com/${name}.jpg`, ...(after ? { after } : {}) });
    const year: ProjectsByYear = {
      year: '2025',
      projects: [{ name: 'Owl', images: [] }],
      images: [photo('a'), photo('b'), photo('c', 'Owl')],
    };

    function render() {
      const fixture = TestBed.createComponent(ProjectListComponent);
      fixture.componentRef.setInput('projectsByYear', [year]);
      fixture.detectChanges();
      return fixture;
    }

    it('should show runs of them as thumbnail rows around the projects, with no text', () => {
      const list: HTMLElement = render().nativeElement.querySelector('.list-group-item:not(.favorites-group) .sub-list');
      const rows = Array.from(list.children).map(row => row.classList.contains('photo-row')
        ? Array.from(row.querySelectorAll('img')).map(img => img.getAttribute('src'))
        : row.querySelector('.project-name')?.textContent?.trim());

      expect(rows).toEqual([
        ['https://example.com/a-150x200.jpg', 'https://example.com/b-150x200.jpg'],
        'Owl',
        ['https://example.com/c-150x200.jpg'],
      ]);
      expect(list.querySelector('.photo-row')?.textContent?.trim()).toEqual('');
    });

    it('should offer All for a year of one project once it has loose photos', () => {
      expect(render().nativeElement.querySelector('.list-group-item:not(.favorites-group) .all-button')).not.toBeNull();
    });

    it('should favorite a photo from the heart on its tile without opening it', () => {
      localStorage.removeItem('favorite-projects');
      const fixture = render();
      let selected: unknown;
      fixture.componentInstance.photoSelect.subscribe(event => (selected = event));
      const heart = () => fixture.nativeElement.querySelector('.photo-tile .tile-heart') as HTMLButtonElement;

      expect(heart().getAttribute('aria-pressed')).toEqual('false');
      heart().click();
      fixture.detectChanges();

      expect(TestBed.inject(FavoritesService).isPhotoFavorite('2025', 'a')).toBe(true);
      expect([heart().getAttribute('aria-pressed'), heart().classList.contains('favorited'), selected]).toEqual(['true', true, undefined]);
      heart().click();
      localStorage.removeItem('favorite-projects');
    });

    it('should emit the photo and its year when one is clicked', () => {
      const fixture = render();
      let selected: { year: string; image: string } | undefined;
      fixture.componentInstance.photoSelect.subscribe(event => (selected = event));

      (fixture.nativeElement.querySelectorAll('.photo-button')[2] as HTMLElement).click();

      expect(selected).toEqual({ year: '2025', image: 'c' });
    });
  });

  describe('favorited photos', () => {
    const stamp = { name: 'stamp', desc: '', url: 'https://example.com/stamp.jpg', after: 'Bench' };
    const leg = { name: 'leg', desc: 'Leg', url: 'https://example.com/bench/leg.jpg' };
    const photos: PhotoPlace[] = [
      { year: '2024', project: 'Bench', path: '/2024/bench/photo/leg', image: leg },
      { year: '2024', project: null, path: '/2024/photo/stamp', image: stamp },
    ];

    function render(count = 3, favoriteProjects: ProjectsByYear[] = [{ year: '2024', projects: [bench] }], favoritePhotos = photos) {
      const fixture = TestBed.createComponent(ProjectListComponent);
      fixture.componentRef.setInput('projectsByYear', projectsByYear);
      fixture.componentRef.setInput('favoriteProjects', favoriteProjects);
      fixture.componentRef.setInput('favoritePhotos', favoritePhotos);
      fixture.componentRef.setInput('favoriteCount', count);
      fixture.detectChanges();
      return fixture;
    }

    it('should split projects and photos under their own headings', () => {
      const group: HTMLElement = render().nativeElement.querySelector('.favorites-group');

      expect(Array.from(group.querySelectorAll('.favorites-kind')).map(kind => kind.textContent?.trim())).toEqual(['Projects', 'Photos']);
      expect(Array.from(group.querySelectorAll('.favorites-year')).map(year => year.textContent?.trim())).toEqual(['2024', '2024']);
      expect(group.querySelector('.sub-list-item .project-name')?.textContent?.trim()).toEqual('Bench');
      expect(Array.from(group.querySelectorAll('.photo-row .photo-thumb')).map(img => img.getAttribute('src')))
        .toEqual(['https://example.com/bench/leg-150x200.jpg', 'https://example.com/stamp-150x200.jpg']);
      expect(group.querySelector('.favorites-empty')).toBeNull();
    });

    it('should leave out a heading with nothing under it', () => {
      const group: HTMLElement = render(2, []).nativeElement.querySelector('.favorites-group');

      expect(Array.from(group.querySelectorAll('.favorites-kind')).map(kind => kind.textContent?.trim())).toEqual(['Photos']);
      expect(group.querySelector('.sub-list-item')).toBeNull();
    });

    it('should count a photo toward the All button', () => {
      expect(render(2).nativeElement.querySelector('.favorites-group .all-button:not(.share-button)')).not.toBeNull();
      expect(render(1).nativeElement.querySelector('.favorites-group .all-button:not(.share-button)')).toBeNull();
    });

    it('should open a loose photo in its year and a project photo in its project', () => {
      const fixture = render();
      const selected: unknown[] = [];
      fixture.componentInstance.photoSelect.subscribe(event => selected.push(event));
      const buttons = Array.from(fixture.nativeElement.querySelectorAll('.favorites-group .photo-button')) as HTMLElement[];

      buttons.forEach(button => button.click());

      expect(selected).toEqual([{ year: '2024', image: 'leg', project: 'Bench' }, { year: '2024', image: 'stamp' }]);
    });

    it('should name which kind each heart favorites', () => {
      const group: HTMLElement = render().nativeElement.querySelector('.favorites-group');
      const labels = Array.from(group.querySelectorAll('.heart-button, .tile-heart')).map(heart => heart.getAttribute('aria-label'));

      expect(labels).toEqual([
        'Add the project Bench to favorites',
        'Add the photo Leg, from Bench to favorites',
        'Add the photo Photo from 2024 to favorites',
      ]);
      expect(group.querySelector('.photo-button')?.getAttribute('aria-label')).toEqual('Open Leg, from Bench');
    });

    it('should toggle a project photo from its tile heart', () => {
      const fixture = render();
      const heart = fixture.nativeElement.querySelector('.favorites-group .tile-heart') as HTMLButtonElement;

      heart.click();
      fixture.detectChanges();

      expect(TestBed.inject(FavoritesService).isPhotoFavorite('2024', 'leg', 'Bench')).toBe(true);
      expect(TestBed.inject(FavoritesService).isFavorite('2024', bench)).toBe(false);
      localStorage.removeItem('favorite-projects');
    });
  });
});
