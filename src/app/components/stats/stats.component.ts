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

  /** Years from the first project to the latest, 2010 to 2026 being 16; a single year still counts as 1. */
  readonly yearCount = computed(() => {
    const years = this.stats().years;
    return years.length > 0 ? Math.max(1, Number(years.at(-1)!.year) - Number(years[0].year)) : 0;
  });

  /** Years with at least one project; the data leaves out the quiet ones. */
  readonly activeYearCount = computed(() => this.stats().years.length);

  /** Every calendar year from the first project to the latest, quiet years included, for the years tile strip. */
  readonly yearStrip = computed<YearStat[]>(() => {
    const years = this.stats().years;
    if (years.length === 0) {
      return [];
    }

    const byYear = new Map(years.map(year => [year.year, year]));
    const first = Number(years[0].year);
    return Array.from({ length: Number(years.at(-1)!.year) - first + 1 }, (_, i) => {
      const year = String(first + i);
      return byYear.get(year) ?? { year, projects: 0, photos: 0 };
    });
  });

  stripLabel(year: YearStat): string {
    return year.projects > 0 ? `${year.year}: ${this.plural(year.projects, 'project')}` : `${year.year}: no projects`;
  }

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
