import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Project, ProjectsByYear } from '../../type/project.type';
import { ALL, filterProjectsBySearch } from '../../constant/constants';
import { CommandPaletteService } from '../../services/command-palette.service';

export interface PaletteSelection {
  project: Project;
  year: string;
}

interface PaletteItem extends PaletteSelection {
  index: number;
}

interface PaletteSection {
  label: string;
  items: PaletteItem[];
}

@Component({
  selector: 'app-command-palette',
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPaletteComponent {
  readonly palette = inject(CommandPaletteService);

  @Input() set projectsByYear(value: ProjectsByYear[]) {
    // The synthetic 'All' group is a shortcut, not a project
    this.groups.set(value.filter(group => group.year !== ALL));
  }
  @Output() projectSelect = new EventEmitter<PaletteSelection>();

  readonly query = signal('');
  readonly activeIndex = signal(0);
  /** The phone jump button tucks away while scrolling down so it doesn't cover content. */
  readonly fabTucked = signal(false);
  private readonly groups = signal<ProjectsByYear[]>([]);
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');
  private returnFocusTo: HTMLElement | null = null;

  /** One section per year, newest first, narrowed by the same search as the home page. */
  readonly sections = computed<PaletteSection[]>(() => {
    let index = 0;
    return filterProjectsBySearch(this.groups(), this.query()).map(group => ({
      label: group.year,
      items: group.projects.map(project => ({ project, year: group.year, index: index++ })),
    }));
  });

  readonly items = computed(() => this.sections().flatMap(section => section.items));
  readonly activeId = computed(() =>
    this.items().length > 0 ? `palette-option-${this.activeIndex()}` : null
  );

  constructor() {
    // Opening can come from the shortcut or the top bar button, so reset on the state change.
    effect(() => {
      if (this.palette.isOpen()) {
        untracked(() => {
          this.returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          this.query.set('');
          this.activeIndex.set(0);
        });
      }
    });
    effect(() => {
      this.input()?.nativeElement.focus();
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // The page itself never scrolls; the project list and image grid do, so listen for any of them.
      let lastTarget: EventTarget | null = null;
      let lastY = 0;
      const onScroll = (event: Event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const y = target.scrollTop;
        if (target !== lastTarget) {
          lastTarget = target;
          lastY = y;
          return;
        }
        // A few pixels of slack so small scroll jitter doesn't flicker the button.
        if (y < 80 || y < lastY - 8) {
          this.fabTucked.set(false);
        } else if (y > lastY + 8) {
          this.fabTucked.set(true);
        }
        if (Math.abs(y - lastY) > 8 || y < 80) {
          lastY = y;
        }
      };
      document.addEventListener('scroll', onScroll, { capture: true, passive: true });
      destroyRef.onDestroy(() => document.removeEventListener('scroll', onScroll, { capture: true }));
    });
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    const isSlash = event.key === '/' && !this.isTyping(event.target);

    if (isShortcut || (isSlash && !this.palette.isOpen())) {
      event.preventDefault();
      if (this.palette.isOpen()) {
        this.close();
      } else {
        this.palette.open();
      }
    }
  }

  close(): void {
    this.palette.close();
    this.returnFocusTo?.focus();
    this.returnFocusTo = null;
  }

  onQuery(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
  }

  onKeydown(event: KeyboardEvent): void {
    // The image overlay listens on the document for arrows, Escape and Tab; keep them in here.
    event.stopPropagation();
    const count = this.items().length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (count) this.setActive((this.activeIndex() + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.setActive((this.activeIndex() - 1 + count) % count);
        break;
      case 'Enter': {
        event.preventDefault();
        const item = this.items()[this.activeIndex()];
        if (item) this.go(item);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'Tab':
        // The input is the only focus stop inside the dialog; keep focus there.
        event.preventDefault();
        break;
      default:
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          this.close();
        }
    }
  }

  go(item: PaletteSelection): void {
    this.palette.close();
    this.returnFocusTo = null;
    this.projectSelect.emit({ project: item.project, year: item.year });
  }

  private setActive(index: number): void {
    this.activeIndex.set(index);
    document.getElementById(`palette-option-${index}`)?.scrollIntoView?.({ block: 'nearest' });
  }

  private isTyping(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    );
  }
}
