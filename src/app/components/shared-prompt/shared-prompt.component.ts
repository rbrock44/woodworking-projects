import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Asks before a share link's favorites join this browser's own, sitting over them so they can be looked at first. */
@Component({
  selector: 'app-shared-prompt',
  templateUrl: './shared-prompt.component.html',
  styleUrl: './shared-prompt.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedPromptComponent {
  /** Names both kinds: '1 project and 2 photos'. */
  readonly summary = input.required<string>();
  /** How many aren't favorites here yet. */
  readonly newCount = input.required<number>();
  readonly dismiss = output<void>();
  readonly add = output<void>();
}
