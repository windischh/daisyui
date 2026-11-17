import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginPwForm } from './login-pw-form';

describe('LoginPwForm', () => {
  let component: LoginPwForm;
  let fixture: ComponentFixture<LoginPwForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPwForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginPwForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
