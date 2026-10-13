import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ProjectsByYear } from '../../type/project.type';
import { isPlainLeftClick, ProjectLink, projectPath } from '../../constant/project-url';
import { formatDays, shopStats, YearStat } from '../../constant/stats';

/** The stats page: totals, projects per year, and the standout projects, each linking to its page. */
@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './stats.component.scss'
})
export class StatsComponent {
  readonly projectsByYear = input<ProjectsByYear[]>([]);
  readonly projectSelect = output<ProjectLink>();

  readonly stats = computed(() => shopStats(this.projectsByYear()));
  private readonly maxProjects = computed(() => Math.max(1, ...this.stats().years.map(year => year.projects)));

  readonly yearSpan = computed(() => {
    const years = this.stats().years;
    return years.length > 0 ? `${years[0].year} – ${years.at(-1)!.year}` : '';
  });

  barWidth(year: YearStat): number {
    return (year.projects / this.maxProjects()) * 100;
  }

  barLabel(year: YearStat): string {
    return `${year.year}: ${this.plural(year.projects, 'project')}, ${this.plural(year.photos, 'photo')}`;
  }

  plural(count: number, noun: string): string {
    return `${count} ${noun}${count === 1 ? '' : 's'}`;
  }

  days(days: number): string {
    return formatDays(days);
  }

  linkPath(link: ProjectLink): string {
    return projectPath(link.year, link.project.name);
  }

  linkClick(event: MouseEvent, link: ProjectLink): void {
    if (isPlainLeftClick(event)) {
      event.preventDefault();
      this.projectSelect.emit(link);
    }
  }
}
