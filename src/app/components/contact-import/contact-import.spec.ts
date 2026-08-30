import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactImportComponent } from './contact-import';

describe('ContactImport', () => {
  let component: ContactImportComponent;
  let fixture: ComponentFixture<ContactImportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactImportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactImportComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
