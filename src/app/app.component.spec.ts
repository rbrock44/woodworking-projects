import { TestBed } from '@angular/core/testing';
import { TransferState } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Title } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { PROJECTS_STATE_KEY } from './services/project.service';
import { FavoritesService } from './services/favorites.service';
import { ALL, FAVORITES } from './constant/constants';
import { ProjectsByYear } from './type/project.type';

const FAVORITES_STORAGE_KEY = 'favorite-projects';

function image(name: string) {
  return { name, desc: '', url: `https://example.com/${name}.jpg` };
}

const PROJECTS: ProjectsByYear[] = [
  {
    year: '2023',
    projects: [
      { name: 'Oak Bench', desc: 'A bench', images: [image('20230301_1200'), image('20230415_1200')] },
      { name: 'Walnut Box', images: [image('20230601_1200')] },
    ],
  },
  {
    year: '2024',
    projects: [
      { name: 'Baby Rattles', images: [image('20241013_1750')] },
    ],
  },
];

// The component's first render waits on promises, not template events, so let them run.
const settle = () => new Promise(resolve => setTimeout(resolve));

describe('AppComponent', () => {
  let storedFavorites: string | null;

  beforeEach(async () => {
    storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
    localStorage.removeItem(FAVORITES_STORAGE_KEY);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes), provideLocationMocks()],
    }).compileComponents();

    // As the prerendered page hands it over, so nothing is fetched
    TestBed.inject(TransferState).set(PROJECTS_STATE_KEY, PROJECTS);
  });

  afterEach(() => {
    if (storedFavorites === null) {
      localStorage.removeItem(FAVORITES_STORAGE_KEY);
    } else {
      localStorage.setItem(FAVORITES_STORAGE_KEY, storedFavorites);
    }
  });

  async function openAt(url: string) {
    await TestBed.inject(Router).navigateByUrl(url);

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();

    return { fixture, app: fixture.componentInstance, location: TestBed.inject(Location) };
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'woodworking-projects' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('woodworking-projects');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Woodworking Projects');
  });

  describe('opening a URL', () => {
    it('should show the project list at home, newest year first after All', async () => {
      const { app, fixture } = await openAt('/');

      expect(app.dataLoaded()).toBeTrue();
      expect(app.selectedProject()).toBeUndefined();
      expect(app.data().projectsByYear.map(group => group.year)).toEqual([ALL, '2024', '2023']);
      expect(app.totalProjectCount()).toEqual(3);
      expect(fixture.nativeElement.querySelector('app-project-list')).not.toBeNull();
      expect(TestBed.inject(Title).getTitle()).toEqual('Woodworking Projects');
    });

    it('should select the project a project path names', async () => {
      const { app, fixture } = await openAt('/2023/oak-bench');

      expect(app.selectedProject()?.name).toEqual('Oak Bench');
      expect(app.selectedYear()).toEqual('2023');
      expect(app.selectedMonthRange()).toEqual('March – April');
      expect(fixture.nativeElement.querySelector('app-images-viewer')).not.toBeNull();
      expect(TestBed.inject(Title).getTitle()).toEqual('Oak Bench (2023) - Woodworking Projects');
    });

    it('should show every image of a year for a year path', async () => {
      const { app } = await openAt('/2023');

      expect(app.selectedYear()).toEqual('2023');
      expect(app.selectedProject()?.desc).toEqual('All of 2023');
      expect(app.selectedProject()?.images.map(image => image.name))
        .toEqual(['20230301_1200', '20230415_1200', '20230601_1200']);
    });

    it('should show every image of every year for /all', async () => {
      const { app } = await openAt('/all');

      expect(app.selectedYear()).toEqual(ALL);
      expect(app.selectedProject()?.images.length).toEqual(4);
    });

    it('should fall back to home for a project that does not exist', async () => {
      const { app, location } = await openAt('/2023/missing');

      expect(app.selectedProject()).toBeUndefined();
      expect(location.isCurrentPathEqualTo('/')).toBeTrue();
    });

    it('should fall back to home for a year that does not exist', async () => {
      const { app, location } = await openAt('/1999');

      expect(app.selectedProject()).toBeUndefined();
      expect(location.isCurrentPathEqualTo('/')).toBeTrue();
    });

    it('should fall back to home for /favorites with no favorites', async () => {
      const { app, location } = await openAt('/favorites');

      expect(app.selectedProject()).toBeUndefined();
      expect(location.isCurrentPathEqualTo('/')).toBeTrue();
    });

    it('should show the favorited images for /favorites', async () => {
      TestBed.inject(FavoritesService).toggle('2024', PROJECTS[1].projects[0]);

      const { app } = await openAt('/favorites');

      expect(app.selectedYear()).toEqual(FAVORITES);
      expect(app.selectedProject()?.images.map(image => image.name)).toEqual(['20241013_1750']);
    });

    it('should redirect an old ?year=&project= link to the project path', async () => {
      const { app, location } = await openAt('/?year=2023&project=Walnut%20Box');

      expect(app.selectedProject()?.name).toEqual('Walnut Box');
      expect(location.path()).toEqual('/2023/walnut-box');
    });
  });

  describe('history', () => {
    it('should slot home in under a deep link so back lands on home', async () => {
      const { app, location } = await openAt('/2023/oak-bench');

      location.back();

      expect(app.selectedProject()).toBeUndefined();
      expect(TestBed.inject(Title).getTitle()).toEqual('Woodworking Projects');
    });

    it('should show the previous project on back and the next on forward', async () => {
      const { app, location } = await openAt('/');

      app.projectClick(PROJECTS[0].projects[0], '2023');
      app.projectClick(PROJECTS[1].projects[0], '2024');
      expect(location.path()).toEqual('/2024/baby-rattles');

      location.back();
      expect(app.selectedProject()?.name).toEqual('Oak Bench');

      location.forward();
      expect(app.selectedProject()?.name).toEqual('Baby Rattles');
    });

    it('should leave the project selected when only its image params change', async () => {
      const { app, location } = await openAt('/2023/oak-bench');
      const project = app.selectedProject();

      location.go('/2023/oak-bench?image=20230415_1200&index=1');
      location.back();

      expect(app.selectedProject()).toBe(project);
    });
  });

  describe('navigating', () => {
    it('should move the URL and title when a project is clicked', async () => {
      const { app, location } = await openAt('/');

      app.projectClick(PROJECTS[0].projects[1], '2023');

      expect(app.selectedProject()?.name).toEqual('Walnut Box');
      expect(location.path()).toEqual('/2023/walnut-box');
      expect(TestBed.inject(Title).getTitle()).toEqual('Walnut Box (2023) - Woodworking Projects');
    });

    it('should limit a year to the projects matching the search', async () => {
      const { app, location } = await openAt('/');

      app.searchChange('walnut');
      app.allProjectsByYear('2023');

      expect(location.path()).toEqual('/2023');
      expect(app.selectedProject()?.images.map(image => image.name)).toEqual(['20230601_1200']);
    });

    it('should clear the selection and go to / on home', async () => {
      const { app, location } = await openAt('/2023/oak-bench');
      app.isImageEnlarged.set(true);

      app.homeClick();

      expect(app.selectedProject()).toBeUndefined();
      expect(app.selectedYear()).toEqual('');
      expect(app.isImageEnlarged()).toBeFalse();
      expect(location.isCurrentPathEqualTo('/')).toBeTrue();
    });

    it('should ignore a jump to the project already shown', async () => {
      const { app, location } = await openAt('/2023/oak-bench');
      const goSpy = spyOn(location, 'go').and.callThrough();

      app.jumpToProject(app.selectedProject()!, '2023');

      expect(goSpy).not.toHaveBeenCalled();
    });

    it('should close an enlarged image when jumping to another project', async () => {
      const { app } = await openAt('/2023/oak-bench');
      app.isImageEnlarged.set(true);

      app.jumpToProject(PROJECTS[1].projects[0], '2024');

      expect(app.isImageEnlarged()).toBeFalse();
      expect(app.selectedProject()?.name).toEqual('Baby Rattles');
    });
  });
});
