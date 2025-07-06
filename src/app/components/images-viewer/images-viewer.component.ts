import {CommonModule, Location, NgOptimizedImage} from '@angular/common';
import {Component, Input, OnInit, HostListener} from '@angular/core';
import {Image} from '../../type/project.type';
import {ImageOverlayComponent} from '../image-overlay/image-overlay.component';
import {ActivatedRoute, RouterOutlet} from '@angular/router';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ImageOverlayComponent,
    NgOptimizedImage,
    RouterOutlet
  ],
  selector: 'app-images-viewer',
  templateUrl: './images-viewer.component.html',
  styleUrls: ['./images-viewer.component.scss'],
})
export class ImagesViewerComponent {
  @Input() images: Image[] = [];
  currentIndex: number = 0;
  isOverlayOpen: boolean = false;
  singleView = false;
  defaultImage = { height: 400, width: 300 };
  singleImage = { ...this.defaultImage };

  constructor(private route: ActivatedRoute, private location: Location) {
    this.adjustImageSize(window.innerWidth, window.innerHeight);
  }

  ngOnInit(): void {
    const imageParam = this.route.snapshot.queryParamMap.get('image');
    if (imageParam !== null && imageParam !== '') {
      this.currentIndex = this.images.findIndex(image => image.name === imageParam);
      this.singleImage = true;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.adjustImageSize(event.target.innerWidth, event.target.innerHeight);
  }

  private adjustImageSize(width: number, height: number) {
    let widthImage = { height: 0, width: 0 };
    let heightImage = { height: 0, width: 0 };

    const superTiny = { height: 150, width: 112.5 };
    const tiny = { height: 200, width: 150 };
    const small = { height: 267, width: 200 };
    const large = { height: 533, width: 400 };

    if (width < 315) {
      widthImage = { ...tiny };
    } else if (width < 500) {
      widthImage = { ...small };
    } else if (width > 900) {
      widthImage = { ...large };
    } else {
      widthImage = { ...this.defaultImage };
    }

    if (height < 500) {
      heightImage = { ...superTiny };
    } else if (height < 600) {
      heightImage = { ...tiny };
    } else if (height < 700) {
      heightImage = { ...small };
    } else if (height > 800) {
      heightImage = { ...large };
    } else {
      heightImage = { ...this.defaultImage };
    }

    if (widthImage.height > heightImage.height) {
      this.singleImage = heightImage;
    } else {
      this.singleImage = widthImage;
    }
  }

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

  onGridImageClick(index: number): void {
    this.currentIndex = index;
    this.singleView = true;

    const imageName = this.images[index]?.name || '';
    this.location.replaceState(this.buildImageUrl(imageName));
  }

  onSingleImageClick(): void {
    this.isOverlayOpen = true;
  }

  backClick(): void {
    this.singleView = false;

    this.location.replaceState(this.buildImageUrl(null));
  }

  private buildImageUrl(imageName: string | null): string {
    const queryParams = new URLSearchParams(window.location.search);

    if (imageName === null) {
      queryParams.delete('image');
    } else {
      queryParams.set('image', imageName);
    }

    return `${location.pathname}?${queryParams.toString()}`;
  }

}
