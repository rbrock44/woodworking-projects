import { Location, NgOptimizedImage } from '@angular/common';
import { SubscriptionLike } from 'rxjs';
import { Component, Output, EventEmitter, OnInit, OnChanges, OnDestroy, HostListener, ChangeDetectionStrategy, SimpleChanges, computed, effect, inject, input, output, signal } from '@angular/core';
import { Image, ImageSize, PhotoPlace } from '../../type/project.type';
import { ImageOverlayComponent } from '../image-overlay/image-overlay.component';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { ActivatedRoute } from '@angular/router';
import { FavoritesService } from '../../services/favorites.service';
import { ownPhotoUrl, parsePhotoPath, viewPathOf } from '../../constant/project-url';
import { adjustImageToScreenSize, createMidsizeImageUrl, createThumbnailImageUrl, CSS_SELECTOR_IMAGES, filterImagesBySearch, IMAGE_SIZE_DEFAULT, imageAltText, neighborImageUrls, scrollPageToTop, SwipeTracker, URL_PARAM_IMAGE, URL_PARAM_INDEX } from '../../constant/constants';

@Component({
    imports: [
    ImageOverlayComponent,
    SearchBarComponent,
    NgOptimizedImage
],
    selector: 'app-images-viewer',
    templateUrl: './images-viewer.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./images-viewer.component.scss']
})
export class ImagesViewerComponent implements OnInit, OnChanges, OnDestroy {
  readonly images = input<Image[]>([]);
  /** Names the photos in their alt text when they have no description. */
  readonly projectName = input('');
  /** Every photo's year, project and favorites key by its url; each one with a place gets a heart. */
  readonly photoPlaces = input<ReadonlyMap<string, PhotoPlace>>(new Map());
  /** A heading per picture, as the Favorites grid splits projects from single photos; empty for one plain grid. */
  readonly sections = input<ReadonlyMap<Image, string>>(new Map());
  @Output() enlargedChange = new EventEmitter<boolean>();
  /** The photo the single view shows, null for the grid; the page's previous/next links follow it. */
  readonly shownImageChange = output<Image | null>();
  readonly currentIndex = signal(0);
  readonly isOverlayOpen = signal(false);
  readonly singleView = signal(false);
  readonly singleImage = signal<ImageSize>({ ...IMAGE_SIZE_DEFAULT });
  readonly searchTerm = signal('');
  readonly filteredImages = computed(() => filterImagesBySearch(this.images(), this.searchTerm()));
  readonly currentImage = computed<Image | undefined>(() => this.filteredImages()[this.currentIndex()]);
  readonly favorites = inject(FavoritesService);
  /** The shown photo's place, null for one the project list doesn't have. */
  readonly currentPlace = computed(() => {
    const image = this.currentImage();
    return image ? this.photoPlaces().get(image.url) ?? null : null;
  });
  /** No project name: a year, All, Featured or Favorites view, where photos from many projects sit together. */
  readonly mixed = computed(() => this.projectName().trim() === '');
  /** The grid as runs of photos under the same heading, each photo keeping its index in the whole list. */
  readonly gridRuns = computed(() => {
    const runs: { heading: string; items: { image: Image; index: number }[] }[] = [];
    this.filteredImages().forEach((image, index) => {
      const heading = this.sections().get(image) ?? '';
      const last = runs.at(-1);
      if (last && last.heading === heading) {
        last.items.push({ image, index });
      } else {
        runs.push({ heading, items: [{ image, index }] });
      }
    });
    return runs;
  });
  private popStateSubscription?: SubscriptionLike;
  private readonly swipe = new SwipeTracker();
  /** Held so the requests aren't dropped; the browser cache serves them when the photo is shown. */
  private readonly preloaded = new Map<string, HTMLImageElement>();

  constructor(private route: ActivatedRoute, private location: Location) {
    // Arrows and swipes step the shown photo without the parent hearing of it otherwise
    effect(() => this.shownImageChange.emit(this.singleView() ? this.currentImage() ?? null : null));

    // Prerendering has no window, so those pages keep the default size until the browser takes over
    if (typeof window !== 'undefined') {
      this.adjustImageSize(window.innerWidth, window.innerHeight);
      effect(() => this.preloadNeighbors());
      // Opening one photo starts at the top, as the grid it replaces may have been scrolled far down
      effect(() => {
        if (this.singleView()) {
          scrollPageToTop();
        }
      });
    }
  }

  private preloadNeighbors(): void {
    if (!this.singleView()) {
      return;
    }

    neighborImageUrls(this.filteredImages(), this.currentIndex(), this.isOverlayOpen())
      .filter(url => !this.preloaded.has(url))
      .forEach(url => {
        // window.Image, since Image here is the project's photo type
        const img = new window.Image();
        img.src = url;
        this.preloaded.set(url, img);
      });
  }

  ngOnInit(): void {
    // The URL, since opening a photo from the home page changes it without the router
    const imageParam = this.urlImageName() ?? this.route.snapshot.queryParamMap.get(URL_PARAM_IMAGE);
    if (imageParam !== null && imageParam !== '') {
      const index = this.filteredImages().findIndex(image => image.name === imageParam);
      if (index !== -1) {
        this.currentIndex.set(index);
        this.singleView.set(true);
      }
    }

    this.checkForIndex(this.route.snapshot.queryParamMap.get(URL_PARAM_INDEX));
    this.emitEnlargedState();

    // Browser/mouse back and forward land here; show whichever image and overlay the entry names.
    this.popStateSubscription = this.location.subscribe(() => this.restoreFromHistory());
  }

  ngOnDestroy(): void {
    this.popStateSubscription?.unsubscribe();
  }

  private restoreFromHistory(): void {
    const imageParam = this.urlImageName();
    const index = imageParam ? this.filteredImages().findIndex(image => image.name === imageParam) : -1;

    this.singleView.set(index !== -1);
    if (this.singleView()) {
      this.currentIndex.set(index);
    }

    const state = this.location.getState() as { overlay?: boolean } | null;
    const isOverlayOpen = this.singleView() && state?.overlay === true;
    if (isOverlayOpen !== this.isOverlayOpen()) {
      this.isOverlayOpen.set(isOverlayOpen);
      this.emitEnlargedState();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.searchTerm.set('');

    // Jumping to another project (or back to one) swaps the images under an open viewer; show the
    // image the URL names, else the grid. The parent already cleared its enlarged state.
    if (!changes['images']?.firstChange) {
      const imageParam = this.urlImageName();
      const index = imageParam ? this.filteredImages().findIndex(image => image.name === imageParam) : -1;

      this.currentIndex.set(Math.max(index, 0));
      this.singleView.set(index !== -1);
      this.isOverlayOpen.set(false);
    }
  }

  searchChange(term: string): void {
    this.searchTerm.set(term);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.adjustImageSize(event.target.innerWidth, event.target.innerHeight);
  }

  private adjustImageSize(width: number, height: number) {
    this.singleImage.set(adjustImageToScreenSize(width, height));
  }

  checkForIndex(indexParam: string | null): void {
    if (indexParam !== null && indexParam !== '') {
      const index = parseInt(indexParam, 10);

      setTimeout(() => {
        const images = document.querySelectorAll(CSS_SELECTOR_IMAGES);
        if (images[index]) {
          images[index].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 100);
    }
  }

  goToPrevious() {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(index => index - 1);
      this.replaceImageUrlParam(this.currentIndex());
    } else {
      // set to end ??
    }
  }

  goToNext() {
    if (this.currentIndex() < this.filteredImages().length - 1) {
      this.currentIndex.update(index => index + 1);
      this.replaceImageUrlParam(this.currentIndex());
    } else {
      // reshuffle cards
    }
  }

  onSwipeStart(event: TouchEvent): void {
    this.swipe.begin(event);
  }

  onSwipeEnd(event: TouchEvent): void {
    const direction = this.swipe.end(event);
    if (direction === 'previous') {
      this.goToPrevious();
    } else if (direction === 'next') {
      this.goToNext();
    }
  }

  onGridImageClick(index: number): void {
    this.currentIndex.set(index);
    this.singleView.set(true);
    this.emitEnlargedState();

    this.location.go(this.buildImageUrl(this.currentImage()?.name || '', index));
  }

  onSingleImageClick(): void {
    this.isOverlayOpen.set(true);
    this.emitEnlargedState();

    // Same URL, marked in history state, so browser/mouse back closes the overlay first.
    this.location.go(this.location.path(), '', { overlay: true });
  }

  closeOverlay(): void {
    this.isOverlayOpen.set(false);
    this.emitEnlargedState();

    const state = this.location.getState() as { overlay?: boolean } | null;
    if (state?.overlay) {
      this.location.back();
    }
  }

  backClick(): void {
    this.singleView.set(false);
    this.emitEnlargedState();

    this.location.go(this.buildImageUrl(null));
    this.checkForIndex(this.currentIndex().toString());
  }

  toggleFavorite(place: PhotoPlace): void {
    this.favorites.togglePath(place.path);
  }

  place(image: Image): PhotoPlace | null {
    return this.photoPlaces().get(image.url) ?? null;
  }

  /** The project a photo comes from, only where photos of many projects mix; '' for a loose one or one project. */
  source(image: Image): string {
    return this.mixed() ? this.place(image)?.project ?? '' : '';
  }

  altText(image: Image): string {
    const place = this.place(image);
    if (!this.mixed() || !place) {
      return imageAltText(image, this.projectName());
    }

    // The project list's own photo, as a mixed view's copy carries '(2026 - Project)' in its description;
    // a photo with no description already names its project in the alt text
    const text = imageAltText(place.image, place.project ?? '');
    const named = place.image.desc.trim() !== '';
    return place.project && named ? `${text}, from ${place.project}` : text;
  }

  getThumbnailImage(url: string): string {
    return createThumbnailImageUrl(url);
  }

  getMidsizeImage(url: string): string {
    return createMidsizeImageUrl(url);
  }

  private emitEnlargedState(): void {
    this.enlargedChange.emit(this.isOverlayOpen());
  }

  private replaceImageUrlParam(index: number | null): void {
    let url = '';
    if (index === null) {
      url = this.buildImageUrl(null);
    } else {
      const imageName = this.filteredImages()[index]?.name || '';
      url = this.buildImageUrl(imageName, index);
    }

    // Keep the history state so stepping images inside the overlay leaves it marked as open.
    this.location.replaceState(url, '', this.location.getState());
  }

  /** The photo the URL names: a photo page's own, else the `?image=` param. */
  private urlImageName(): string | null {
    const path = this.location.path();
    return parsePhotoPath(path)?.name ?? new URLSearchParams(path.split('?')[1] ?? '').get(URL_PARAM_IMAGE);
  }

  /**
   * A photo's own page when this view is where it lives (its project, or its year for a photo in no project), so the
   * address bar is a link that previews it; `?image=` in a view mixing many places. The grid is the view's own path.
   */
  private buildImageUrl(imageName: string | null, index: number | null = null): string {
    const queryParams = new URLSearchParams(window.location.search);
    // Location's path, as a photo page's in-app URL only reaches window.location through the browser
    const current = this.location.path().split(/[?#]/)[0] || location.pathname;
    const path = parsePhotoPath(current) ? viewPathOf(current) : location.pathname;
    const image = imageName === null ? undefined : this.filteredImages().find(image => image.name === imageName);
    const place = image ? this.place(image) : null;
    const own = place ? ownPhotoUrl(path, place) : null;

    if (imageName === null || own) {
      queryParams.delete(URL_PARAM_IMAGE);
    } else {
      queryParams.set(URL_PARAM_IMAGE, imageName);
    }

    if (index !== null) {
      queryParams.set(URL_PARAM_INDEX, index.toString());
    }

    return `${own ?? path}?${queryParams.toString()}`;
  }
}
