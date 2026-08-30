import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuCompleteComponent } from './menu-complete';

describe('MenuComplete', () => {
  let component: MenuCompleteComponent;
  let fixture: ComponentFixture<MenuCompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuCompleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuCompleteComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
