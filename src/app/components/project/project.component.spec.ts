
import { TestBed } from '@angular/core/testing';
import { ProjectComponent } from './flash-cards.component';

describe('ProjectComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(ProjectComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
