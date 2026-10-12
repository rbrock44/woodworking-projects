import { TestBed } from '@angular/core/testing';
import { FavoritesService } from './favorites.service';
import { ProjectsByYear } from '../type/project.type';

describe('FavoritesService', () => {
  const bench = { name: 'Walnut Bench', images: [] };
  const rattles = { name: 'Baby Rattles', images: [] };
  const box = { name: 'Lidded Box', images: [] };
  const projectsByYear: ProjectsByYear[] = [
    { year: 'All', projects: [{ name: 'All', images: [] }] },
    { year: '2024', projects: [bench, rattles] },
    { year: '2023', projects: [box] },
  ];

  beforeEach(() => {
    localStorage.removeItem('favorite-projects');
    TestBed.resetTestingModule();
  });

  afterEach(() => localStorage.removeItem('favorite-projects'));

  it('should toggle a project on and off', () => {
    const favorites = TestBed.inject(FavoritesService);

    favorites.toggle('2024', bench);
    expect(favorites.isFavorite('2024', bench)).toBeTrue();
    expect(favorites.isFavorite('2024', rattles)).toBeFalse();

    favorites.toggle('2024', bench);
    expect(favorites.isFavorite('2024', bench)).toBeFalse();
  });

  it('should group favorites by year, leaving out years with none and the All group', () => {
    const favorites = TestBed.inject(FavoritesService);
    favorites.toggle('2024', rattles);

    expect(favorites.favoritesByYear(projectsByYear)).toEqual([{ year: '2024', projects: [rattles] }]);
  });

  it('should keep favorites across visits', () => {
    TestBed.inject(FavoritesService).toggle('2023', box);

    TestBed.resetTestingModule();
    expect(TestBed.inject(FavoritesService).isFavorite('2023', box)).toBeTrue();
  });

  it('should start empty when storage holds something unreadable', () => {
    localStorage.setItem('favorite-projects', '{not json');

    expect(TestBed.inject(FavoritesService).favoritesByYear(projectsByYear)).toEqual([]);
  });
});
