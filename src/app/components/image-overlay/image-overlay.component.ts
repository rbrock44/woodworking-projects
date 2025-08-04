import { Component, Input, Output, EventEmitter, OnChanges, OnInit, HostListener } from '@angular/core';
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
export class ImageOverlayComponent implements OnInit {
  @Input() imageSrc: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  imageWidth = 0;
  imageHeight = 0;

  ngOnInit() {
    this.calculateSize();
  }

  ngOnChanges() {
    this.calculateSize();
  }

  closeOverlay() {
    this.close.emit();
  }

  calculateSize() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const maxWidth = Math.floor(screenWidth * 0.95);
    const maxHeight = Math.floor(screenHeight * 0.95);

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
