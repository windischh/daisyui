import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarDayContactsView } from './calendar-day-contacts-view';

describe('CalendarDayContactsView', () => {
  let component: CalendarDayContactsView;
  let fixture: ComponentFixture<CalendarDayContactsView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDayContactsView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarDayContactsView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
