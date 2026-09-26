import { WritableSignal } from "@angular/core";
import { IMenu } from "../_interfaces/i-menu";
import { MenuItemRaw } from "./menu-item-raw";

export interface MenuRaw extends IMenu {
  menuId: number;
  menuCategory: string;
  /* menuName from IMenu */
  menuName: string;
  /* text from IMenu */
  text: string;
  isVisible: WritableSignal<boolean>;
  /* items from IMenu */
  items: MenuItemRaw[];
  providerId: number;
  directoryHandle: FileSystemDirectoryHandle | null;
  type: number;
  status: number;
  created: Date;
  createdBy: string;
  releaseCreated: number;
  updated: Date | null;
  updatedBy: string;
  releaseUpdated: number;
  version: number;
  }
