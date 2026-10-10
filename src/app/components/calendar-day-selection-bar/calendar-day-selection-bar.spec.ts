import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarDaySelectionBar } from './calendar-day-selection-bar';

describe('CalendarDaySelectionBar', () => {
  let component: CalendarDaySelectionBar;
  let fixture: ComponentFixture<CalendarDaySelectionBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDaySelectionBar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarDaySelectionBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
