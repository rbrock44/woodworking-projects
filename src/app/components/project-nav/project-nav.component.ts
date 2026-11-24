import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AdjacentLinks, isPlainLeftClick, photoUrl, projectPath, SequenceLink } from '../../constant/project-url';
import { photoLabel } from '../../constant/constants';
import { Project } from '../../type/project.type';

/**
 * Previous and next under a project, or under a loose photo shown on its own: real links, so they prerender and open
 * in new tabs, while a plain click asks the app to swap the project or photo in place.
 */
@Component({
  selector: 'app-project-nav',
  imports: [NgTemplateOutlet],
  templateUrl: './project-nav.component.html',
  styleUrl: './project-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectNavComponent {
  readonly adjacent = input.required<AdjacentLinks>();
  readonly projectSelect = output<{ project: Project; year: string }>();
  readonly photoSelect = output<{ year: string; image: string }>();

  adjacentClick(event: MouseEvent, link: SequenceLink): void {
    if (!isPlainLeftClick(event)) {
      return;
    }

    event.preventDefault();
    if (link.kind === 'project') {
      this.projectSelect.emit({ project: link.project, year: link.year });
    } else {
      this.photoSelect.emit({ year: link.year, image: link.image.name });
    }
  }

  linkPath(link: SequenceLink): string {
    return link.kind === 'project' ? projectPath(link.year, link.project.name) : photoUrl(link.year, link.image.name);
  }

  linkName(link: SequenceLink): string {
    return link.kind === 'project' ? link.project.name : photoLabel(link.image, link.year);
  }

  linkKind(link: SequenceLink): string {
    return link.kind === 'project' ? 'Project' : 'Photo';
  }

  /** Says which kind the link leads to, since the badge alone is only seen: 'Next photo: Fox sketch, 2024'. */
  linkLabel(direction: 'Previous' | 'Next', link: SequenceLink): string {
    const noun = link.kind === 'project' ? 'project' : 'photo';
    return `${direction} ${noun}: ${this.linkName(link)}, ${link.year}`;
  }
}
