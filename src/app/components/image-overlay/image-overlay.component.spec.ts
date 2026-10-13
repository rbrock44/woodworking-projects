import { TestBed } from '@angular/core/testing';
import { ImageOverlayComponent } from './image-overlay.component';

describe('ImageOverlayComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageOverlayComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(ImageOverlayComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render as an accessible modal dialog', () => {
    const fixture = TestBed.createComponent(ImageOverlayComponent);
    fixture.componentInstance.imageSrc = 'photo.jpg';
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.image-overlay') as HTMLElement;
    expect(dialog.getAttribute('role')).toEqual('dialog');
    expect(dialog.getAttribute('aria-modal')).toEqual('true');
    expect(dialog.getAttribute('aria-label')).toBeTruthy();
  });

  it('should render the given image', () => {
    const fixture = TestBed.createComponent(ImageOverlayComponent);
    fixture.componentInstance.imageSrc = 'photo.jpg';
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.image-overlay img') as HTMLImageElement;
    expect(img.src).toContain('photo.jpg');
  });

  it('should move focus to the close button on open', () => {
    const fixture = TestBed.createComponent(ImageOverlayComponent);
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('.close-btn') as HTMLButtonElement;
    expect(document.activeElement).toBe(closeBtn);
  });

  it('should restore focus to the element that was focused before opening', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const fixture = TestBed.createComponent(ImageOverlayComponent);
    fixture.detectChanges();
    fixture.destroy();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('should close on the close button click', () => {
    const fixture = TestBed.createComponent(ImageOverlayComponent);
    fixture.detectChanges();

    let closed = false;
    fixture.componentInstance.close.subscribe(() => (closed = true));

    const closeBtn = fixture.nativeElement.querySelector('.close-btn') as HTMLButtonElement;
    closeBtn.click();

    expect(closed).toBe(true);
  });

  it('should close on Escape', () => {
    const fixture = TestBed.createComponent(ImageOverlayComponent);
    fixture.detectChanges();

    let closed = false;
    fixture.componentInstance.close.subscribe(() => (closed = true));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closed).toBe(true);
  });

  it('should emit previous/next on ArrowLeft/ArrowRight', () => {
    const fixture = TestBed.createComponent(ImageOverlayComponent);
    fixture.detectChanges();

    let previousCount = 0;
    let nextCount = 0;
    fixture.componentInstance.previous.subscribe(() => previousCount++);
    fixture.componentInstance.next.subscribe(() => nextCount++);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(previousCount).toEqual(1);
    expect(nextCount).toEqual(2);
  });

  it('should emit previous/next when the click zones are activated', () => {
    const fixture = TestBed.createComponent(ImageOverlayComponent);
    fixture.detectChanges();

    let previousCount = 0;
    let nextCount = 0;
    fixture.componentInstance.previous.subscribe(() => previousCount++);
    fixture.componentInstance.next.subscribe(() => nextCount++);

    const left = fixture.nativeElement.querySelector('.image-zone.left') as HTMLElement;
    const right = fixture.nativeElement.querySelector('.image-zone.right') as HTMLElement;

    left.click();
    right.click();

    expect(previousCount).toEqual(1);
    expect(nextCount).toEqual(1);
  });

  it('should not close when clicking inside the dialog', () => {
    const fixture = TestBed.createComponent(ImageOverlayComponent);
    fixture.detectChanges();

    let closed = false;
    fixture.componentInstance.close.subscribe(() => (closed = true));

    const dialog = fixture.nativeElement.querySelector('.image-overlay') as HTMLElement;
    dialog.click();

    expect(closed).toBe(false);
  });

  it('should close when clicking the backdrop', () => {
    const fixture = TestBed.createComponent(ImageOverlayComponent);
    fixture.detectChanges();

    let closed = false;
    fixture.componentInstance.close.subscribe(() => (closed = true));

    const backdrop = fixture.nativeElement.querySelector('.overlay') as HTMLElement;
    backdrop.click();

    expect(closed).toBe(true);
  });

  it('should trap Tab forward from the last focusable element back to the first', () => {
    const fixture = TestBed.createComponent(ImageOverlayComponent);
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('.close-btn') as HTMLButtonElement;
    const leftZone = fixture.nativeElement.querySelector('.image-zone.left') as HTMLElement;

    // closeBtn is last in DOM order among the focusable elements.
    closeBtn.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(leftZone);
  });

  it('should trap Shift+Tab backward from the first focusable element to the last', () => {
    const fixture = TestBed.createComponent(ImageOverlayComponent);
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('.close-btn') as HTMLButtonElement;
    const leftZone = fixture.nativeElement.querySelector('.image-zone.left') as HTMLElement;

    leftZone.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(event);

    expect(document.activeElement).toBe(closeBtn);
  });
});
