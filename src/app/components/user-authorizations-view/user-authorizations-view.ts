import { Component, EventEmitter, Input, Output} from '@angular/core';

import { ProviderType } from '../../_enums/provider-type.enum';

import { User } from '../../_db/user';
import { DatePipe } from '@angular/common';


@Component({
  selector: 'dsy-user-authorizations-view',
  imports: [DatePipe],
  templateUrl: './user-authorizations-view.html'
})
export class UserAuthorizationsViewComponent {

	public name = 'UserAuthorizationsViewComponent';

  IssueProviderType = ProviderType;

  @Input({required: true}) user!: User;
  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) usertxt!: { [key: string]: string };

  @Output() updateUser = new EventEmitter<User>();

  issueProviderType: typeof ProviderType = ProviderType;

  constructor() { }

  ngOnInit(): void {
  }

  public reset(i: number) {
    // in case of server mode, at web server login we reset only authorization (when entered again at checkLogin, it is automatically stored at user)
    if (this.user.authorizations[i].providerType === ProviderType.server) {
      this.user.authorizations[i].authorization = '';
    } else {
      this.user.authorizations[i].login = '';
      this.user.authorizations[i].authorization = '';
    }
    this.updateUser.emit(this.user);
  }


}
