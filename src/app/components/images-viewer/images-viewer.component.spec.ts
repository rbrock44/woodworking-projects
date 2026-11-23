import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { Location } from '@angular/common';
import { ImagesViewerComponent } from './images-viewer.component';
import { Image } from '../../type/project.type';
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

  describe('favoriting a photo in no project', () => {
    beforeEach(() => localStorage.removeItem('favorite-projects'));
    afterEach(() => localStorage.removeItem('favorite-projects'));

    function openFirst() {
      const fixture = TestBed.createComponent(ImagesViewerComponent);
      const images = makeImages(2);
      fixture.componentRef.setInput('images', images);
      fixture.componentRef.setInput('loosePhotoYears', new Map([[images[0].url, '2023']]));
      fixture.detectChanges();
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

    it('should put a heart on grid tiles of photos in no project only, toggling without opening', () => {
      const fixture = TestBed.createComponent(ImagesViewerComponent);
      const images = makeImages(2);
      fixture.componentRef.setInput('images', images);
      fixture.componentRef.setInput('loosePhotoYears', new Map([[images[0].url, '2023']]));
      fixture.detectChanges();
      const cells = Array.from(fixture.nativeElement.querySelectorAll('.image-cell')) as HTMLElement[];

      expect(cells.map(cell => !!cell.querySelector('.tile-heart'))).toEqual([true, false]);
      (cells[0].querySelector('.tile-heart') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(TestBed.inject(FavoritesService).isPhotoFavorite('2023', 'img-0')).toBe(true);
      expect(fixture.nativeElement.querySelector('.single-view')).toBeNull();
    });

    it('should show no heart for a photo that belongs to a project', () => {
      const fixture = openFirst();

      (fixture.nativeElement.querySelector('.right-arrow') as HTMLElement).click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.heart-button')).toBeNull();
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
