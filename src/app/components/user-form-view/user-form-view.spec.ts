import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserFormViewComponent } from './user-form-view';

describe('User', () => {
  let component: UserFormViewComponent;
  let fixture: ComponentFixture<UserFormViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserFormViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserFormViewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
