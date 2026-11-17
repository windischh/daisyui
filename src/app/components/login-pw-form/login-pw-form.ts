import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { GlobalFunctions } from '../../_globals/global-functions';

import { Provider } from '../../_db/provider'
;
import { ProviderType } from '../../_enums/provider-type.enum';

import { AuthenticationService } from '../../_services/authentication.service';
import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';

import { ErrorMessage } from '../../_validators/error-message';
import { ProviderService } from '../../_services/provider.service';

import { App } from '../../_enums/app.enum';

@Component({
  selector: 'dsy-login-pw-form',
  templateUrl: './login-pw-form.html',
  styleUrl: './login-pw-form.css',
  imports: [FormsModule, ReactiveFormsModule]
})
export class LoginPwFormComponent implements OnInit {

  public name = 'LoginPwFormComponent';

  // we use logi for diverse providers ...
  @Input({required: true}) loginProvider!: Provider;

  // after entering login data - which are stored in session.authorizations
  @Output() setLogin = new EventEmitter<{isNewLogin: boolean, isRememberLogin: boolean}>();

  thisForm: FormGroup;
  errors: { [key: string]: string } = {};
  thisFormErrorMessages!: ErrorMessage[];

  isRememberAnyway = false;

  constructor(
    private fb: FormBuilder,
    private logger: LogService,
    private message: MessageService,
    private providerService: ProviderService,
    public auth: AuthenticationService,
  ) {
    // we init the form to avoid errors. Content is set with the various setXxx functions
    this.thisForm = this.fb.group({});
  }

  ngOnInit() {

    // console.log('home-form  - we do not care for active session');
    this.loadErrorMessages();

    // we init the form to avoid errors. Content is set with the various setXxx functions
    this.initThisForm();
  }


  private loadErrorMessages(): void {
    this.thisFormErrorMessages = [
      new ErrorMessage('uniqueId.login', 'required', this.auth.txt['login']
      + ' ' + this.auth.txt['must_be_entered']),
      new ErrorMessage('uniqueId.login', 'minlength', this.auth.txt['login']
      + ' ' + this.auth.txt['must_have_at_least'] + ' 3 ' + this.auth.txt['positions_containing']),
      new ErrorMessage('uniqueId.login', 'maxlength', this.auth.txt['login']
      + ' ' + this.auth.txt['must_have_not_more'] + ' 50 ' + this.auth.txt['positions_containing']),
      new ErrorMessage('uniqueId.password', 'minlength', this.auth.txt['password']
      + ' ' + this.auth.txt['must_have_at_least'] + ' 6 ' + this.auth.txt['positions_containing']),
      new ErrorMessage('uniqueId.password', 'maxlength', this.auth.txt['password']
      + ' ' + this.auth.txt['must_have_not_more'] + ' 50 ' + this.auth.txt['positions_containing']),
      new ErrorMessage('uniqueId', 'loginExists',  this.auth.txt['login']
      + ' ' + this.auth.txt['must_exist'])
    ];
  }

   /**
   * form handling
   * initThisForm prepares form for update uniqueId (in case of new or updateUniqueId)
   *
   * if we allow updating uniqueId, the update button has to fire "setUniqueId()"
   */
  private initThisForm() {
    // find seesion authorizations
    const session = this.auth.getSession(this.name);
    let existingLogin = '';
    const ix = session?.authorizations?.findIndex(_ => _.providerId === this.loginProvider?.providerId);
    if (ix && ix >= 0) {
      existingLogin = session?.authorizations[ix].login ?? '';
    }
    // we remember anyway server login ...
    this.isRememberAnyway = this.loginProvider?.type === 2;
    this.thisForm = this.fb.group({
      uniqueId: this.fb.group( {
        login: [ existingLogin, [
          Validators.required,
          // TODO length according to provider rules
          Validators.minLength(3),
          Validators.maxLength(50)
          ]
        ],
        password: ['', [
          Validators.required,
          // TODO length according to provider rules
          Validators.minLength(6),
          Validators.maxLength(50)
          ]
        ],
        isRemember: [false]
      })
    });
    this.thisForm.statusChanges.subscribe(() => this.updateErrorMessages());
  }


  /** ------------------------  public methods --------------------------------------------------- */

  public async submitForm() {
    const login: string = this.thisForm.value.uniqueId.login;
    const password: string = this.thisForm.value.uniqueId.password;
    let isNewAuthorization = false;
    let newAuthorization = '';
    let oldLogin = '';
    let oldAuthorization = '';
    // build authorization string
    // public is not allowed as login - would conflict with /users/public ...
    if (this.loginProvider.type === ProviderType.server && login !== '' && login !== 'public' && password !== '') {
      newAuthorization = 'Basic ' + GlobalFunctions.base64Encode(login.trim() + ':' + password.trim());
      isNewAuthorization = true;
    }
    if (this.loginProvider.type === ProviderType.jira && login !== '' && password !== '') {
      // in case of jira passowrd is an API key
      const auth = 'Basic ' + GlobalFunctions.base64Encode('herbert.windisch.ops@gmail.com:A3Rp7dPnt2X04vAK9y4N3A5C')
      newAuthorization = 'Basic ' + GlobalFunctions.base64Encode(login.trim() + ':' + password.trim());
      isNewAuthorization = true;
    }
    if (this.loginProvider.type === ProviderType.immich && login !== '' && password !== '') {
      // in case ofimmich passowrd is an API key - stored directly as authorization
      newAuthorization = password.trim();
      isNewAuthorization = true;
    }
    // find seesion authorizations
    const session = this.auth.getSession(this.name);
    const ix = session?.authorizations?.findIndex(_ => _.providerId === this.loginProvider.providerId);
    if (session && ix && ix >= 0) {
      if (isNewAuthorization) {
        if (session.authorizations[ix].authorization === newAuthorization) {
          isNewAuthorization = false;
        } else if (session.authorizations[ix].authorization === '') {
          // we proceed with isNewAuthorization set above
        } else if (!confirm(this.auth.txt['reset_existing_authorization'])) {
          isNewAuthorization = false;
        } else {
          oldLogin = session.authorizations[ix].login;
          oldAuthorization = session.authorizations[ix].authorization;
        }
      }
    } else {
      // should not occur - authorization elements are created together with user issueProviders
      alert(this.auth.txt['provider_not_available']);
      isNewAuthorization = false;
    }
    if (session && ix && ix >= 0 && isNewAuthorization) {
      session.authorizations[ix].login = login;
      session.authorizations[ix].authorization = newAuthorization;
      this.auth.setSessionAuthorizations(session.authorizations, this.name);
      // we are in local mode or provider is not server - in this case there is no check procedure in header component, we must check login here
      if (session.app === App.local || this.loginProvider.type !== ProviderType.server) {
        const isLoginOk = await this.providerService.checkLogin(this.loginProvider.providerId, this.name);
        if (!isLoginOk) {
          // we must set session.authorization anyway before we call checkLogin cause there this is used for check ...
          session.authorizations[ix].login = oldLogin;
          session.authorizations[ix].authorization = oldAuthorization;
          this.auth.setSessionAuthorizations(session.authorizations, this.name);
        }
      }
      const isRememberLogin = this.thisForm.value.uniqueId.isRemember;
      this.setLogin.emit({isNewLogin: true, isRememberLogin});
    } else {
      this.setLogin.emit({isNewLogin: false, isRememberLogin: false});
    }
  }


  /** ---------------------------- form handling methods  ---------------------------------- */


  private updateErrorMessages() {
    this.errors = {};
    // console.log( ' we search this message', `${JSON.stringify(this.thisFormErrorMessages)}`);
    for (const message of this.thisFormErrorMessages) {
      const control = this.thisForm.get(message.forControl);
      // if (control) {console.log(`${message.forControl}` + ' errors:', `${JSON.stringify(control.errors)}`); }
      // if (control) {console.log(`${message.forControl}` + ' dirty', `${JSON.stringify(control.dirty)}`); }
      // if (control) {console.log(`${message.forControl}` + ' invalid', `${JSON.stringify(control.invalid)}`); }

     /**
      * we build errors key-value (in case of formGroup.formControl =>  formGroup_formControl)
      */
      if (control &&
          control.dirty &&
          control.invalid &&
          control.errors &&
          control.errors[message.forValidator] &&
          !this.errors[message.forControl.replace('.', '_')]) {
        // for testing:
        // console.log('control:', `${message.forControl}`, 'validator:', `${message.forValidator}`, `${message.text}`);
        this.errors[message.forControl.replace('.', '_')] = message.text;
      }
    }
  }


}

