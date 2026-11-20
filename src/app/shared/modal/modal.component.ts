import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

let nextId = 0;

/** Centered modal (design DS-04). Body is projected; footer via `[modal-footer]`. */
@Component({
  selector: 'app-modal',
  template: `
    <div class="nx-modal-host">
      <button type="button" class="nx-scrim nx-scrim--modal" aria-label="Cerrar" tabindex="-1" (click)="closed.emit()"></button>
      <div class="nx-modal" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId" [style.width]="width">
        <div class="nx-modal__head">
          <h2 [id]="titleId">{{ title }}</h2>
          <button type="button" class="nx-icon-btn nx-icon-btn--ghost" aria-label="Cerrar" (click)="closed.emit()">
            <app-icon name="x"></app-icon>
          </button>
        </div>
        <div class="nx-modal__body"><ng-content></ng-content></div>
        <div class="nx-modal__foot"><ng-content select="[modal-footer]"></ng-content></div>
      </div>
    </div>
  `
})
export class ModalComponent implements AfterViewInit {
  @Input() title = '';
  @Input() width = '680px';
  @Output() closed = new EventEmitter<void>();
  readonly titleId = `nx-modal-title-${nextId++}`;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    const first = this.el.nativeElement.querySelector<HTMLElement>('.nx-modal__body input, .nx-modal__body select, .nx-modal__body textarea');
    first?.focus();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closed.emit(); }
}
