import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChronicleYearsView } from './chronicle-years-view';

describe('ChronicleYearsView', () => {
  let component: ChronicleYearsView;
  let fixture: ComponentFixture<ChronicleYearsView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChronicleYearsView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChronicleYearsView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
