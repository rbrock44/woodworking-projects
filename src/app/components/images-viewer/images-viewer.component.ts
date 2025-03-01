import {CommonModule, NgOptimizedImage} from '@angular/common';
import {Component, Input, OnInit, HostListener} from '@angular/core';
import {Image} from '../../type/project.type';
import {ImageOverlayComponent} from '../image-overlay/image-overlay.component';

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
  defaultImage = { height: 400, width: 300 };
  singleImage = { ...this.defaultImage };

  constructor() {
    this.adjustImageSize(window.innerWidth);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.adjustImageSize(event.target.innerWidth, event.target.innerHeight);
  }

  private adjustImageSize(width: number, height: number) {
    let widthImage = { height: 0, width: 0 };
    let heightImage = { height: 0, width: 0 };

    const tiny = { height: 200, width: 150 };
    const small = { height: 267, width: 200 };
    const large = { height: 533, width: 400 };

    if (width < 315) {
      widthImage = tiny;
    } else if (width < 500) {
      widthImage = small;
    } else if (width > 900) {
      widthImage = large;
    } else {
      widthImage = { ...this.defaultImage };
    }

    if (height < 315) {
      this.singleImage = tiny;
    } else if (height < 550) {
      this.singleImage = small;
    } else if (height > 800) {
      this.singleImage = large;
    } else {
      this.singleImage = { ...this.defaultImage };
    }

    if (widthImage.height > heightImage.height) {
      this.singleImage = heightImage;
    } else {
      this.singleImage = widthImage;
    }
  }

  goToPrevious() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      // set to end ??
    }
  }

  goToNext() {
    if (this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
    } else {
      // reshuffle cards
    }
  }

  onGridImageClick(index: number): void {
    this.currentIndex = index;
    this.singleView = true;
  }

  onSingleImageClick(): void {
    this.isOverlayOpen = true;
  }

  backClick(): void {
    this.singleView = false;
  }
}
