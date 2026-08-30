import { Component, ElementRef, HostListener, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from "@angular/router";

import { environment } from '../../../environments/environment';

import { GlobalFunctions } from '../../_globals/global-functions';

import { Menu } from '../../_db/menu';
import { MenuFactory } from '../../_db/menu-factory';

import { IView } from '../../_interfaces/i-view';

// import { SwUpdateService } from '../../_services/sw-update.service';
import { LogService } from '../../_services/log.service';
import { MessageService } from '../../_services/message.service';
import { UserService } from '../../_services/user.service';
import { AuthenticationService } from '../../_services/authentication.service';


import { CalendarComponent } from "../calendar/calendar";
import { DocumentComponent } from "../document/document";
import { UserComponent } from '../user/user';
import { MessagesComponent } from '../messages/messages';
import { MenuCompleteComponent } from '../menu-complete/menu-complete';
import { MenuItemFactory } from '../../_db/menu-item-factory';
import { NgClass } from '@angular/common';




@Component({
  selector: 'dsy-header',
  imports: [MessagesComponent, MenuCompleteComponent, CalendarComponent, UserComponent, RouterOutlet, NgClass],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent {

  public name = 'HeaderComponent';

  // for using Math.floor in html template
  public Math: Math = Math;

  public GlobalFunctions: typeof GlobalFunctions = GlobalFunctions;

   // session user data which are used in template
  public userId!: number;
  public userName!: string;

  // header child components
  c: { [key: string]: IView } = {};
  // each c entry references to array element (= child object) - isSelectable elements are shown in function selection
  childComponents: Array<IView> = [
  // all components which are sub components with @Input and @Output are managed here ...
  {name: 'user', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: false},
  {name: 'login-form', displayName: '', isSelected: false, isAutoSelected: false, isSelectable: false},
  {name: 'calendar', displayName:  '', isSelected: false, isAutoSelected: false, isSelectable: true}
  ];

  // a selected (therefore selectable) component which is unselected by another select or autoselect
  formerComponent: string | undefined;

  // isShowEvent is a flag for calendarDay component to activate card-form with event with eventId
  public isShowEvent = false;
  public eventId: number | undefined;

  // refresh signal triggers change detection
  // signal value   0 - no data loaded   1 - data loded
  public refreshSignal = signal(0);

  // we show "data loading ..." if isDirectoryDataLoading is true
  public isDirectoryDataLoading = false;

  public isCreateUser = false;

  public popupHeaderText = '';
  public popupContentText = '';
  public popupConfirmText = '';
  @ViewChild('popupDialog') dialogRef!: ElementRef<HTMLDialogElement>; 
  openPopup() { this.dialogRef.nativeElement.showModal(); };
  closePopup() { this.dialogRef.nativeElement.close(); } 
  // triggers class for  confirm button
  public isPopupPositive = true;

  // router menu in header is built in component
  public routerMenu: Menu = MenuFactory.empty();

  // handles session changes in child components for reload of menus with lastMenuId
  public menuLoadCounter = 0;
  public lastMenuId = 0;

  // handles changes which trigger reload of calendar component
  public calendarLoadCounter = 0;

  // session data are actualized - components can be shown
  public isSessionReady = false;

  public isMessageActive = environment.userMessages;

  public environment = environment.userEnvironmentInfo;

  /* ----------- Neispiel2 --------------------------*/

  public isBeispiel2MenuVisible = false;

  public isBeispiel3NavbarWhite = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    // private swUpdateService: SwUpdateService,
    private logger: LogService,
    private message: MessageService,
    // private immichService: ImmichService,
    // private contactService: ContactService,
    private userService: UserService,
    public auth: AuthenticationService) {
      this.childComponents.forEach(_ => {this.c[_.name] = _;});
    }

  async ngOnInit() {
    if (this.route.snapshot.url.toString().substring(0, 6).toLowerCase() === 'server') {
      sessionStorage.setItem('appParams', JSON.stringify(this.route.snapshot.params));
      // if component was entered via app itself, it is now reloaded with url /header ...
      this.router.navigate(['../header'], { relativeTo: this.route.parent });
    } else if (this.route.snapshot.url.toString().substring(0, 7).toLowerCase() === 'restart') {
      this.router.navigate(['../header'], { relativeTo: this.route.parent });
    } else {
      await this.sessionActivate();
    }
  }

  // check session at init & before submitting any http transaction in this component
  private async sessionActivate() {
    // before session activation we check service worker updates ..
    // TODO activate later
    // await this.checkSwUpdate();
    const isReleaseOk = await this.auth.checkRelease(this.name);
    if (isReleaseOk) {
      await this.auth.activateSession(this.name);
      // session should be active - time is actualized
      if (this.auth.isSessionActive()) {
        await this.processParams();
        await this.buildRouterMenu();
        this.isSessionReady = true;
        this.refreshSignal.set(1);
        this.logger.info(this.auth.getSession(this.name), this.name, `daisytest header - session activated`);
        // this.message.info(this.name +` testmesssage`);
      } else {
        this.logger.info(this.auth.getSession(this.name), this.name, `daisytest header - session must be restarted`);
        alert(this.auth.txt['session_timed_out__restart'] ?? 'session_timed_out__restart');
        // we refresh by setting same session user as before ..
        const session = this.auth.getSession(this.name);
        const userId = session?.userId ?? 0;
        const nop = await this.auth.newSessionUser(userId, this.name);
        this.refreshSignal.set(1);
        this.message.info(this.name +` session restarted`);
        this.logger.info(this.auth.getSession(this.name), this.name, `session restarted`);
        this.router.navigate(['../restart'], { relativeTo: this.route.parent });
      }
    } else {
      alert ('release: ' + GlobalFunctions.release.toString() + ' not found - clear browser cache ...');
    }
  }


  /** --------------------------  private methods -------------------------------------------- */

  /**
   * which component - of child components - is selected
   * @returns name of selected component
   */
  private componentSelected(): string {
    let selected = ''
    this.childComponents.forEach(_ => {
      if (_.isSelected) {
        selected = _.name;
      }
    });
    return selected;
  }

  /**
   * which component - of child components - is auto selected
   * @returns name of selected component
   */
   private componentAutoSelected(): string {
    let selected = ''
    this.childComponents.forEach(_ => {
      if (_.isAutoSelected) {
        selected = _.name;
      }
    });
    return selected;
  }

  private async processParams() {
    const paramString = sessionStorage.getItem('appParams');
    // console.log ('paramString: ', paramString);
    let params: {[key: string]: any} | undefined;
    if (paramString && paramString !== '') {
      params = JSON.parse(paramString);
    }
    const session = this.auth.getSession(this.name);
    // component calendar will be activated by show eventId
    if (params && Number(params['eventId']) >= 0) {
      this.eventId = Number(params['eventId']);
      this.isShowEvent = true;
      this.calendarLoadCounter++;
    }
    this.userId = session?.userId ?? 0;
    this.userName = session?.userName ?? '';
    // params are deleted from session storage - they are processed only at first call ....
    sessionStorage.removeItem('appParams');
  }

  /* mot active in the moment
  private async checkSwUpdate() {
    const isSwEnabled = this.swUpdateService.isSwEnabled();
    if (isSwEnabled) {
      console.log ('service worker active - version type: ', this.swUpdateService.swWorkType);
      // in case of online and new version available we will reload to get new version
      if (this.swUpdateService.isVersionReady) {
        alert('reload application - new version available');
        this.swUpdateService.versionUpdate();
      } else {
        await this.swUpdateService.checkForUpdate();
      }
    }
  }
  */



  /**
   * buildRoterMenus
   * build menu elements for router children
   *
   * ATTN: item.text elements are translated to auth.txt in html template ....
   */
   private async buildRouterMenu() {

    // not necessary - buildRouterMenu is only called by sessionActivate ...
    // if (!this.auth.isSessionActive()) { await this.sessionActivate() };
    this.routerMenu = MenuFactory.empty();
    this.routerMenu.text = 'main_choice';

    const session = this.auth.getSession(this.name);
    let item = MenuItemFactory.empty();

    item.hasIconLeft = true;
    item.iconClassLeft = 'fas fa-info';
    item.text = 'status';
    item.link = 'status';
    this.routerMenu.items.push(item);

    item = MenuItemFactory.empty();
    item.hasIconLeft = true;
    item.iconClassLeft = 'far fa-file-image'
    item.text = 'chronicle';
    item.link = 'chronicle';
    this.routerMenu.items.push(item);

    // TODO check if we have a document provider login ...
    if (true) {
      item = MenuItemFactory.empty();
      item.hasIconLeft = true;
      item.iconClassLeft = 'far fa-file text-lg bg-error'
      item.text = 'documents';
      item.description = 'show the documents';
      item.link = 'document';
      this.routerMenu.items.push(item);
    }

    item = MenuItemFactory.empty();
    item.hasIconLeft = true;
    item.iconClassLeft = '<i class="fa-solid fa-calendar-days"></i>';
    item.text = 'work_day_calendar';
    item.link = 'work-day';
    item.hasLabelRight = true;
    item.labelClassRight = 'badge badge-soft badge-error';
    item.labelTextRight = 'Datenverlust!';
    this.routerMenu.items.push(item);


    item = MenuItemFactory.empty();
    item.hasIconLeft = true;
    item.iconClassLeft = 'fas fa-list'
    item.text = 'event_list';
    item.link = 'work';
    this.routerMenu.items.push(item);

    item = MenuItemFactory.empty();
    item.hasIconLeft = true;
    item.iconClassLeft = 'fas fa-user'
    item.text = 'contacts';
    item.link = 'contact';
    this.routerMenu.items.push(item);

    item = MenuItemFactory.empty();
    item.text = 'import';
    item.hasIconLeft = true;
    item.iconClassLeft = 'fas fa-file-import';
    let subMenu = MenuFactory.empty();
    let subItem = MenuItemFactory.empty();

    subItem = MenuItemFactory.empty();
    subItem.text = 'calendar_import';
    subItem.link = 'calendarImport';
    subItem.hasIconLeft = true;
    subItem.iconClassLeft = 'fas fa-file-import';
    subMenu.items.push(subItem);

    subItem = MenuItemFactory.empty();
    subItem.text = 'contact_import';
    subItem.link = 'contactImport';
    subItem.hasIconLeft = true;
    subItem.iconClassLeft = 'fas fa-file-import';
    subMenu.items.push(subItem);


    item.hasSubMenu = true;
    item.subMenu = subMenu;
    item.isSubMenuLeft = true;
    this.routerMenu.items.push(item);

    item = MenuItemFactory.empty();
    item.text = 'export';
    item.hasIconLeft = true;
    item.iconClassLeft = 'fas fa-file-export';
    subMenu = MenuFactory.empty();

    subItem = MenuItemFactory.empty();
    subItem.text = 'contactsExport'
    subItem.link = 'customerExport';
    subItem.hasIconLeft = true;
    subItem.iconClassLeft = 'fas fa-file-export';
    subMenu.items.push(subItem);

    subItem = MenuItemFactory.empty();
    subItem.text = 'calendar_export'
    subItem.link = 'calendarExport';
    subItem.hasIconLeft = true;
    subItem.iconClassLeft = 'fas fa-file-export';
    subMenu.items.push(subItem);

    item.hasSubMenu = true;
    item.subMenu = subMenu;
    this.routerMenu.items.push(item);


  // admin functions - configuration, show log are avaiable anyway

    item = MenuItemFactory.empty();
    item.hasIconLeft = true;
    item.iconClassLeft = 'fas fa-cog'
    item.text = 'configuration';
    item.link = 'configuration';
    this.routerMenu.items.push(item);

    item = MenuItemFactory.empty();
    item.hasIconLeft = true;
    item.iconClassLeft = 'fas fa-list'
    item.text = 'show_log';
    item.link = 'showLog';
    this.routerMenu.items.push(item);

  }


  /**
   * selectComponent()
   *  select child components and child routes
   *
   * @param component  name of component or route to choose - cn be an empty string
   */
   private selectComponent(component: string) {
    const session = this.auth.getSession(this.name);
    if (component === undefined || component === null) {
      component = '/';
    }
    this.childComponents.forEach(_ => {
      if (_.isSelectable) {
        if (_.name === component) {
          _.isSelected = true;
        } else if (_.isSelected ) {
          _.isSelected = false;
          this.formerComponent = _.name;
        }
      } else {
        if (_.name === component) {
          _.isAutoSelected = true;
        } else {
          _.isAutoSelected = false;
        }
      }
    });
    // we set router sub-navigations ....
    if (this.componentSelected() !== '' || this.componentAutoSelected() !== '' || component === '') {
      // if a router child was activated before, we reset it now
      // if no router child was activated, this component is NOT reloaded cause navigation checks active route ...
      this.router.navigate(['../header'], { relativeTo: this.route.parent });
    } else {
      // we activate routerChild - without ../header parent, cause it could be called from another entry where we would lose parameters when reloading ...
      this.formerComponent = component;
      this.router.navigate([component], { relativeTo: this.route });
    }
    this.refreshSignal.set(1);
  }


  /**
   * showUser()
   *  shows user component
   * @param showView name of user component view (form, list) to be shown
   */
  private showUser(showView: string)  {
    this.c['user'].usage = showView;
    this.selectComponent('user');

  }

  

  /**
   * showPopup()
   * @param header header text
   * @param isPositiveConfirmed if is false, color changes from green to red
   * @param confirm text we show to confirm
   * @param content detail text
   * @param duration in milliseconds
   */
  private showPopup(header: string, isPositiveConfirmed?: boolean, confirm?: string, content?: string, duration?: number)  {
    if (!duration || isNaN(duration)) {
      duration = 5000;
    }
    this.popupHeaderText = header;
    if (content) {
      this.popupContentText = content;
    } else {
      this.popupContentText = '';
    }

    this.isPopupPositive = isPositiveConfirmed ?? true;
    
    if (confirm) {
      this.popupConfirmText = confirm;
    } else {
      this.popupConfirmText = '';
    }
    this.openPopup();
    setTimeout(() => {
      // this.popupClass = this.popupClass.replace('visible', 'hidden');
      this.closePopup();
    }, duration);
  }


  /** --------------------------  public methods -------------------------------------------- */
  /** ------------------------------ header ------------------------- */

  public testPopup() {
    this.showPopup('kopfzeile');
  }

  public userList() {
    this.showUser('list');
  }

  public unknownUser() {
    // in case of unknown user we show form - cause isCreate is true in call of user.component, the form is shwn as 'new'
    //  in order to enter user data...
    this.showUser('first');
  }

  /**
   * showRouterMenu()
   *  shows complete router menus - if menu has items ...
   *
  */

  public showRouterMenu(event: Event): void {
    // Verhindere das Standardverhalten des `<summary>`-Elements
    event.preventDefault();
    if (this.routerMenu.isVisible) {
      this.routerMenu.isVisible = false;
    } else {
      // we show menu if we have items
      if (this.routerMenu.items.length > 0) {
        this.routerMenu.isVisible = true;
      }
    }
  }


  /**
   * setSubMenusInvisble()
   *  sset subMenus invisible
   */
  public setSubMenusInvisble(menu: Menu): void {
    if (menu?.items?.length > 0) {
      for (const item of menu.items) {
        if (item.hasSubMenu && item.subMenu) {
          item.subMenu.isVisible = false;
          this.setSubMenusInvisble(item.subMenu);
        }
      }
    }
  }

  /**
   * routerMenuLink()
   *  executes router link
   * @param link contains component to be routed to
   */
  public async routerMenuLink(link: string) {
    this.selectComponent(link);
    this.routerMenu.isVisible = false;
    this.setSubMenusInvisble(this.routerMenu);
  }

  public async refreshSession() {
    const session = this.auth.getSession(this.name);
    let isCompleteReset = false;
    if (this.auth.purgeUsers(0, this.name)) {
      // we are in an ng development environment
      if (confirm('development mode - complete reset - all local data are purged'+ '?') === true) {
        let op = 'info: actual session is not the last session';
        if (this.auth.purgeUsers(1, this.name)) {
          op = 'info: actual session is the last session';
        }
        if (confirm(op + ' - continue'+ '?') === true) {
          if (this.auth.purgeUsers(2, this.name)) {
            alert('reset completed');
            isCompleteReset = true;
          }
        }
      }
    }
    if (isCompleteReset) {
      await this.sessionActivate();
    } else {
      // we refresh by setting same session user as before ...
      const userId = session?.userId ?? 0;
      const nop = await this.auth.newSessionUser(userId, this.name);
    }
  }


  /** ------------------------------ user ------------------------- */

  public async selectUser(userId: number) {
    const newUserId = await this.auth.newSessionUser(userId, this.name);
    if (newUserId === userId) {
      const session = this.auth.getSession(this.name);
      this.userId = session?.userId ?? 0;
      this.userName = session?.userName ?? '';
      // other user starts again with default menu ...
      this.formerComponent = undefined;
    } else {
      alert('user selection not successull)');;
    }
  }

  // user has been updated - maybe he must be actualized in session
  public async updateUser(userId: number) {
    let session = this.auth.getSession(this.name);
    if (userId === (session?.userId ?? 0)) {
      await this.auth.updateSessionUser(this.name);
    }
  }

  public async closeUserComponent() {
    const session = this.auth.getSession(this.name);
    this.userId = session?.userId ?? 0;
    this.userName = session?.userName ?? '';
  }

  /** ------------------------------ calendar ------------------------- */

  public restart() {
    this.sessionActivate();
  }

  /** --------------------------  methods for tests -------------------------------------------- */
  /** ------------------------------ Beispiel-2 ------------------------- */


  public toggleMenu() {
    /*
    // direktes DOM handling nur für Beispiel
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu?.classList.toggle('hidden');
    console.log("toggle works");

    const verticalMenu = document.getElementById('vertical-menu');
    if (verticalMenu) {
      verticalMenu.classList.toggle('hidden');
      verticalMenu.classList.toggle('opacity-0');
      verticalMenu.classList.toggle('-translate-y-4');
    }
    */
   // in Angular mit einem [ngCclass] Element
   this.isBeispiel2MenuVisible = !this.isBeispiel2MenuVisible;

   console.log("toggle works");
  }

  /** ------------------------------ Beispiel-3 ------------------------- */

 @HostListener('window:scroll', ['$event'])
  onWindowScroll(event: any) {
    if (window.scrollY > 50) {
      this.isBeispiel3NavbarWhite = false;
      // console.log ('scroll greater 50');
    } else {
      this.isBeispiel3NavbarWhite = true;
    }
  }

}
