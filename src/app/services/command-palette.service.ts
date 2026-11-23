import { Injectable, signal } from '@angular/core';

/** The palette lists projects and loose photos, so its button and dialog name both. */
export const PALETTE_LABEL: string = 'Jump to a project or photo';

/** Open state for the Ctrl/⌘ K jump palette, shared so the top bar button can open it. */
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
