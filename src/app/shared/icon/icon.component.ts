import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ICONS, IconEl } from './icons';

/** Renders a design-system line icon. Decorative (aria-hidden); label the parent control instead. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="nx-icon" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" [attr.stroke-width]="stroke" stroke-linecap="round" stroke-linejoin="round"
         aria-hidden="true" focusable="false">
      <ng-container *ngFor="let el of els" [ngSwitch]="el[0]">
        <path *ngSwitchCase="'path'" [attr.d]="el[1]['d']" />
        <circle *ngSwitchCase="'circle'" [attr.cx]="el[1]['cx']" [attr.cy]="el[1]['cy']" [attr.r]="el[1]['r']" />
        <rect *ngSwitchCase="'rect'" [attr.x]="el[1]['x']" [attr.y]="el[1]['y']" [attr.width]="el[1]['width']"
              [attr.height]="el[1]['height']" [attr.rx]="el[1]['rx']" />
      </ng-container>
    </svg>
  `
})
export class IconComponent {
  @Input() size: number | string = 20;
  @Input() stroke = 1.8;
  els: IconEl[] = [];

  @Input() set name(value: string) {
    this.els = ICONS[value] ?? [];
  }
}
