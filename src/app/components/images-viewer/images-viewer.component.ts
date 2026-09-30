import { Location, NgOptimizedImage } from '@angular/common';
import { SubscriptionLike } from 'rxjs';
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { Image, ImageSize } from '../../type/project.type';
import { ImageOverlayComponent } from '../image-overlay/image-overlay.component';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { ActivatedRoute } from '@angular/router';
import { adjustImageToScreenSize, createThumbnailImageUrl, CSS_SELECTOR_IMAGES, filterImagesBySearch, IMAGE_SIZE_DEFAULT, URL_PARAM_IMAGE, URL_PARAM_INDEX } from '../../constant/constants';

@Component({
    imports: [
    ImageOverlayComponent,
    SearchBarComponent,
    NgOptimizedImage
],
    selector: 'app-images-viewer',
    templateUrl: './images-viewer.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./images-viewer.component.scss']
})
export class ImagesViewerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() images: Image[] = [];
  @Output() enlargedChange = new EventEmitter<boolean>();
  currentIndex: number = 0;
  isOverlayOpen: boolean = false;
  singleView = false;
  singleImage: ImageSize = { ...IMAGE_SIZE_DEFAULT };
  searchTerm: string = '';
  filteredImages: Image[] = [];
  private popStateSubscription?: SubscriptionLike;

  constructor(private route: ActivatedRoute, private location: Location) {
    this.adjustImageSize(window.innerWidth, window.innerHeight);
  }

  ngOnInit(): void {
    this.applySearch();

    const imageParam = this.route.snapshot.queryParamMap.get(URL_PARAM_IMAGE);
    if (imageParam !== null && imageParam !== '') {
      const index = this.filteredImages.findIndex(image => image.name === imageParam);
      if (index !== -1) {
        this.currentIndex = index;
        this.singleView = true;
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
    const index = imageParam ? this.filteredImages.findIndex(image => image.name === imageParam) : -1;

    this.singleView = index !== -1;
    if (this.singleView) {
      this.currentIndex = index;
    }

    const state = this.location.getState() as { overlay?: boolean } | null;
    const isOverlayOpen = this.singleView && state?.overlay === true;
    if (isOverlayOpen !== this.isOverlayOpen) {
      this.isOverlayOpen = isOverlayOpen;
      this.emitEnlargedState();
    }
  }

  ngOnChanges(): void {
    this.searchTerm = '';
    this.applySearch();
  }

  searchChange(term: string): void {
    this.searchTerm = term;
    this.applySearch();
  }

  private applySearch(): void {
    this.filteredImages = filterImagesBySearch(this.images, this.searchTerm);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.adjustImageSize(event.target.innerWidth, event.target.innerHeight);
  }

  private adjustImageSize(width: number, height: number) {
    this.singleImage = adjustImageToScreenSize(width, height);
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
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.replaceImageUrlParam(this.currentIndex);
    } else {
      // set to end ??
    }
  }

  goToNext() {
    if (this.currentIndex < this.filteredImages.length - 1) {
      this.currentIndex++;
      this.replaceImageUrlParam(this.currentIndex);
    } else {
      // reshuffle cards
    }
  }

  onGridImageClick(index: number): void {
    this.currentIndex = index;
    this.singleView = true;
    this.emitEnlargedState();

    this.location.go(this.buildImageUrl(this.filteredImages[this.currentIndex]?.name || '', this.currentIndex));
  }

  onSingleImageClick(): void {
    this.isOverlayOpen = true;
    this.emitEnlargedState();

    // Same URL, marked in history state, so browser/mouse back closes the overlay first.
    this.location.go(this.location.path(), '', { overlay: true });
  }

  closeOverlay(): void {
    this.isOverlayOpen = false;
    this.emitEnlargedState();

    const state = this.location.getState() as { overlay?: boolean } | null;
    if (state?.overlay) {
      this.location.back();
    }
  }

  backClick(): void {
    this.singleView = false;
    this.emitEnlargedState();

    this.location.go(this.buildImageUrl(null));
    this.checkForIndex(this.currentIndex.toString());
  }

  getThumbnailImage(url: string): string {
    return createThumbnailImageUrl(url);
  }

  private emitEnlargedState(): void {
    this.enlargedChange.emit(this.isOverlayOpen);
  }

  private replaceImageUrlParam(index: number | null): void {
    let url = '';
    if (index === null) {
      url = this.buildImageUrl(null);
    } else {
      const imageName = this.filteredImages[index]?.name || '';
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
