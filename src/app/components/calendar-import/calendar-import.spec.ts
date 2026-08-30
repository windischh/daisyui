import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarImport } from './calendar-import';

describe('CalendarImport', () => {
  let component: CalendarImport;
  let fixture: ComponentFixture<CalendarImport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarImport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarImport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
