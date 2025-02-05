import {CommonModule} from '@angular/common';
import {Component, Input, OnInit} from '@angular/core';
import {Image} from '../../type/project.type';

@Component({
  standalone: true,
  imports: [
    CommonModule
    ],
  selector: 'app-project',
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.scss'],
})
export class ProjectComponent {
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
