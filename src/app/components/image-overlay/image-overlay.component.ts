import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
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
export class ImageOverlayComponent implements AfterViewInit, OnDestroy {
  @Input() imageSrc: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  @ViewChild('closeBtn') closeBtn?: ElementRef<HTMLButtonElement>;

  private previouslyFocusedElement: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    this.closeBtn?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.previouslyFocusedElement?.focus();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeOverlay();
  }

  @HostListener('document:keydown.arrowleft')
  onArrowLeft(): void {
    this.previous.emit();
  }

  @HostListener('document:keydown.arrowright')
  onArrowRight(): void {
    this.next.emit();
  }

  closeOverlay() {
    this.close.emit();
  }
}
