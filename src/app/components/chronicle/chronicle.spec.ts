import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChronicleComponent } from './chronicle';

describe('Chronicle', () => {
  let component: ChronicleComponent;
  let fixture: ComponentFixture<ChronicleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChronicleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChronicleComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
