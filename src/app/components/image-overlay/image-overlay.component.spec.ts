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
});
