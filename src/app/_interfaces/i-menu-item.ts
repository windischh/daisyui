import { IMenu } from "./i-menu";

export interface IMenuItem {
  text: string;
  hasSubMenu: boolean;
  subMenuName?: string;
  subMenu?: IMenu;
}
