import { Component, EventEmitter, Inject, Input, LOCALE_ID, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { User } from '../../_db/user';
import { UserFactory } from '../../_db/user-factory';

import { UserService } from '../../_services/user.service';

import { UserValidators } from '../../_validators/user.validators';
import { ErrorMessage } from '../../_validators/error-message';


@Component({
  selector: 'dsy-user-form-view',
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './user-form-view.html'
})
export class UserFormViewComponent {

	public name = 'UserFormViewComponent';

  @Input({required: true}) user: User | null = null;
  // formAction - show, insert, update
  @Input({required: true}) formAction!: string;
  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) usertxt!: { [key: string]: string };

  @Output() updateUser = new EventEmitter<User>();
  @Output() newUser = new EventEmitter<User>();
  @Output() userFormClose = new EventEmitter();

  thisForm: FormGroup;
  errors: { [key: string]: string } = {};
  thisFormErrorMessages!: ErrorMessage[];

  isMaint = false;
  isNew = false;
  isClone = false; // we do not allow cloning of users
  isUpdateUniqueId = false;
  isUpdateHdr = false;
  isUpdateFtr = false;


  constructor(@Inject(LOCALE_ID) public locale: string,
    private fb: FormBuilder,
    private userService: UserService
  ) {
    // we init the form to avoid errors. Content is set with the various setXxx functions
    this.thisForm = this.fb.group({});
  }

  ngOnInit(): void {
    switch (this.formAction) {
      case 'show':
        // isMaint is false per default
        break;

      case 'maint':
        if (this.user) {
          this.isMaint = true;
        }
        break;

      case 'new':
        this.isNew = true;
        break;

      default:
        break;
    }
    this.loadErrorMessages();
    // we init the form to avoid errors. Content is set with the various setXxx functions
    this.initThisForm();
  }

  private loadErrorMessages(): void {
    this.thisFormErrorMessages = [
      new ErrorMessage('uniqueId.userName', 'required', this.usertxt['userName']
      + ' ' + this.txt['must_be_entered']),
      new ErrorMessage('uniqueId', 'userNameExists',  this.usertxt['className'] + ' ' + this.txt['with']
      + ' ' + this.usertxt['userName'] + ' ' + this.txt['already_exists'])
    ];

  }

  private initChoices() {

  }


  /**
    * form handling
    * initThisForm prepares form for update uniqueId (in case of new or updateUniqueId)
    *
    * if we allow updating uniqueId, the update button has to fire "setUniqueId()"
    */
  private initThisForm() {
    this.thisForm = this.fb.group({
      uniqueId: this.fb.group({
        userName:  [this.user?.userName, [
          Validators.required
          ]
        ]
      },
      {
        validator:  [
          UserValidators.userNameExists(this.userService, this.user?.userName ?? '')
          ]
      })
    });

    this.thisForm.statusChanges.subscribe(() => this.updateErrorMessages());

  }

  /** ------------------------  public methods --------------------------------------------------- */


  public return() {
    this.userFormClose.emit();
  }

  public async setUniqueId() {
    if (this.isMaint) {
      this.isUpdateUniqueId  = true;
      this.initThisForm();
    }
  }

  public async setUniqueIdClone() {
    if (this.isMaint) {
      this.isClone = true;
      this.initThisForm();
    }
  }

  public async setHeader() {
    if (this.isMaint) {
      this.isUpdateHdr = true;
      this.thisForm = this.fb.group({
        hdrGroup: this.fb.group({
          dummy: ['']
        })
      });
      this.thisForm.statusChanges.subscribe(() => this.updateErrorMessages());
    }
  }

  public async setFooter() {
    if (this.isMaint) {
      this.isUpdateFtr = true;
      this.thisForm = this.fb.group({
        ftrGroup: this.fb.group({
          dummy: ['']
        })
      });

      this.thisForm.statusChanges.subscribe(() => this.updateErrorMessages());
    }
  }


  public async submitForm() {
    // depending on isUpdate we process the updates
    // cloning is not possible in the moment ...
    if (this.isNew || this.isClone) {
      let user = UserFactory.empty();
      user.userName = this.thisForm.value.uniqueId.userName;
      this.newUser.emit(user);
    } else if (this.isUpdateUniqueId && this.user) {
      if (this.thisForm.value.uniqueId.userName !== '') {
        this.user.userName = this.thisForm.value.uniqueId.userName;
        this.updateUser.emit(this.user);
      }
    } else if (this.isUpdateHdr && this.user) {
      this.updateUser.emit(this.user);
    } else if (this.isUpdateFtr) {

    }
    this.cancelUpdates();
  }

  public cancelUpdates(): void {
    this.isNew = false;
    this.isClone = false;
    this.isUpdateUniqueId = false;
    this.isUpdateHdr = false;
    this.isUpdateFtr = false;
    this.errors = {};
  }

  /**
    * defining form update status as function, depending on single update flags
    */
  public isUpdate(): boolean {return (this.isNew || this.isClone || this.isUpdateUniqueId || this.isUpdateHdr || this.isUpdateFtr);
  }

   /** ---------------------------- form handling methods  ---------------------------------- */


   /**
     * update form error messages
     */
   private updateErrorMessages() {
     this.errors = {};
     for (const message of this.thisFormErrorMessages) {
       const control = this.thisForm.get(message.forControl);
       /**
       * we build errors key-value
       */
       if (control &&
           control.dirty &&
           control.invalid &&
           control.errors &&
           control.errors[message.forValidator] &&
           !this.errors[message.forControl]) {
         this.errors[message.forControl]  = message.text;
       }
     }
   }

}
