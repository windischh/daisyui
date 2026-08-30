import { Menu } from "./menu";

export interface MenuItemRaw {
  menuItemName: string;
  isDivider: boolean;
  isHeader: boolean;
  hasLabelLeft: boolean;
  labelClassLeft: string;
  labelTextLeft: string;
  hasIconLeft: boolean;
  iconClassLeft: string;
  text: string;
  description: string;
  link: string;
  hasIconRight: boolean;
  iconClassRight: string;
  hasLabelRight: boolean;
  labelClassRight: string;
  labelTextRight: string;
  hasSubMenu: boolean;
  subMenuDirectoryHandle: FileSystemDirectoryHandle | null;
  fileHandle: FileSystemFileHandle | null;
  type: number;
  status: number;
  subMenuId?: number;
  subMenuName?: string;
  subMenu?: Menu;
  isSubMenuLeft?: boolean;
  isSubMenuRight?: boolean;
  }
