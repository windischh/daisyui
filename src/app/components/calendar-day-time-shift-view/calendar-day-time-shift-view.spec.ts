import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarDayTimeShiftView } from './calendar-day-time-shift-view';

describe('CalendarDayTimeShiftView', () => {
  let component: CalendarDayTimeShiftView;
  let fixture: ComponentFixture<CalendarDayTimeShiftView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDayTimeShiftView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarDayTimeShiftView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
