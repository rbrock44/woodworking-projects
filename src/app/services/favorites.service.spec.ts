import { TestBed } from '@angular/core/testing';
import { FavoritesService } from './favorites.service';
import { ProjectsByYear } from '../type/project.type';
import { parseSharedFavorites } from '../constant/project-url';
import { URL_PARAM_SHARED } from '../constant/constants';

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
    expect(favorites.isFavorite('2024', bench)).toBe(true);
    expect(favorites.isFavorite('2024', rattles)).toBe(false);

    favorites.toggle('2024', bench);
    expect(favorites.isFavorite('2024', bench)).toBe(false);
  });

  it('should group favorite projects by year, leaving out years with none and the All group', () => {
    const favorites = TestBed.inject(FavoritesService);
    favorites.toggle('2024', rattles);

    expect(favorites.favoriteProjects(projectsByYear)).toEqual([{ year: '2024', projects: [rattles] }]);
  });

  it('should keep favorites across visits', () => {
    TestBed.inject(FavoritesService).toggle('2023', box);

    TestBed.resetTestingModule();
    expect(TestBed.inject(FavoritesService).isFavorite('2023', box)).toBe(true);
  });

  it('should add shared paths alongside the ones already there', () => {
    const favorites = TestBed.inject(FavoritesService);
    favorites.toggle('2024', bench);

    favorites.addAll(['/2023/lidded-box', '/2024/walnut-bench']);

    expect(favorites.favoriteProjects(projectsByYear)).toEqual([
      { year: '2024', projects: [bench] },
      { year: '2023', projects: [box] },
    ]);
    TestBed.resetTestingModule();
    expect(TestBed.inject(FavoritesService).isFavorite('2023', box)).toBe(true);
  });

  it('should build a share link from the favorites that still exist', () => {
    const favorites = TestBed.inject(FavoritesService);
    favorites.addAll(['/2023/lidded-box', '/2024/baby-rattles', '/2022/renamed']);

    expect(favorites.shareUrl('https://example.com', projectsByYear))
      .toEqual('https://example.com/favorites?shared=2024/baby-rattles,2023/lidded-box');
  });

  describe('photos', () => {
    const stamp = { name: 'stamp', desc: 'A stamp', url: '/images/2023/stamp.jpg', after: 'Lidded Box' };
    const odd = { name: 'odd, name+1', desc: '', url: '/images/2023/odd.jpg' };
    const lid = { name: 'lid', desc: 'The lid', url: '/images/2023/lidded-box/lid.jpg' };
    const base = { name: 'base, 2', desc: '', url: '/images/2023/lidded-box/base.jpg' };
    const boxWithPhotos = { name: 'Lidded Box', images: [lid, base] };
    const withPhotos: ProjectsByYear[] = [
      { year: 'All', projects: [{ name: 'All', images: [] }] },
      { year: '2024', projects: [bench, rattles] },
      { year: '2023', projects: [boxWithPhotos], images: [stamp, odd] },
    ];

    it('should toggle a loose photo on and off without touching projects', () => {
      const favorites = TestBed.inject(FavoritesService);

      favorites.togglePhoto('2023', 'stamp');
      expect(favorites.isPhotoFavorite('2023', 'stamp')).toBe(true);
      expect(favorites.isPhotoFavorite('2024', 'stamp')).toBe(false);
      expect(favorites.isFavorite('2023', box)).toBe(false);
      expect(favorites.hasPath('/2023/photo/stamp')).toBe(true);

      favorites.togglePhoto('2023', 'stamp');
      expect(favorites.isPhotoFavorite('2023', 'stamp')).toBe(false);
    });

    it('should favorite a photo inside a project apart from the project itself', () => {
      const favorites = TestBed.inject(FavoritesService);

      favorites.togglePhoto('2023', 'lid', 'Lidded Box');
      expect(favorites.isPhotoFavorite('2023', 'lid', 'Lidded Box')).toBe(true);
      expect(favorites.isPhotoFavorite('2023', 'lid')).toBe(false);
      expect(favorites.isFavorite('2023', boxWithPhotos)).toBe(false);
      expect(favorites.hasPath('/2023/lidded-box/photo/lid')).toBe(true);
      expect(favorites.favoriteProjects(withPhotos)).toEqual([]);
      expect(favorites.favoritePhotos(withPhotos).map(place => place.image)).toEqual([lid]);

      favorites.togglePath('/2023/lidded-box/photo/lid');
      expect(favorites.isPhotoFavorite('2023', 'lid', 'Lidded Box')).toBe(false);
    });

    it('should store photos in the same list as projects', () => {
      const favorites = TestBed.inject(FavoritesService);
      favorites.toggle('2023', box);
      favorites.togglePhoto('2023', 'stamp');
      favorites.togglePhoto('2023', 'lid', 'Lidded Box');

      expect(JSON.parse(localStorage.getItem('favorite-projects')!))
        .toEqual(['/2023/lidded-box', '/2023/photo/stamp', '/2023/lidded-box/photo/lid']);
      TestBed.resetTestingModule();
      expect(TestBed.inject(FavoritesService).isPhotoFavorite('2023', 'stamp')).toBe(true);
      expect(TestBed.inject(FavoritesService).isPhotoFavorite('2023', 'lid', 'Lidded Box')).toBe(true);
    });

    it('should read old project and loose photo data as before', () => {
      localStorage.setItem('favorite-projects', JSON.stringify(['/2024/walnut-bench', '/2023/lidded-box', '/2023/photo/stamp']));
      const favorites = TestBed.inject(FavoritesService);

      expect(favorites.favoriteProjects(withPhotos)).toEqual([
        { year: '2024', projects: [bench] },
        { year: '2023', projects: [boxWithPhotos] },
      ]);
      expect(favorites.favoritePhotos(withPhotos)).toEqual([
        { year: '2023', project: null, path: '/2023/photo/stamp', image: stamp },
      ]);
      // A favorited project doesn't make its photos favorites one by one
      expect(favorites.isPhotoFavorite('2023', 'lid', 'Lidded Box')).toBe(false);
    });

    it('should list favorite photos in home page order, keeping projects apart', () => {
      const favorites = TestBed.inject(FavoritesService);
      favorites.togglePhoto('2023', 'stamp');
      favorites.togglePhoto('2023', 'lid', 'Lidded Box');
      favorites.toggle('2024', bench);

      expect(favorites.favoriteProjects(withPhotos)).toEqual([{ year: '2024', projects: [bench] }]);
      // stamp is placed after Lidded Box, so the box's lid comes first
      expect(favorites.favoritePhotos(withPhotos).map(place => [place.project, place.image.name]))
        .toEqual([['Lidded Box', 'lid'], [null, 'stamp']]);
    });

    it('should leave out a favorited photo that no longer exists', () => {
      const favorites = TestBed.inject(FavoritesService);
      favorites.addAll(['/2023/photo/gone', '/2023/photo/stamp', '/2023/lidded-box/photo/gone']);

      expect(favorites.favoritePhotos(withPhotos).map(place => place.image)).toEqual([stamp]);
      expect(favorites.shareUrl('https://example.com', withPhotos))
        .toEqual('https://example.com/favorites?shared=2023/photo/stamp');
    });

    it('should round trip both kinds through a share link', () => {
      const favorites = TestBed.inject(FavoritesService);
      favorites.toggle('2024', bench);
      favorites.togglePhoto('2023', 'stamp');
      favorites.togglePhoto('2023', odd.name);
      favorites.togglePhoto('2023', base.name, 'Lidded Box');
      const projects = favorites.favoriteProjects(withPhotos);
      const photos = favorites.favoritePhotos(withPhotos);

      const url = new URL(favorites.shareUrl('https://example.com', withPhotos));
      localStorage.removeItem('favorite-projects');
      TestBed.resetTestingModule();
      const other = TestBed.inject(FavoritesService);
      other.addAll(parseSharedFavorites(url.searchParams.get(URL_PARAM_SHARED)));

      expect(other.favoriteProjects(withPhotos)).toEqual(projects);
      expect(other.favoritePhotos(withPhotos)).toEqual(photos);
      expect(other.isPhotoFavorite('2023', odd.name)).toBe(true);
      expect(other.isPhotoFavorite('2023', base.name, 'Lidded Box')).toBe(true);
    });
  });

  it('should start empty when storage holds something unreadable', () => {
    localStorage.setItem('favorite-projects', '{not json');

    expect(TestBed.inject(FavoritesService).favoriteProjects(projectsByYear)).toEqual([]);
  });
});
