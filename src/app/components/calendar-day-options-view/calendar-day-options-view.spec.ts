import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarDayOptionsView } from './calendar-day-options-view';

describe('CalendarDayOptionsView', () => {
  let component: CalendarDayOptionsView;
  let fixture: ComponentFixture<CalendarDayOptionsView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDayOptionsView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarDayOptionsView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
