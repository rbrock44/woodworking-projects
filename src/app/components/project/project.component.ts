import {CommonModule} from '@angular/common';
import {Component, Input, OnInit} from '@angular/core';
import {Image} from '../../type/project.type';

@Component({
  standalone: true,
  imports: [
    CommonModule
    ],
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss'],
})
export class FlashCardsComponent {
  @Input() images: Image[] = [];
  currentIndex: number = 0; // Initialize at 0 for the first image
  singleView = false;

  goToPrevious() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      // set to end ??
    }
  }

  goToNext() {
    if (this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
    } else {
      // reshuffle cards
    }
  }

  onImageClick(index: number): void {
    this.currentIndex = index;
    this.singleView = true;
  }

  backClick(): void {
    this.singleView = false;
  }
}
