import { MenuItem } from "./menu-item";
import { MenuItemRaw } from "./menu-item-raw";


export class MenuItemFactory {

  static empty(): MenuItem {
    return new MenuItem('', false, false,
      false, '', '', false, '', '', '', '', false, '', false, '', '',
      false, null, null, 0, 0);
  }

  static fromObject(rawMenuItem: MenuItemRaw): MenuItem {
    return new MenuItem(
      rawMenuItem.menuItemName,
      rawMenuItem.isDivider,
      rawMenuItem.isHeader,
      rawMenuItem.hasLabelLeft,
      rawMenuItem.labelClassLeft,
      rawMenuItem.labelTextLeft,
      rawMenuItem.hasIconLeft,
      rawMenuItem.iconClassLeft,
      rawMenuItem.text,
      rawMenuItem.description,
      rawMenuItem.link,
      rawMenuItem.hasIconRight,
      rawMenuItem.iconClassRight,
      rawMenuItem.hasLabelRight,
      rawMenuItem.labelClassRight,
      rawMenuItem.labelTextRight,
      rawMenuItem.hasSubMenu,
      rawMenuItem.subMenuDirectoryHandle,
      rawMenuItem.fileHandle,
      rawMenuItem.type,
      rawMenuItem.status,
      rawMenuItem.subMenuId,
      rawMenuItem.subMenuName,
      rawMenuItem.subMenu,
      rawMenuItem.isSubMenuLeft,
      rawMenuItem.isSubMenuRight
    );
  }

}
