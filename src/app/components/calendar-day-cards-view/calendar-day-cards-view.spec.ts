import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarDayCardsView } from './calendar-day-cards-view';

describe('CalendarDayCardsView', () => {
  let component: CalendarDayCardsView;
  let fixture: ComponentFixture<CalendarDayCardsView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDayCardsView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarDayCardsView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
