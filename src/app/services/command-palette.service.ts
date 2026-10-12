import { Injectable, signal } from '@angular/core';

/** Open state for the Ctrl/⌘ K project palette, shared so the top bar button can open it. */
@Injectable({
  providedIn: 'root'
})
export class CommandPaletteService {
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
