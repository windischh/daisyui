import { Routes } from '@angular/router';
import { HeaderComponent } from './components/header/header';
import { StatusComponent } from './components/status/status';
import { ContactComponent } from './components/contact/contact';
import { CalendarComponent } from './components/calendar/calendar';
import { CalendarImportComponent } from './components/calendar-import/calendar-import';
import { ContactImportComponent } from './components/contact-import/contact-import';
import { CalendarExportComponent } from './components/calendar-export/calendar-export';
import { ContactExportComponent } from './components/contact-export/contact-export';
import { ChronicleComponent } from './components/chronicle/chronicle';
import { DocumentComponent } from './components/document/document';
import { ConfigurationComponent } from './components/configuration/configuration';
import { ShowLogComponent } from './components/show-log/show-log';

export const routes: Routes = [
  { path: '', redirectTo: 'header', pathMatch: 'full'},
  { path: 'restart', component: HeaderComponent},
  { path: 'header', component: HeaderComponent,
    // router children are used for all components which are not called directly from header as sub-componts with @Input and @Output
    children: [
      { path: 'status', component: StatusComponent
      },
      { path: 'contact', component: ContactComponent
      },
      { path: 'calendarImport', component: CalendarImportComponent
      },
      { path: 'contactImport', component: ContactImportComponent
      },
      { path: 'calendarExport', component: CalendarExportComponent
      },
      { path: 'contactExport', component: ContactExportComponent
      },
      { path: 'chronicle', component: ChronicleComponent
      },
      { path: 'document', component: DocumentComponent
      },
      { path: 'configuration', component: ConfigurationComponent
      },
      { path: 'showLog', component: ShowLogComponent
      }
    ]
  }
];



