import {CommonModule, NgOptimizedImage} from '@angular/common';
import {Component, Input, OnInit, HostListener} from '@angular/core';
import {Image} from '../../type/project.type';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    NgOptimizedImage
  ],
  selector: 'app-project',
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.scss'],
})
export class ProjectComponent {
  @Input() images: Image[] = [];
  currentIndex: number = 0; // Initialize at 0 for the first image
  singleView = false;
  defaultImage = { height: 400, width: 300 };
  singleImage = { ...this.defaultImage };

  constructor() {
    this.adjustImageSize(window.innerWidth);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.adjustImageSize(event.target.innerWidth);
  }

  private adjustImageSize(width: number) {
    if (width < 500) {
      this.singleImage = { height: 250, width: 200 }; // Smaller size for small screens
    } else if (width > 900) {
      this.singleImage = { height: 500, width: 400 }; // Larger size for bigger screens
    } else {
      this.singleImage = { ...this.defaultImage }; // Default size
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

  onImageClick(index: number): void {
    this.currentIndex = index;
    this.singleView = true;
  }

  backClick(): void {
    this.singleView = false;
  }
}
