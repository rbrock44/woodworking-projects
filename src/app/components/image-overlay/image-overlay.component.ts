import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
    imports: [
        CommonModule,
    ],
    selector: 'app-image-overlay',
    templateUrl: './image-overlay.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./image-overlay.component.scss']
})
export class ImageOverlayComponent {
  @Input() imageSrc: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  closeOverlay() {
    this.close.emit();
  }
}
