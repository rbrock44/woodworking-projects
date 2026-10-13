import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommandPaletteComponent, PaletteSelection } from './command-palette.component';
import { CommandPaletteService } from '../../services/command-palette.service';
import { ProjectsByYear } from '../../type/project.type';

describe('CommandPaletteComponent', () => {
  let component: CommandPaletteComponent;
  let fixture: ComponentFixture<CommandPaletteComponent>;
  let palette: CommandPaletteService;

  const projectsByYear: ProjectsByYear[] = [
    { year: 'All', projects: [{ name: 'All', images: [] }] },
    { year: '2024', projects: [{ name: 'Walnut Bench', desc: 'Live edge seat', images: [] }, { name: 'Baby Rattles', images: [] }] },
    { year: '2023', projects: [{ name: 'Oak Bench', images: [] }] },
  ];

  const press = (key: string, init: KeyboardEventInit = {}) => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
    fixture.detectChanges();
  };

  const pressInPalette = (key: string, init: KeyboardEventInit = {}) => {
    component.onKeydown(new KeyboardEvent('keydown', { key, ...init }));
    fixture.detectChanges();
  };

  const open = () => {
    palette.open();
    fixture.detectChanges();
  };

  const search = (query: string) => {
    component.onQuery(query);
    fixture.detectChanges();
  };

  const element = () => fixture.nativeElement as HTMLElement;
  const names = () => Array.from(element().querySelectorAll('.item .name')).map(n => n.textContent);
  const sectionLabels = () => component.sections().map(section => section.label);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandPaletteComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CommandPaletteComponent);
    component = fixture.componentInstance;
    component.projectsByYear = projectsByYear;
    palette = TestBed.inject(CommandPaletteService);
    fixture.detectChanges();
  });

  afterEach(() => {
    palette.close();
  });

  it('should render nothing while closed', () => {
    expect(element().querySelector('.palette')).toBeNull();
  });

  it('should open with Ctrl K, ⌘ K, or / and focus the search box', () => {
    press('k', { ctrlKey: true });
    expect(palette.isOpen()).toBe(true);
    expect(document.activeElement?.classList).toContain('query');

    press('k', { ctrlKey: true });
    expect(palette.isOpen()).toBe(false);

    press('K', { metaKey: true });
    expect(palette.isOpen()).toBe(true);
    palette.close();

    press('/');
    expect(palette.isOpen()).toBe(true);
  });

  it('should not hijack / while typing in a field', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));

    expect(palette.isOpen()).toBe(false);
    input.remove();
  });

  it('should list every project grouped by year, leaving out the All shortcut', () => {
    open();

    expect(sectionLabels()).toEqual(['2024', '2023']);
    expect(names()).toEqual(['Walnut Bench', 'Baby Rattles', 'Oak Bench']);
  });

  it('should filter by name, year and description and reset the highlight', () => {
    open();
    pressInPalette('ArrowDown');

    search('bench');
    expect(names()).toEqual(['Walnut Bench', 'Oak Bench']);
    expect(component.activeIndex()).toBe(0);

    search('2023 bench');
    expect(names()).toEqual(['Oak Bench']);

    search('live edge');
    expect(names()).toEqual(['Walnut Bench']);
  });

  it('should show an empty message when nothing matches', () => {
    open();
    search('zzqx');

    expect(element().querySelector('.empty')?.textContent).toContain('zzqx');
  });

  it('should move the highlight with the arrow keys and wrap around', () => {
    open();

    pressInPalette('ArrowUp');
    expect(component.activeIndex()).toBe(2);

    pressInPalette('ArrowDown');
    expect(component.activeIndex()).toBe(0);
    expect(element().querySelector('[role="combobox"]')?.getAttribute('aria-activedescendant'))
      .toBe('palette-option-0');
  });

  it('should keep its keys from reaching document listeners like the image overlay', () => {
    let reached = false;
    const listener = () => (reached = true);
    document.addEventListener('keydown', listener);
    open();

    const input = element().querySelector('.query') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(reached).toBe(false);
    document.removeEventListener('keydown', listener);
  });

  it('should emit the highlighted project on Enter and close', () => {
    let selected: PaletteSelection | undefined;
    component.projectSelect.subscribe((selection: PaletteSelection) => (selected = selection));
    open();
    search('oak');

    pressInPalette('Enter');

    expect(selected?.project.name).toBe('Oak Bench');
    expect(selected?.year).toBe('2023');
    expect(palette.isOpen()).toBe(false);
  });

  it('should emit a clicked project', () => {
    let selected: PaletteSelection | undefined;
    component.projectSelect.subscribe((selection: PaletteSelection) => (selected = selection));
    open();

    (element().querySelectorAll('.item')[1] as HTMLElement).click();

    expect(selected?.project.name).toBe('Baby Rattles');
    expect(palette.isOpen()).toBe(false);
  });

  it('should close on Escape and on a backdrop click', () => {
    open();
    pressInPalette('Escape');
    expect(palette.isOpen()).toBe(false);

    open();
    (element().querySelector('.backdrop') as HTMLElement).click();
    expect(palette.isOpen()).toBe(false);
  });

  it('should start fresh when reopened', () => {
    open();
    search('oak');
    palette.close();

    open();
    expect(component.query()).toBe('');
    expect(names().length).toBe(3);
  });

  it('should open from the floating button and tuck it away while open', () => {
    const fab = element().querySelector('.fab') as HTMLButtonElement;
    expect(fab.classList).not.toContain('tucked');

    fab.click();
    fixture.detectChanges();

    expect(palette.isOpen()).toBe(true);
    expect(fab.classList).toContain('tucked');
  });

  it('should close from the Cancel button', () => {
    open();

    (element().querySelector('.cancel') as HTMLButtonElement).click();
    expect(palette.isOpen()).toBe(false);
  });

  it('should tuck the floating button while a list scrolls down and bring it back on the way up', () => {
    const list = document.createElement('div');
    document.body.appendChild(list);
    const scrollTo = (y: number) => {
      Object.defineProperty(list, 'scrollTop', { value: y, configurable: true });
      list.dispatchEvent(new Event('scroll'));
    };

    scrollTo(0);
    scrollTo(400);
    expect(component.fabTucked()).toBe(true);

    scrollTo(300);
    expect(component.fabTucked()).toBe(false);

    scrollTo(302);
    expect(component.fabTucked()).toBe(false);

    scrollTo(600);
    expect(component.fabTucked()).toBe(true);

    scrollTo(20);
    expect(component.fabTucked()).toBe(false);
    list.remove();
  });

  it('should give the search box a mobile keyboard Go key', () => {
    open();

    const input = element().querySelector('.query') as HTMLInputElement;
    expect(input.getAttribute('enterkeyhint')).toBe('go');
    expect(input.getAttribute('inputmode')).toBe('search');
  });

  it("should show each result's cover thumbnail, else its last photo's, and none without photos", () => {
    const photo = (name: string) => ({ name, desc: '', url: `https://example.com/${name}.jpg` });
    component.projectsByYear = [
      { year: '2025', projects: [
        { name: 'Urn', cover: 'a', images: [photo('a'), photo('b')] },
        { name: 'Lathe', images: [photo('c'), photo('d')] },
        { name: 'Sketch', images: [] },
      ] },
    ];
    open();

    const thumbs = Array.from(element().querySelectorAll('.item'), item => item.querySelector('.thumb')?.getAttribute('src') ?? null);
    expect(thumbs).toEqual(['https://example.com/a-150x200.jpg', 'https://example.com/d-150x200.jpg', null]);
    expect(element().querySelector('.thumb')?.getAttribute('alt')).toBe('');
  });
});
