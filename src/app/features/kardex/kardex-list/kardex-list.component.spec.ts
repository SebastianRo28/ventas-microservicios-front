import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KardexListComponent } from './kardex-list.component';

describe('KardexListComponent', () => {
  let component: KardexListComponent;
  let fixture: ComponentFixture<KardexListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [KardexListComponent]
    });
    fixture = TestBed.createComponent(KardexListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
