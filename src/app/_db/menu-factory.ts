import { signal } from "@angular/core";
import { Menu } from "./menu";
import { MenuItemFactory } from "./menu-item-factory";
import { MenuRaw } from "./menu-raw";


export class MenuFactory {

  static empty(): Menu {
    return new Menu(0, '', '', '', signal(false), [], 0, null,
    0, 0, new Date(), '', 0, null, '', 0, 0);
  }

  static fromObject(rawMenu: MenuRaw): Menu {
    return new Menu(
      rawMenu.menuId,
      rawMenu.menuCategory,
      rawMenu.menuName,
      rawMenu.text,
      rawMenu.isVisible,
      rawMenu.items ? rawMenu.items.map(menuItem => MenuItemFactory.fromObject(menuItem)) : [],
      rawMenu.providerId,
      rawMenu.directoryHandle,
      rawMenu.type,
      rawMenu.status,
      /* audit info - must be set by updating proccedures  */
      typeof(rawMenu.created) === 'string' ?
      new Date(rawMenu.created) : rawMenu.created,
      rawMenu.createdBy,
      rawMenu.releaseCreated,
      typeof(rawMenu.updated) === 'string' ?
      new Date(rawMenu.updated) : rawMenu.updated,
      rawMenu.updatedBy,
      rawMenu.releaseUpdated,
      rawMenu.version
    );
  }

}
