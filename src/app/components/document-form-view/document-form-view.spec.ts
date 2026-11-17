import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentFormView } from './document-form-view';

describe('DocumentFormView', () => {
  let component: DocumentFormView;
  let fixture: ComponentFixture<DocumentFormView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentFormView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentFormView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
