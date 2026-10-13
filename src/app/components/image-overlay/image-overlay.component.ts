import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import {CommonModule} from '@angular/common';
import { SwipeTracker } from '../../constant/constants';

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
  @Input() imageAlt: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  @ViewChild('closeBtn') closeBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('dialog') dialog?: ElementRef<HTMLElement>;

  private previouslyFocusedElement: HTMLElement | null = null;
  private readonly swipe = new SwipeTracker();

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

  @HostListener('document:keydown.tab', ['$event'])
  onTab(event: Event): void {
    this.trapFocus(event as KeyboardEvent, false);
  }

  @HostListener('document:keydown.shift.tab', ['$event'])
  onShiftTab(event: Event): void {
    this.trapFocus(event as KeyboardEvent, true);
  }

  private getFocusableElements(): HTMLElement[] {
    const root = this.dialog?.nativeElement;
    if (!root) {
      return [];
    }

    return Array.from(
      root.querySelectorAll<HTMLElement>('[tabindex]:not([tabindex="-1"]), button:not([disabled]), a[href]')
    );
  }

  private trapFocus(event: KeyboardEvent, backwards: boolean): void {
    const focusable = this.getFocusableElements();
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement;

    if (backwards && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!backwards && active === last) {
      event.preventDefault();
      first.focus();
    } else if (!focusable.includes(active)) {
      // Focus escaped the dialog (or hasn't entered it yet) - pull it back in.
      event.preventDefault();
      first.focus();
    }
  }

  onSwipeStart(event: TouchEvent): void {
    this.swipe.begin(event);
  }

  onSwipeEnd(event: TouchEvent): void {
    const direction = this.swipe.end(event);
    if (direction === 'previous') {
      this.previous.emit();
    } else if (direction === 'next') {
      this.next.emit();
    }
  }

  closeOverlay() {
    this.close.emit();
  }
}
