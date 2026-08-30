import {Component, Input, Output, AfterViewInit, EventEmitter, NgZone, forwardRef, Self, SimpleChange} from '@angular/core';
import {ControlValueAccessor, NgModel} from '@angular/forms';
import { GlobalFunctions } from '../../_globals/global-functions';
import { NgClass } from '@angular/common';

@Component({
    selector: 'dsy-paginator',
    templateUrl: './paginator.html',
    styles: [],
    imports: [NgClass]
})
export class PaginatorComponent implements AfterViewInit, ControlValueAccessor {

  // paginator as a component
  // we inject ngModel as self to offer ngModel for bidirectional control of selectedPage
  // onChange and onTouched methods are necessary for  ControlValueAccessor

  private _total!: number;
  private _limit!: number;
  private _names!: Array<string>;

  @Input() isTooltipBelow: boolean = false; // we can chose bottm tooltip - not recommended when tooltip is last element on page ...
  @Input() externalSelectedPage: number = 0; // selected page in case of parallel paginators ...

  @Input({required: true}) txt!: { [key: string]: string };
  @Input({required: true}) elementName: string = ''; // name of element we show in paginator
  @Input({required: true}) abbrPlaces: number = 3; // number of positions of this.name we show abbreviated  in ..from ...to


  // we use the setter here instead of ngOnChanges()
  @Input({required: true})
  public get total(): number {
    return this._total;
  }
  public set total(value: number){
    this._total = value;
    this.updatePages();
  }

  @Input({required: true})
  public get limit(): number{
    return this._limit;
  }
  public set limit(value: number){
    this._limit = value;
  }

  // names for each element to show (abbreviated) in tooltip
  @Input({required: true})
  public get names(): Array<string> {
    return this._names;
  }
  public set names(value: Array<string>){
    this._names = value;
    this.updatePages();
  }

  @Output() pageSelect: EventEmitter<number> = new EventEmitter<number>();
  @Output() totalPages: EventEmitter<number> = new EventEmitter<number>();

  numberOfPages: number = 0;
  pages: Array<number> = [];
  selectedPage: number = 1;
  isShowNames = false;
  isShowElementNames = false;

  /*
  set modelPage(val: number){  // this value is updated by programmatic changes if( val !== undefined && this.val !== val){
    this.page = val;
    this.onChange(val);
    this.onTouched(val);
    }

  // local variable
  page: number;
  */

  processId: number;

  public onChange: any = Function.prototype;
  public onTouched: any = Function.prototype;

  // ngZone is defined - for augury inspecting purpose ....
  constructor(
    @Self() private self: NgModel,
    private ngZone: NgZone) {
    this.self.valueAccessor = this;
    // we build a üseudo process id for debuggin g purpose when using parallel paginators ..
    const constructTime = new Date();
    this.processId = constructTime.getMilliseconds();
  }

  ngAfterViewInit(): void {
    this.updatePages();
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {

    /* be careful when querying for changes
      first time change can deliver empty values
    */
    for (const [propKey, propValue] of Object.entries(changes)) {

      // we need this in case of a parallel paginator ...
      if (propKey === 'externalSelectedPage' ) {
        // console.log('paginator - ', this.processId, 'page was: ', this.selectedPage,  'select page: ', this.externalSelectedPage );
        this.selectPage(this.externalSelectedPage);
      }
    }
  }

  private updatePages(): void {
    this.isShowNames = this.names !== undefined && this.names !== null && this.names.length === this.total;
    this.isShowElementNames = this.elementName !== undefined && this.elementName !== null && this.elementName !== '';
    this.numberOfPages = Math.ceil(this.total / this.limit);
    this.pages = [];
    // this.pages contain a variable array conating the choosen area - anyway excluding first and last page
    if (this.numberOfPages > 9) {
      let start = this.selectedPage > 5 ? this.selectedPage - 2 : this.selectedPage - 3;
      while (start <= 1) start++;
      while (start + 4 >= this.numberOfPages) start--;
      for (let x=0; x < 5; x++) {
        this.pages.push(start + x);
      }
      let x: number = start + 6;
      let y: number = this.selectedPage + 4;
      if ((x == this.numberOfPages) && (y == this.numberOfPages)) this.pages.push(start + 5);
    } else {
      for (let x = 1; x <= this.numberOfPages; x++) {
        if (x !== 1 && x !== this.numberOfPages) this.pages.push(x);
      }
    }
  }

  /** ------------------------  public methods --------------------------------------------------- */

  getPageTooltip(page: number): string {
    if (page > 0) {
      // element numbers from 1 to length
      const firstElement = (page - 1) * this.limit + 1;
      const lastElement =  page * this.limit > this.total ? this.total : page * this.limit;
      if (this.isShowNames) {
        return this.txt['select_page'] + ': ' + page + ' -- '  + (this.isShowElementNames ? (this.elementName + ': ') : '')  + GlobalFunctions.getTextAbbr(this.names[firstElement - 1], this.abbrPlaces)
          + (lastElement !== firstElement ? (' - ' + GlobalFunctions.getTextAbbr(this.names[lastElement - 1], this.abbrPlaces)) : '');
      } else {
        return this.txt['select_page'] + ': ' + page + ' -- '  + this.txt['element'] + ': '  + firstElement
          + (lastElement !== firstElement ? (' - ' + lastElement) : '');
      }
    } else {
      return '';
    }
  }

  getTooltipPosition(): string {
    if (this.isTooltipBelow) {
      return 'bottom center'; 
    } else {
      return 'top center'; 
    }
  }


  selectPage(page: number): void  {
    // here selection is done only if this component is used - not when selectedPage is changed from outside ..
    if (page === this.selectedPage) return;
    this.selectedPage = page;
    this.updatePages();
    this.pageSelect.emit(page);
    this.self.viewToModelUpdate(page);
  }

  goBack(): void {
    let page = this.selectedPage - 1;
    if (page > this.numberOfPages) page = this.numberOfPages;
    if (page < 1) page = 1;
    this.selectPage(page);
  }

  goForward(): void {
    let page = this.selectedPage + 1;
    if (page > this.numberOfPages) page = this.numberOfPages;
    if (page < 1) page = 1;
    this.selectPage(page);
  }


  // the intermediate buttons '...' shift 10 pages forward/backward
  goBack10(): void {
    let page = this.selectedPage - 10;
    if (page > this.numberOfPages) page = this.numberOfPages;
    if (page < 1) page = 1;
    this.selectPage(page);
  }

  goForward10(): void {
    let page = this.selectedPage + 10;
    if (page > this.numberOfPages) page = this.numberOfPages;
    if (page < 1) page = 1;
    this.selectPage(page);
  }

  // implements ControlValueAccessor interface
  writeValue (value: number): void {
    if (value === this.selectedPage) {
      return;
    }
    this.selectedPage = +value;
  }


  // implements ControlValueAccessor interface
  registerOnChange(fn: (_: any) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

}

