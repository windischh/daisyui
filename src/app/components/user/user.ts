import { Component, EventEmitter, Inject, Input, LOCALE_ID, Output, signal } from '@angular/core';

import { GlobalFunctions } from '../../_globals/global-functions';

import { User } from '../../_db/user';
import { UserFactory } from '../../_db/user-factory';

import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { UserService } from '../../_services/user.service';
import { ProviderService } from '../../_services/provider.service';
import { AuthenticationService } from '../../_services/authentication.service';
import { UserListViewComponent } from '../user-list-view/user-list-view';
import { UserFormViewComponent } from '../user-form-view/user-form-view';



/**
 * User component
 *  container of user-list-view and user-form-view
 *  userComponentUsage:
 *  'form'
 *   user-form-view is activated
 *  'list'
 *   user-list-view is activated
 *   user-list-view can also trigger user-form-view for a selected element of user list
 *   (in this case user of this component is changed)
 *  "first"
 *  activates form for creation of first ("unknown") user
 */
@Component({
  selector: 'dsy-user',
  imports: [UserListViewComponent, UserFormViewComponent],
  templateUrl: './user.html',
  styleUrl: './user.css',
})
export class UserComponent {

	public name = 'UserComponent';

  // userId triggers user for user-form - if userId is 0, a new user can be created in case of isCreate
  @Input({required: true}) userId!: number;
  // userComponentUsage: 'foem' or 'list' - the leading view of this component
  @Input({required: true}) userComponentUsage!: string;
  // isMaint true - user-list and user-form should allow data maintenance
  @Input({required: true}) isMaint!: boolean;
  // isCreate true - user-list and user-form should allow creation of new user
  @Input({required: true}) isCreate!: boolean;

  @Output() userSelect = new EventEmitter<number>();
  @Output() userSetLink = new EventEmitter<number>();
  @Output() userUpdated = new EventEmitter<number>();
  @Output() userClose = new EventEmitter();

  // user for maintenance or show form - if null, and isMaint is true, user-form switches to isNew mode
  public user: User | null = null;

  // db texts
  public usertxt: { [key: string]: string } = {};

  // users from db (= local storage)
  public users: Array<User> = [];

  // refresh signal triggers change detection
  // signal value   0 - no data loaded   1 - data loded
  public refreshSignal = signal(0);

  // isShowList must be true to show list
  public isShowList!: boolean;
  // isShowForm shows form independent from leading component
  public isShowForm!: boolean;

  // defines action on user.form - must be set if isShowForm is true
  public formAction!: string;

constructor(@Inject(LOCALE_ID) public locale: string,
    private logger: LogService,
    private message: MessageService,
    private userService: UserService,
    private providerService: ProviderService,
    public auth: AuthenticationService) { }

  async ngOnInit() {
    switch (this.userComponentUsage) {
      case 'first':
        this.isShowForm = true;
        this.isShowList = false;
        this.formAction = this.isMaint ? 'maint' : 'show'
        break;

      case 'form':
        this.isShowForm = true;
        this.isShowList = false;
        this.formAction = this.isCreate ? 'new' : this.isMaint ? 'maint' : 'show'
        break;

      case 'list':
        this.isShowForm = false;
        this.isShowList = true;
        break;

      default:
        break;
    }
    await this.sessionActivate();
  }

  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    await this.auth.activateSession(this.name);
    // session should be active - time is actualized
    if (this.auth.isSessionActive()) {
      this.refreshSignal.set(0);
      this.loadDbTexts();
      this.getUser();
      this.getUsers();
      this.refreshSignal.set(1);
    } else {
      // session could not be activated - duration exhausted
      this.message.info(this.name +` session must be restarted`);
      this.logger.info(this.auth.getSession(this.name), this.name, `session must be restarted`);
      this.userClose.emit();
    }
  }

  private loadDbTexts(): void {
    const session = this.auth.getSession(this.name);
    // default language according to application internal language coding (language enum)
    const language = session && session.language ? session.language : GlobalFunctions.getDefaultLanguage(this.locale);
    const user = UserFactory.empty();
    this.usertxt = GlobalFunctions.objText(user,
      'User', this.auth.systemTexts, language,  this.name);
  }

  private getUser() {
    if (this.userId > 0) {
      this.user = this.userService.getUser(this.userId, this.name);
    }
  }

  private getUsers() {
    const users = this.userService.getUsers(this.name);
    const session = this.auth.getSession(this.name);
    if (this.isCreate) {
      this.users = users.filter(_ => _.type > 0  && _.status < 9 );
    } else {
      // isCreate is trigger to see other users - if it is not true, we see only actual user
      this.users = this.user ? [this.user] : [];
    }

    for (let user of this.users) {
      for (let authorization of user.authorizations) {
        const provider = this.providerService.getProvider(user.userId, authorization.providerId, this.name);
        if (provider) {
          authorization['issueProviderName'] = provider.providerName;
          authorization['issueProviderType'] = provider.type;
        }
      }
    }
  }

 /** --------------------------  public methods -------------------------------------------- */

  public return() {
    this.userClose.emit();
  }


  /** ------------------------------ user-list-view ------------------------- */


  public closeUserList() {
    this.isShowList = false;
    if (this.userComponentUsage === 'list') {
      this.userClose.emit();
    }
  }

  public insertUser() {
    this.formAction = 'new';
    this.user = null;
    this.isShowList = false;
    this.isShowForm = true;
  }

  public selectUser(userId: number) {
    this.userSelect.emit(userId);
  }

  public setLinkedUser(userId: number) {
    this.userSetLink.emit(userId);
  }

  public showUser(userId: number) {
    this.formAction = 'show';
    this.user = this.users.find(_ => _.userId === userId) ?? null;
    this.isShowList = false;
    this.isShowForm = true;
  }

  public maintUser(userId: number) {
    this.formAction = 'maint';
    this.user = this.users.find(_ => _.userId === userId) ?? null;
    this.isShowList = false;
    this.isShowForm = true;
  }

  // disable is not possible if user has
  // - not exported current issues
  // - not exported current works
  // - not stored works at issue provider ...
  // is checked by userService
  public disableUser(userId: number) {
    if (userId > 0) {
      if (this.userService.isUserDeleteable(userId, this.name)) {
        if (confirm(this.auth.txt['user_disable'] + '?')) {
          if (this.userService.disableUser(userId, this.name)) {
            // ok
          } else {
            alert(this.auth.txt['disable_failed']);
          }
          this.getUsers();
        }
      } else {
        alert(this.auth.txt['disable_not_possible']);
      }

    }

  }

  /** ------------------------------ user-authorizations-view ------------------------- */
  /** ------------------------------ user-form-view ------------------------- */

  public userUpdate(user: User) {
    const userId = user.userId;
    if (user && user.userName !== '' && userId > 0) {
      const formerUser = this.userService.getUser(userId, this.name);
      const session = this.auth.getSession(this.name);
      if (formerUser && session && session.userId === userId) {
        user.authorizations.forEach(_ => {
          const ix = formerUser.authorizations.findIndex(userAuth =>
            _.providerId === userAuth.providerId && _.authorization !== userAuth.authorization);
          // authorization was reset - we reset authorization also in session ,,,
          if (ix >= 0 ) {
            const authorizations = session.authorizations;
            const iy = authorizations.findIndex(auth =>
              auth.providerId === formerUser.authorizations[ix].providerId && auth.login === formerUser.authorizations[ix].login);
            // login in session is equal to former user login
            if (iy >= 0) {
              // we reset session authorization
              authorizations[iy].authorization = '';
              this.auth.setSessionAuthorizations(authorizations, this.name);
            }
          }
        })
      }
      if (this.userService.setUser(userId, user, this.name)) {
        this.user = this.userService.getUser(userId, this.name);
        this.getUsers();
      }
      // if session user is updated, we select user again to put actual data into session
      if (session?.userId === userId) {
        this.userUpdated.emit(userId);
      }
    }

  }

  /** ------------------------------ user-form-view ------------------------- */

  public async userCreate(user: User) {
    this.isShowForm === false;
    if (user && user.userName !== '') {
      const userId = await this.userService.createUser(user, this.name);
      if (userId > 0) {
        this.user = this.userService.getUser(userId, this.name);
        await this.userService.buildUserData(userId, this.name);
      }
    }
    // refresh user list
    this.getUsers();
    if (this.userComponentUsage === 'form') {
      this.isShowForm = true;
    }

  }


  public closeUserForm() {
    this.isShowForm === false;
    if (this.userComponentUsage === 'form') {
      this.userClose.emit();
    } else {
      this.isShowList = true;
      this.isShowForm = false;
    }
  }

}
