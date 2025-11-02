import {CommonModule, Location, NgOptimizedImage} from '@angular/common';
import {Component, Input, OnInit, HostListener} from '@angular/core';
import {Image, ImageSize} from '../../type/project.type';
import {ImageOverlayComponent} from '../image-overlay/image-overlay.component';
import {ActivatedRoute} from '@angular/router';
import { adjustImageToScreenSize, createThumbnailImageUrl, IMAGE_SIZE_DEFAULT, URL_PARAM_IMAGE } from '../../constant/constants';

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
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.adjustImageSize(event.target.innerWidth, event.target.innerHeight);
  }

  private adjustImageSize(width: number, height: number) {
      this.singleImage = adjustImageToScreenSize(width, height);
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
      url = this.buildImageUrl(imageName);
    }

    this.location.replaceState(url);
  }

  private buildImageUrl(imageName: string | null): string {
    const queryParams = new URLSearchParams(window.location.search);

    if (imageName === null) {
      queryParams.delete(URL_PARAM_IMAGE);
    } else {
      queryParams.set(URL_PARAM_IMAGE, imageName);
    }

    return `${location.pathname}?${queryParams.toString()}`;
  }
}
