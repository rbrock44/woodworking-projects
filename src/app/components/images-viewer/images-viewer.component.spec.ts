import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { Location } from '@angular/common';
import { ImagesViewerComponent } from './images-viewer.component';
import { Image, PhotoPlace } from '../../type/project.type';
import { FavoritesService } from '../../services/favorites.service';

function makeImages(count: number): Image[] {
  const images: Image[] = [];
  for (let i = 0; i < count; i++) {
    images.push({ name: `img-${i}`, desc: `Photo ${i}`, url: `https://example.com/${i}.jpg` });
  }
  return images;
}

function touch(type: string, x: number, fingers: number): Event {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { touches: Array(fingers).fill({}), changedTouches: [{ clientX: x, clientY: 0 }] });
  return event;
}

function swipe(element: HTMLElement, fromX: number, toX: number): void {
  element.dispatchEvent(touch('touchstart', fromX, 1));
  element.dispatchEvent(touch('touchend', toX, 0));
}

describe('ImagesViewerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagesViewerComponent],
      providers: [provideRouter([]), provideLocationMocks()],
    }).compileComponents();
  });

  describe('scrolling back to the grid photo', () => {
    // The scroll waits 100ms for the grid to render; a spec (or a view) can end first, and jsdom has no scrollIntoView
    it('should scroll to the photo when there is a way to, and do nothing otherwise', async () => {
      const fixture = TestBed.createComponent(ImagesViewerComponent);
      fixture.componentRef.setInput('images', makeImages(3));
      fixture.detectChanges();
      const scrolled: Element[] = [];
      const element = fixture.nativeElement as HTMLElement;
      const second = element.querySelectorAll('.image-item img')[1] as HTMLElement & { scrollIntoView?: unknown };
      second.scrollIntoView = function (this: Element) { scrolled.push(this); };

      fixture.componentInstance.checkForIndex('1');
      fixture.componentInstance.checkForIndex('0');
      await new Promise(resolve => setTimeout(resolve, 150));

      // Only the last request counts, and the first photo has no scrollIntoView here: nothing thrown, nothing scrolled
      expect(scrolled).toEqual([]);
      fixture.componentInstance.checkForIndex('1');
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(scrolled).toEqual([second]);
    });

    it('should drop a pending scroll when the viewer is destroyed', async () => {
      const fixture = TestBed.createComponent(ImagesViewerComponent);
      fixture.componentRef.setInput('images', makeImages(2));
      fixture.detectChanges();
      const scrolled: Element[] = [];
      Element.prototype.scrollIntoView = function (this: Element) { scrolled.push(this); };

      try {
        fixture.componentInstance.checkForIndex('0');
        fixture.destroy();
        await new Promise(resolve => setTimeout(resolve, 150));
        expect(scrolled).toEqual([]);
      } finally {
        delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
      }
    });
  });

  it('should report the photo the single view shows, and null for the grid', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    const images = makeImages(2);
    const shown: (string | null)[] = [];
    fixture.componentInstance.shownImageChange.subscribe(image => shown.push(image?.name ?? null));
    fixture.componentRef.setInput('images', images);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    (element.querySelector('.image-item img') as HTMLElement).click();
    fixture.detectChanges();
    (element.querySelector('.right-arrow') as HTMLElement).click();
    fixture.detectChanges();

    expect(shown).toEqual([null, 'img-0', 'img-1']);
  });

  it('should show a fresh picture in the single view when the photo or its size changes', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', makeImages(2));
    fixture.detectChanges();
    fixture.componentInstance.onGridImageClick(0);
    fixture.detectChanges();
    const singleSrc = () => (fixture.nativeElement.querySelector('.image-plus-desc img') as HTMLImageElement).getAttribute('src');
    const first = singleSrc();

    (fixture.nativeElement.querySelector('.right-arrow') as HTMLElement).click();
    fixture.detectChanges();
    expect(singleSrc()).not.toEqual(first);

    fixture.componentInstance.singleImage.set({ width: 123, height: 164 });
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('.image-plus-desc img') as HTMLImageElement).getAttribute('width')).toEqual('123');
  });

  describe('favoriting photos', () => {
    beforeEach(() => localStorage.removeItem('favorite-projects'));
    afterEach(() => localStorage.removeItem('favorite-projects'));

    // img-0 is a loose photo of 2023, img-1 belongs to the project 'Lidded Box'
    function places(images: Image[]): Map<string, PhotoPlace> {
      return new Map([
        [images[0].url, { year: '2023', project: null, path: '/2023/photo/img-0', image: images[0] }],
        [images[1].url, { year: '2023', project: 'Lidded Box', path: '/2023/lidded-box/photo/img-1', image: images[1] }],
      ]);
    }

    function render(projectName = '') {
      const fixture = TestBed.createComponent(ImagesViewerComponent);
      const images = makeImages(2);
      fixture.componentRef.setInput('images', images);
      fixture.componentRef.setInput('projectName', projectName);
      fixture.componentRef.setInput('photoPlaces', places(images));
      fixture.detectChanges();
      return fixture;
    }

    function openFirst() {
      const fixture = render();
      (fixture.nativeElement.querySelector('.image-item img') as HTMLElement).click();
      fixture.detectChanges();
      return fixture;
    }

    it('should toggle the shown photo from a heart in the single view', () => {
      const fixture = openFirst();
      const heart = () => fixture.nativeElement.querySelector('.single-view .heart-button') as HTMLButtonElement;

      expect(heart().getAttribute('aria-pressed')).toEqual('false');
      heart().click();
      fixture.detectChanges();

      expect(TestBed.inject(FavoritesService).isPhotoFavorite('2023', 'img-0')).toBe(true);
      expect(heart().classList).toContain('favorited');
      expect(heart().getAttribute('aria-label')).toEqual('Remove this photo from favorites');

      heart().click();
      fixture.detectChanges();
      expect(TestBed.inject(FavoritesService).isPhotoFavorite('2023', 'img-0')).toBe(false);
    });

    it('should put a heart on every grid tile, toggling without opening', () => {
      const fixture = render();
      const cells = Array.from(fixture.nativeElement.querySelectorAll('.image-cell')) as HTMLElement[];

      expect(cells.map(cell => !!cell.querySelector('.tile-heart'))).toEqual([true, true]);
      (cells[0].querySelector('.tile-heart') as HTMLButtonElement).click();
      (cells[1].querySelector('.tile-heart') as HTMLButtonElement).click();
      fixture.detectChanges();

      const favorites = TestBed.inject(FavoritesService);
      expect(favorites.isPhotoFavorite('2023', 'img-0')).toBe(true);
      expect(favorites.isPhotoFavorite('2023', 'img-1', 'Lidded Box')).toBe(true);
      expect(favorites.isFavorite('2023', { name: 'Lidded Box', images: [] })).toBe(false);
      expect(fixture.nativeElement.querySelector('.single-view')).toBeNull();
      expect(cells[1].querySelector('.tile-heart')?.getAttribute('aria-label'))
        .toEqual(`Remove the photo Photo 1, from Lidded Box from favorites`);
    });

    it('should give a project photo its own heart in the single view', () => {
      const fixture = openFirst();

      (fixture.nativeElement.querySelector('.right-arrow') as HTMLElement).click();
      fixture.detectChanges();
      (fixture.nativeElement.querySelector('.single-view .heart-button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(TestBed.inject(FavoritesService).hasPath('/2023/lidded-box/photo/img-1')).toBe(true);
      expect(TestBed.inject(FavoritesService).isPhotoFavorite('2023', 'img-0')).toBe(false);
    });

    it('should show no heart for a photo the gallery does not list', () => {
      const fixture = TestBed.createComponent(ImagesViewerComponent);
      fixture.componentRef.setInput('images', makeImages(1));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.tile-heart')).toBeNull();
    });
  });

  describe('where a photo is from', () => {
    function render(projectName: string, sections?: Map<Image, string>) {
      const fixture = TestBed.createComponent(ImagesViewerComponent);
      // As a mixed view shows them: the description carries the source, the place keeps the project list's own photo
      const own = [
        { name: 'a', desc: 'Glue up', url: 'https://example.com/a.jpg' },
        { name: 'b', desc: '', url: 'https://example.com/b.jpg' },
      ];
      const shown = [{ ...own[0], desc: '(2026 - Oak Bench) - Glue up' }, { ...own[1], desc: '(2026)' }];
      fixture.componentRef.setInput('images', shown);
      fixture.componentRef.setInput('projectName', projectName);
      fixture.componentRef.setInput('photoPlaces', new Map([
        [own[0].url, { year: '2026', project: 'Oak Bench', path: '/2026/oak-bench/photo/a', image: own[0] }],
        [own[1].url, { year: '2026', project: null, path: '/2026/photo/b', image: own[1] }],
      ]));
      if (sections) {
        fixture.componentRef.setInput('sections', new Map([[shown[0], 'Projects'], [shown[1], 'Photos']]));
      }
      fixture.detectChanges();
      return fixture;
    }

    it('should name the project under a tile in a mixed view, and nothing for a loose photo', () => {
      const element = render('').nativeElement as HTMLElement;
      const cells = Array.from(element.querySelectorAll('.image-cell'));

      expect(cells.map(cell => cell.querySelector('.image-source')?.textContent?.trim() ?? null)).toEqual(['Oak Bench', null]);
      expect(cells[0].querySelector('img')?.getAttribute('alt')).toEqual('Glue up, from Oak Bench');
    });

    it('should not repeat the project on its own page', () => {
      const element = render('Oak Bench').nativeElement as HTMLElement;

      expect(element.querySelector('.image-source')).toBeNull();
    });

    it('should split the grid under section headings, keeping one index across them', () => {
      const fixture = render('', new Map());
      const element = fixture.nativeElement as HTMLElement;

      expect(Array.from(element.querySelectorAll('.grid-section')).map(heading => heading.textContent?.trim())).toEqual(['Projects', 'Photos']);
      (element.querySelectorAll('.image-item img')[1] as HTMLElement).click();
      fixture.detectChanges();
      expect(element.querySelector('.progress-info')?.textContent?.trim()).toEqual('2/2');
    });
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render a keyboard-accessible thumbnail per image', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', makeImages(3));
    fixture.detectChanges();

    const thumbs: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.image-item img'));
    expect(thumbs.length).toEqual(3);
    thumbs.forEach(thumb => {
      expect(thumb.getAttribute('tabindex')).toEqual('0');
      expect(thumb.getAttribute('role')).toEqual('button');
    });
  });

  it('should open the single view on the clicked thumbnail', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', makeImages(3));
    fixture.detectChanges();

    const thumbs: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.image-item img'));
    thumbs[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.singleView()).toBe(true);
    expect(fixture.componentInstance.currentIndex()).toEqual(1);

    const singleImg = fixture.nativeElement.querySelector('.image-plus-desc img') as HTMLImageElement;
    expect(singleImg.alt).toEqual('Photo 1');
  });

  it('should name undescribed photos by project and date in their alt text', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', [{ name: '20241013_1750', desc: '', url: 'https://example.com/a.jpg' }]);
    fixture.componentRef.setInput('projectName', 'Baby Rattles');
    fixture.detectChanges();

    const thumb = fixture.nativeElement.querySelector('.image-item img') as HTMLImageElement;
    expect(thumb.alt).toEqual('Baby Rattles, photo from October 13, 2024');
    expect(thumb.getAttribute('aria-label')).toEqual('Enlarge photo 1: Baby Rattles, photo from October 13, 2024');
  });

  it('should open the single view when Enter is pressed on a thumbnail', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', makeImages(3));
    fixture.detectChanges();

    const thumbs: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.image-item img'));
    thumbs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.singleView()).toBe(true);
    expect(fixture.componentInstance.currentIndex()).toEqual(2);
  });

  it('should show the mid-size copy in the single view and the original full screen', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', makeImages(3));
    fixture.detectChanges();
    fixture.componentInstance.onGridImageClick(1);
    fixture.detectChanges();

    const singleImg = fixture.nativeElement.querySelector('.image-plus-desc img') as HTMLImageElement;
    expect(singleImg.getAttribute('src')).toEqual('https://example.com/1-900x1200.webp');

    singleImg.click();
    fixture.detectChanges();

    const overlayImg = fixture.nativeElement.querySelector('app-image-overlay img') as HTMLImageElement;
    expect(overlayImg.getAttribute('src')).toEqual('https://example.com/1.jpg');
  });

  it('should return to the grid from a Back button', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', makeImages(3));
    fixture.detectChanges();
    fixture.componentInstance.onGridImageClick(1);
    fixture.detectChanges();

    const back = fixture.nativeElement.querySelector('.back-button') as HTMLElement;
    expect(back.tagName).toEqual('BUTTON');

    back.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.singleView()).toBe(false);
  });

  it('should navigate between images with the arrow buttons', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', makeImages(3));
    fixture.detectChanges();
    fixture.componentInstance.onGridImageClick(0);
    fixture.detectChanges();

    const left = fixture.nativeElement.querySelector('.left-arrow') as HTMLButtonElement;
    const right = fixture.nativeElement.querySelector('.right-arrow') as HTMLButtonElement;

    expect(left.disabled).toBe(true);

    right.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.currentIndex()).toEqual(1);
    expect(left.disabled).toBe(false);

    right.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.currentIndex()).toEqual(2);
    expect(right.disabled).toBe(true);

    left.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.currentIndex()).toEqual(1);
  });

  it('should open the lightbox overlay when the single-view image is activated', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', makeImages(2));
    fixture.detectChanges();
    fixture.componentInstance.onGridImageClick(0);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-image-overlay')).toBeNull();

    const singleImg = fixture.nativeElement.querySelector('.image-plus-desc img') as HTMLImageElement;
    singleImg.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isOverlayOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-image-overlay')).not.toBeNull();
  });

  it('should close the overlay and restore focus to the originating image', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', makeImages(2));
    fixture.detectChanges();
    fixture.componentInstance.onGridImageClick(0);
    fixture.detectChanges();

    const singleImg = fixture.nativeElement.querySelector('.image-plus-desc img') as HTMLImageElement;
    singleImg.focus();
    singleImg.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isOverlayOpen()).toBe(true);

    fixture.componentInstance.closeOverlay();
    fixture.detectChanges();

    expect(fixture.componentInstance.isOverlayOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-image-overlay')).toBeNull();
    expect(document.activeElement).toBe(singleImg);
  });

  it('should emit enlarged state changes as the overlay opens and closes', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', makeImages(1));

    const states: boolean[] = [];
    fixture.componentInstance.enlargedChange.subscribe((state: boolean) => states.push(state));

    fixture.detectChanges();
    fixture.componentInstance.onGridImageClick(0);
    fixture.componentInstance.onSingleImageClick();
    fixture.componentInstance.closeOverlay();

    expect(states).toEqual([false, false, true, false]);
  });

  it('should close the overlay, then return to the grid, as the browser goes back', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    const viewer = fixture.componentInstance;
    const location = TestBed.inject(Location);
    fixture.componentRef.setInput('images', makeImages(2));
    fixture.detectChanges();

    viewer.onGridImageClick(1);
    viewer.onSingleImageClick();
    expect(viewer.isOverlayOpen()).toBe(true);

    location.back();
    expect(viewer.isOverlayOpen()).toBe(false);
    expect(viewer.singleView()).toBe(true);
    expect(viewer.currentIndex()).toBe(1);

    location.back();
    expect(viewer.singleView()).toBe(false);
  });

  it('should step history back when the overlay is closed from its close button', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    const viewer = fixture.componentInstance;
    const location = TestBed.inject(Location);
    fixture.componentRef.setInput('images', makeImages(1));
    fixture.detectChanges();

    viewer.onGridImageClick(0);
    viewer.onSingleImageClick();
    viewer.closeOverlay();

    expect(location.getState()).not.toEqual({ overlay: true });
    expect(location.path()).toContain('image=img-0');
  });

  it('should step through photos when the single view is swiped', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', makeImages(3));
    fixture.detectChanges();
    fixture.componentInstance.onGridImageClick(1);
    fixture.detectChanges();

    const area = fixture.nativeElement.querySelector('.image-plus-desc') as HTMLElement;
    swipe(area, 300, 100);
    expect(fixture.componentInstance.currentIndex()).toEqual(2);

    swipe(area, 100, 300);
    swipe(area, 100, 300);
    expect(fixture.componentInstance.currentIndex()).toEqual(0);
  });

  it('should preload the photos either side once a photo is opened', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', makeImages(4));
    fixture.detectChanges();
    const preloaded = () => [...fixture.componentInstance['preloaded'].keys()];

    expect(preloaded()).toEqual([]);

    fixture.componentInstance.onGridImageClick(1);
    fixture.detectChanges();
    expect(preloaded()).toEqual(['https://example.com/2-900x1200.webp', 'https://example.com/0-900x1200.webp']);

    fixture.componentInstance.goToNext();
    fixture.detectChanges();
    expect(preloaded()).toContain('https://example.com/3-900x1200.webp');
  });

  it('should preload the full size neighbors while the overlay is open', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentRef.setInput('images', makeImages(3));
    fixture.detectChanges();
    fixture.componentInstance.onGridImageClick(1);
    fixture.componentInstance.onSingleImageClick();
    fixture.detectChanges();

    const preloaded = [...fixture.componentInstance['preloaded'].keys()];
    expect(preloaded).toContain('https://example.com/2.jpg');
    expect(preloaded).toContain('https://example.com/0.jpg');
  });
});
