import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarDayWeekView } from './calendar-day-week-view';

describe('CalendarDayWeekView', () => {
  let component: CalendarDayWeekView;
  let fixture: ComponentFixture<CalendarDayWeekView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDayWeekView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarDayWeekView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
