import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarDayTimeChange } from './calendar-day-time-change';

describe('CalendarDayTimeChange', () => {
  let component: CalendarDayTimeChange;
  let fixture: ComponentFixture<CalendarDayTimeChange>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDayTimeChange]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarDayTimeChange);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
