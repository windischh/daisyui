import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserListViewComponent } from './user-list-view';

describe('User', () => {
  let component: UserListViewComponent;
  let fixture: ComponentFixture<UserListViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserListViewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
