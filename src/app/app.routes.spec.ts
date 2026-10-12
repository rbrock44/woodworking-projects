import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('app routes', () => {
  let router: Router;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
  });

  it('should send old ?year=&project= links to the project page, keeping other params', async () => {
    await harness.navigateByUrl('/?year=2012&project=Walnut%20Jewelry%20Box&image=20120307_0045&index=1');
    expect(router.url).toBe('/2012/walnut-jewelry-box?image=20120307_0045&index=1');
  });

  it('should send old year and all links to their pages', async () => {
    await harness.navigateByUrl('/?year=2024&project=');
    expect(router.url).toBe('/2024');

    await harness.navigateByUrl('/?year=All&project=All');
    expect(router.url).toBe('/all');
  });

  it('should accept home, year, all and project paths', async () => {
    for (const url of ['/', '/2024', '/all', '/2024/baby-rattles', '/2024/baby-rattles?image=x']) {
      await harness.navigateByUrl(url);
      expect(router.url).toBe(url);
    }
  });

  it('should send unknown paths home', async () => {
    for (const url of ['/benches', '/all/x', '/2024/a/b']) {
      await harness.navigateByUrl(url);
      expect(router.url).toBe('/');
    }
  });
});
