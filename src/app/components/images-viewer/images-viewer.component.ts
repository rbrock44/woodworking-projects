import { CommonModule, Location, NgOptimizedImage } from '@angular/common';
import { Component, Input, OnInit, HostListener } from '@angular/core';
import { Image, ImageSize } from '../../type/project.type';
import { ImageOverlayComponent } from '../image-overlay/image-overlay.component';
import { ActivatedRoute } from '@angular/router';
import { adjustImageToScreenSize, createThumbnailImageUrl, CSS_SELECTOR_IMAGES, IMAGE_SIZE_DEFAULT, URL_PARAM_IMAGE, URL_PARAM_INDEX } from '../../constant/constants';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ImageOverlayComponent,
    NgOptimizedImage,
  ],
  selector: 'app-images-viewer',
  templateUrl: './images-viewer.component.html',
  styleUrls: ['./images-viewer.component.scss'],
})
export class ImagesViewerComponent {
  @Input() images: Image[] = [];
  currentIndex: number = 0;
  isOverlayOpen: boolean = false;
  singleView = false;
  singleImage: ImageSize = { ...IMAGE_SIZE_DEFAULT };

  constructor(private route: ActivatedRoute, private location: Location) {
    this.adjustImageSize(window.innerWidth, window.innerHeight);
  }

  ngOnInit(): void {
    const imageParam = this.route.snapshot.queryParamMap.get(URL_PARAM_IMAGE);
    if (imageParam !== null && imageParam !== '') {
      this.currentIndex = this.images.findIndex(image => image.name === imageParam);
      this.singleView = true;
    }

    this.checkForIndex(this.route.snapshot.queryParamMap.get(URL_PARAM_INDEX));
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
    if (this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
      this.replaceImageUrlParam(this.currentIndex);
    } else {
      // reshuffle cards
    }
  }

  onGridImageClick(index: number): void {
    this.currentIndex = index;
    this.singleView = true;

    this.replaceImageUrlParam(this.currentIndex);
  }

  onSingleImageClick(): void {
    this.isOverlayOpen = true;
  }

  backClick(): void {
    this.singleView = false;

    this.replaceImageUrlParam(null);
    this.checkForIndex(this.currentIndex.toString());
  }

  getThumbnailImage(url: string): string {
    return createThumbnailImageUrl(url);
  }

  private replaceImageUrlParam(index: number | null): void {
    let url = '';
    if (index === null) {
      url = this.buildImageUrl(null);
    } else {
      const imageName = this.images[index]?.name || '';
      url = this.buildImageUrl(imageName, index);
    }

    this.location.replaceState(url);
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
