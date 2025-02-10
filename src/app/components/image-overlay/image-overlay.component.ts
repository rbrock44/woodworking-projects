import { Component, Input, Output, EventEmitter, OnChanges, HostListener } from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  standalone: true,
  imports: [
    CommonModule,
  ],
  selector: 'app-image-overlay',
  templateUrl: './image-overlay.component.html',
  styleUrls: ['./image-overlay.component.scss']
})
export class ImageOverlayComponent implements OnChanges {
  @Input() imageSrc: string = '';
  @Output() close = new EventEmitter<void>();

  imageWidth = 0;
  imageHeight = 0;

  ngOnChanges() {
    this.calculateSize();
  }

  closeOverlay() {
    this.close.emit();
  }

  calculateSize() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const maxWidth = screenWidth * 0.9; // 90% of screen width
    const maxHeight = screenHeight * 0.9; // 90% of screen height

    // Maintain 3:4 aspect ratio
    let width = maxWidth;
    let height = (width * 4) / 3;

    if (height > maxHeight) {
      height = maxHeight;
      width = (height * 3) / 4;
    }

    this.imageWidth = width;
    this.imageHeight = height;
  }

  @HostListener('window:resize', [])
  onResize() {
      this.calculateSize();
  }
}
