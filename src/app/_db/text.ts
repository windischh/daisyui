/*
  detailed description -see: pEvent-invoice
*/
export class Text {
  constructor (
    public textId: number,
    public textCategory: string,
    public textName: string,
    public textValue: number,
    public text: string,
    public language: number,
    public type: number,
    public status: number,
    public created: Date,
    public createdBy: string,
    public releaseCreated: number,
    public updated: Date | null,
    public updatedBy: string,
    public releaseUpdated: number,
    public version: number,
  ) {}
}
