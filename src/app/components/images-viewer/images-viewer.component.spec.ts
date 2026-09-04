import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ImagesViewerComponent } from './images-viewer.component';
import { Image } from '../../type/project.type';

function makeImages(count: number): Image[] {
  const images: Image[] = [];
  for (let i = 0; i < count; i++) {
    images.push({ name: `img-${i}`, desc: `Photo ${i}`, url: `https://example.com/${i}.jpg` });
  }
  return images;
}

describe('ImagesViewerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagesViewerComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render a keyboard-accessible thumbnail per image', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentInstance.images = makeImages(3);
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
    fixture.componentInstance.images = makeImages(3);
    fixture.detectChanges();

    const thumbs: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.image-item img'));
    thumbs[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.singleView).toBeTrue();
    expect(fixture.componentInstance.currentIndex).toEqual(1);

    const singleImg = fixture.nativeElement.querySelector('.image-plus-desc img') as HTMLImageElement;
    expect(singleImg.alt).toEqual('Photo 1');
  });

  it('should open the single view when Enter is pressed on a thumbnail', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentInstance.images = makeImages(3);
    fixture.detectChanges();

    const thumbs: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.image-item img'));
    thumbs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.singleView).toBeTrue();
    expect(fixture.componentInstance.currentIndex).toEqual(2);
  });

  it('should navigate between images with the arrow buttons', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentInstance.images = makeImages(3);
    fixture.detectChanges();
    fixture.componentInstance.onGridImageClick(0);
    fixture.detectChanges();

    const left = fixture.nativeElement.querySelector('.left-arrow') as HTMLButtonElement;
    const right = fixture.nativeElement.querySelector('.right-arrow') as HTMLButtonElement;

    expect(left.disabled).toBeTrue();

    right.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.currentIndex).toEqual(1);
    expect(left.disabled).toBeFalse();

    right.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.currentIndex).toEqual(2);
    expect(right.disabled).toBeTrue();

    left.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.currentIndex).toEqual(1);
  });

  it('should open the lightbox overlay when the single-view image is activated', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentInstance.images = makeImages(2);
    fixture.detectChanges();
    fixture.componentInstance.onGridImageClick(0);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-image-overlay')).toBeNull();

    const singleImg = fixture.nativeElement.querySelector('.image-plus-desc img') as HTMLImageElement;
    singleImg.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isOverlayOpen).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-image-overlay')).not.toBeNull();
  });

  it('should close the overlay and restore focus to the originating image', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentInstance.images = makeImages(2);
    fixture.detectChanges();
    fixture.componentInstance.onGridImageClick(0);
    fixture.detectChanges();

    const singleImg = fixture.nativeElement.querySelector('.image-plus-desc img') as HTMLImageElement;
    singleImg.focus();
    singleImg.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isOverlayOpen).toBeTrue();

    fixture.componentInstance.closeOverlay();
    fixture.detectChanges();

    expect(fixture.componentInstance.isOverlayOpen).toBeFalse();
    expect(fixture.nativeElement.querySelector('app-image-overlay')).toBeNull();
    expect(document.activeElement).toBe(singleImg);
  });

  it('should emit enlarged state changes as the overlay opens and closes', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    fixture.componentInstance.images = makeImages(1);

    const states: boolean[] = [];
    fixture.componentInstance.enlargedChange.subscribe((state: boolean) => states.push(state));

    fixture.detectChanges();
    fixture.componentInstance.onGridImageClick(0);
    fixture.componentInstance.onSingleImageClick();
    fixture.componentInstance.closeOverlay();

    expect(states).toEqual([false, false, true, false]);
  });
});
