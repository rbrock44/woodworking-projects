import { TestBed } from '@angular/core/testing';
import { GalleryService } from './gallery.service';
import { prepareProjects } from './project.service';
import { ProjectsByYear } from '../type/project.type';

describe('GalleryService', () => {
  const image = (name: string, desc = '') => ({ name, desc, url: `/images/${name}.jpg` });
  const projects: ProjectsByYear[] = [
    { year: '2024', projects: [{ name: 'Owl Box', images: [image('a')] }], images: [image('loose', 'Fox')] },
    { year: '2023', projects: [{ name: 'Oak Bench', images: [image('b')] }] },
  ];

  function loaded(): GalleryService {
    const gallery = TestBed.inject(GalleryService);
    gallery.load(prepareProjects(projects));
    return gallery;
  }

  it('should count projects without the synthetic All group and narrow them by the search', () => {
    const gallery = loaded();

    expect(gallery.dataLoaded()).toBe(true);
    expect(gallery.totalProjectCount()).toBe(2);
    gallery.searchTerm.set('oak');
    expect(gallery.matchingProjectCount()).toBe(1);
  });

  it('should place every photo and know each loose photo\'s year', () => {
    const gallery = loaded();

    expect(gallery.placesByUrl().get('/images/a.jpg')?.project).toBe('Owl Box');
    expect(gallery.placesByUrl().get('/images/loose.jpg')?.project).toBeNull();
    expect(gallery.loosePhotoYears().get('/images/loose.jpg')).toBe('2024');
  });

  it('should show the favorites group with none yet, and hide it while a search matches none', () => {
    const gallery = loaded();

    expect(gallery.favoriteCount()).toBe(0);
    expect(gallery.showFavorites()).toBe(true);
    gallery.searchTerm.set('owl');
    expect(gallery.showFavorites()).toBe(false);
  });
});
