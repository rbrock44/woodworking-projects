import { Location, NgOptimizedImage } from '@angular/common';
import { SubscriptionLike } from 'rxjs';
import { Component, Output, EventEmitter, OnInit, OnChanges, OnDestroy, HostListener, ChangeDetectionStrategy, SimpleChanges, computed, input, signal } from '@angular/core';
import { Image, ImageSize } from '../../type/project.type';
import { ImageOverlayComponent } from '../image-overlay/image-overlay.component';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { ActivatedRoute } from '@angular/router';
import { adjustImageToScreenSize, createThumbnailImageUrl, CSS_SELECTOR_IMAGES, filterImagesBySearch, IMAGE_SIZE_DEFAULT, imageAltText, URL_PARAM_IMAGE, URL_PARAM_INDEX } from '../../constant/constants';

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
  @Output() enlargedChange = new EventEmitter<boolean>();
  readonly currentIndex = signal(0);
  readonly isOverlayOpen = signal(false);
  readonly singleView = signal(false);
  readonly singleImage = signal<ImageSize>({ ...IMAGE_SIZE_DEFAULT });
  readonly searchTerm = signal('');
  readonly filteredImages = computed(() => filterImagesBySearch(this.images(), this.searchTerm()));
  readonly currentImage = computed<Image | undefined>(() => this.filteredImages()[this.currentIndex()]);
  private popStateSubscription?: SubscriptionLike;

  constructor(private route: ActivatedRoute, private location: Location) {
    // Prerendering has no window, so those pages keep the default size until the browser takes over
    if (typeof window !== 'undefined') {
      this.adjustImageSize(window.innerWidth, window.innerHeight);
    }
  }

  ngOnInit(): void {
    const imageParam = this.route.snapshot.queryParamMap.get(URL_PARAM_IMAGE);
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
    const params = new URLSearchParams(this.location.path().split('?')[1] ?? '');
    const imageParam = params.get(URL_PARAM_IMAGE);
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
      const imageParam = new URLSearchParams(this.location.path().split('?')[1] ?? '').get(URL_PARAM_IMAGE);
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

  altText(image: Image): string {
    return imageAltText(image, this.projectName());
  }

  getThumbnailImage(url: string): string {
    return createThumbnailImageUrl(url);
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

  private buildImageUrl(imageName: string | null, index: number | null = null): string {
    const queryParams = new URLSearchParams(window.location.search);

    if (imageName === null) {
      queryParams.delete(URL_PARAM_IMAGE);
    } else {
      queryParams.set(URL_PARAM_IMAGE, imageName);
    }

    if (index !== null) {
      queryParams.set(URL_PARAM_INDEX, index.toString());
    }

    return `${location.pathname}?${queryParams.toString()}`;
  }
}
