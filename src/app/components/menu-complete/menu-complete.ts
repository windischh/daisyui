import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Menu } from '../../_db/menu';
import { NgClass, NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'dsy-menu-complete',
  imports: [NgClass, MenuCompleteComponent],
  templateUrl: './menu-complete.html',
  styleUrl: './menu-complete.css',
})
export class MenuCompleteComponent {

	public name = 'MenuCompleteComponent';

  @Input({ required: true }) menu!: Menu;
  // this menu shall be placed left of its parent (not used in the moment)
  @Input() isLeft: boolean | undefined;
  // this menu shall be placed right of its parent (not used in the moment)
  @Input() isRight: boolean | undefined;
  @Input({ required: true }) txt!: { [key: string]: string; };

  @Output() linkActivated = new EventEmitter<string>();


constructor() { }

  ngOnInit() {

  }


  /** --------------------------  private methods -------------------------------------------- */


   /** ------------------------ listener  ------------------------- */

  // disable all clickable menus if clicked elsewhere
  @HostListener('window:click', ['$event.target'])
  onClick(target: any) {
    // console.log(this.name:, ': You clicked on: `, target);
    if (target &&  (target.id === 'dropdownItem' || target.id === 'dropdownSpan' || target.id === 'dropdownIcon'
      ||  target.id === 'menu'
      ||  target.id === 'item' ||  target.id === 'itemText' ||  target.id === 'itemDescription' ||  target.id === 'itemIcon' ||  target.id === 'itemLabel')) {
      // console.log(this.name, ': click id is: `, target.id);
      // console.log(this.name, ': parent id is: `, target.parentElement.id);
    } else {
      // TODO we do not collapse menus in the moment - there is no action triggered here
      // console.log(this.name, ': You clicked on other target: ', target);
    }
  }


  /** --------------------------  public methods -------------------------------------------- */

  /**
   * show menu - if menu has items ...
   * @param i index of menu items
   */
  public showMenu(i: number, event: Event): void {
    // Verhindere das Standardverhalten des `<summary>`-Elements
    event.preventDefault();
    if (this.menu?.items[i]?.subMenu?.isVisible) {
      this.menu.items[i].subMenu.isVisible = false;
    } else {
      if (this.menu?.items[i]?.subMenu) {
        // we habe a valid submenu if it has items ...
        if (this.menu.items[i].subMenu.items?.length > 0) {
          this.menu.items.forEach(_ => {
            if (_.subMenu) {
              _.subMenu.isVisible = false;
            }
          });
          this.menu.items[i].subMenu.isVisible = true;
        }
      }
    }
  }


  public link(link: string) {
    // console.log(this.name, ': activating link: ', link );
    this.linkActivated.emit(link);
  }

}


