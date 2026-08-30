import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserAuthenticationsViewComponent } from './user-authentications-view';

describe('User', () => {
  let component: UserAuthenticationsViewComponent;
  let fixture: ComponentFixture<UserAuthenticationsViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAuthenticationsViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserAuthenticationsViewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
