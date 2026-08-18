import { TestBed } from '@angular/core/testing';
import { SearchBarComponent } from './search-bar.component';

describe('SearchBarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBarComponent],
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should emit the typed value', () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    let emitted = '';
    component.valueChange.subscribe((value: string) => (emitted = value));

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'walnut';
    input.dispatchEvent(new Event('input'));

    expect(emitted).toEqual('walnut');
  });

  it('should emit an empty value when cleared', () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    const component = fixture.componentInstance;
    component.value = 'walnut';
    fixture.detectChanges();

    let emitted = 'walnut';
    component.valueChange.subscribe((value: string) => (emitted = value));

    const button = fixture.nativeElement.querySelector('.clear-button') as HTMLButtonElement;
    button.click();

    expect(emitted).toEqual('');
  });

  it('should pluralize the result count', () => {
    const fixture = TestBed.createComponent(SearchBarComponent);
    const component = fixture.componentInstance;
    component.resultNoun = 'project';
    component.totalCount = 10;

    component.resultCount = 1;
    expect(component.resultText).toEqual('1 of 10 project');

    component.resultCount = 3;
    expect(component.resultText).toEqual('3 of 10 projects');
  });
});
