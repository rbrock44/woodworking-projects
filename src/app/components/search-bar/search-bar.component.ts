import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
    imports: [],
    selector: 'app-search-bar',
    templateUrl: './search-bar.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./search-bar.component.scss']
})
export class SearchBarComponent {
  @Input() value: string = '';
  @Input() placeholder: string = 'Search';
  @Input() label: string = 'Search';
  @Input() resultCount: number = 0;
  @Input() totalCount: number = 0;
  @Input() resultNoun: string = 'result';
  @Output() valueChange = new EventEmitter<string>();

  get isSearching(): boolean {
    return this.value.trim() !== '';
  }

  get resultText(): string {
    const noun = this.resultCount === 1 ? this.resultNoun : `${this.resultNoun}s`;
    return `${this.resultCount} of ${this.totalCount} ${noun}`;
  }

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }

  clear(): void {
    this.valueChange.emit('');
  }
}
