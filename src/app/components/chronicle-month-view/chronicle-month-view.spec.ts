import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChronicleMonthView } from './chronicle-month-view';

describe('ChronicleMonthView', () => {
  let component: ChronicleMonthView;
  let fixture: ComponentFixture<ChronicleMonthView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChronicleMonthView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChronicleMonthView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
