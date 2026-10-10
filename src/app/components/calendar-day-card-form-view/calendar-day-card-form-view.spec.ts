import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarDayCardFormView } from './calendar-day-card-form-view';

describe('CalendarDayCardFormView', () => {
  let component: CalendarDayCardFormView;
  let fixture: ComponentFixture<CalendarDayCardFormView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDayCardFormView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarDayCardFormView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
