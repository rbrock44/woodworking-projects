import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Project } from '../../type/project.type';

/**
 * What's open above the photos: its year, and for a real project its name with the whole project's favorite pill,
 * when it was built and its description. A year, All or Favorites view has no name, so only the year shows.
 */
@Component({
  selector: 'app-project-meta',
  templateUrl: './project-meta.component.html',
  styleUrl: './project-meta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectMetaComponent {
  readonly year = input.required<string>();
  readonly project = input.required<Project>();
  readonly monthRange = input<string | null>(null);
  /** The open project's own favorite state; false for a view with no name. */
  readonly isFavorite = input(false);
  readonly favoriteToggle = output<void>();
}
