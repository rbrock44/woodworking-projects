import { TestBed } from '@angular/core/testing';
import { ImagesViewerComponent } from './images-viewer.component';

describe('ImagesViewerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagesViewerComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(ImagesViewerComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
