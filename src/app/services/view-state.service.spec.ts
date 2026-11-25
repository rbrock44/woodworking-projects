import { TestBed } from '@angular/core/testing';
import { ViewStateService } from './view-state.service';
import { GalleryService } from './gallery.service';
import { FavoritesService } from './favorites.service';
import { prepareProjects } from './project.service';
import { ProjectsByYear } from '../type/project.type';
import { FAVORITES } from '../constant/constants';
import { projectPath, STATS_SEGMENT } from '../constant/project-url';

describe('ViewStateService', () => {
  const image = (name: string, desc = '') => ({ name, desc, url: `/images/${name}.jpg` });
  const projects: ProjectsByYear[] = [
    { year: '2024', projects: [{ name: 'Owl Box', images: [image('a')] }], images: [image('loose', 'Fox')] },
    { year: '2023', projects: [{ name: 'Oak Bench', images: [image('b')] }] },
  ];

  beforeEach(() => localStorage.removeItem('favorite-projects'));
  afterEach(() => localStorage.removeItem('favorite-projects'));

  function loaded(): ViewStateService {
    TestBed.inject(GalleryService).load(prepareProjects(projects));
    return TestBed.inject(ViewStateService);
  }

  it('should select a project and name its path', () => {
    const view = loaded();
    const owlBox = projects[0].projects[0];

    view.select(owlBox, '2024');

    expect(view.selectedProject()).toBe(owlBox);
    expect(view.selectedYear()).toBe('2024');
    expect(view.selectedPath()).toBe(projectPath('2024', 'Owl Box'));
    expect(view.adjacent()).not.toBeNull();
  });

  it('should clear back to home and switch to stats', () => {
    const view = loaded();
    view.select(projects[1].projects[0], '2023');
    view.isImageEnlarged.set(true);

    view.selectStats();
    expect(view.selectedProject()).toBeUndefined();
    expect(view.selectedPath()).toBe(`/${STATS_SEGMENT}`);

    view.clear();
    expect(view.showStats()).toBe(false);
    expect(view.isImageEnlarged()).toBe(false);
    expect(view.selectedPath()).toBe('/');
  });

  it('should gather a year\'s All from its projects and loose photos', () => {
    const view = loaded();

    view.selectAllProjectsByYear('2024');

    expect(view.selectedProject()?.name).toBe('');
    expect(view.selectedProject()?.images.length).toBe(2);
  });

  it('should take shared favorites straight away when there are none yet', () => {
    const view = loaded();
    const path = projectPath('2024', 'Owl Box');

    expect(view.openShared([path])).toBe(true);
    expect(TestBed.inject(FavoritesService).hasPath(path)).toBe(true);
    expect(view.selectedYear()).toBe(FAVORITES);
    expect(view.sharedPaths()).toEqual([]);
  });

  it('should ask before merging shared favorites into ones already there', () => {
    const view = loaded();
    TestBed.inject(FavoritesService).toggle('2023', projects[1].projects[0]);
    const shared = projectPath('2024', 'Owl Box');

    expect(view.openShared([shared])).toBe(false);
    expect(view.sharedPaths()).toEqual([shared]);
    expect(view.sharedNewCount()).toBe(1);

    view.addSharedFavorites();
    expect(view.sharedNewCount()).toBe(0);
    expect(view.sharedPaths()).toEqual([]);
  });

  it('should favorite only a named project', () => {
    const view = loaded();
    view.selectAllProjectsByYear('2023');
    view.toggleProjectFavorite();
    expect(view.isProjectFavorite()).toBe(false);

    view.select(projects[1].projects[0], '2023');
    view.toggleProjectFavorite();
    expect(view.isProjectFavorite()).toBe(true);
  });
});
