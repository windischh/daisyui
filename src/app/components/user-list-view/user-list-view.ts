import { Component, EventEmitter, Input, Output } from '@angular/core';

import { User } from '../../_db/user';
import { UserAuthorizationsViewComponent } from '../user-authorizations-view/user-authorizations-view';
import { DatePipe } from '@angular/common';



@Component({
  selector: 'dsy-user-list-view',
  imports: [UserAuthorizationsViewComponent, DatePipe],
  templateUrl: './user-list-view.html'
})
export class UserListViewComponent {

  public name = 'UserListViewComponent';

  @Input({required: true}) userId!: number;
  @Input({required: true}) users!: Array<User>;
  // isMaint - true if updating is allowed
  @Input({required: true}) isMaint!: boolean;
  // isCreate - true if creating of new user is allowed
  @Input({required: true}) isCreate!: boolean;
  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) usertxt!: { [key: string]: string };

  @Output() userListClose = new EventEmitter();
  @Output() userInsert = new EventEmitter();
  @Output() userSelect = new EventEmitter<number>();
  @Output() userShow = new EventEmitter<number>();
  @Output() userMaint = new EventEmitter<number>();
  @Output() userDisable = new EventEmitter<number>();
  @Output() updateUser = new EventEmitter<User>();


  constructor() { }

  ngOnInit(): void {
  }

  /** --------------------------  public methods -------------------------------------------- */


  // not needed in the moment ...
  public return() {
    this.userListClose.emit();
  }

  public insert() {
    this.userInsert.emit();
  }

  public select(i: number) {
    this.userSelect.emit(this.users[i].userId);
  }

  public show(i: number) {
    this.userShow.emit(this.users[i].userId);
  }

  public maint(i: number) {
    this.userMaint.emit(this.users[i].userId);
  }

  public disable(i: number) {
    this.userDisable.emit(this.users[i].userId);
  }

  public showAuthorizations(i: number) {
    if (this.users[i]['isShowAuthorizations']) {
      this.users[i]['isShowAuthorizations'] = false;
    } else {
      this.users[i]['isShowAuthorizations'] = true;
    }
  }

  /** ------------------------------ user-authorizations-view ------------------------- */

  public userUpdate(user: User) {
    this.updateUser.emit(user);
  }

}
