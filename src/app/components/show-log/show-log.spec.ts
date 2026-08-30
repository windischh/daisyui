import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowLogComponent } from './show-log';

describe('ShowLog', () => {
  let component: ShowLogComponent;
  let fixture: ComponentFixture<ShowLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowLogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShowLogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
