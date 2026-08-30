import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarExportComponent } from './calendar-export';

describe('CalendarExport', () => {
  let component: CalendarExportComponent;
  let fixture: ComponentFixture<CalendarExportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarExportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarExportComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
