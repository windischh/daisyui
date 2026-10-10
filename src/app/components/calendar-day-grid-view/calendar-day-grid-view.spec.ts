import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarDayGridView } from './calendar-day-grid-view';

describe('CalendarDayGridView', () => {
  let component: CalendarDayGridView;
  let fixture: ComponentFixture<CalendarDayGridView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDayGridView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarDayGridView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
