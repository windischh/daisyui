import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { Session } from '../../_db/session';
import { Language } from '../../_enums/language.enum';
import { IChoice } from '../../_interfaces/i-choice';

import { AuthenticationService } from '../../_services/authentication.service';


@Component({
  selector: 'dsy-status',
  imports: [FormsModule, DatePipe],
  templateUrl: './status.html',
  styleUrl: './status.css',
})
export class StatusComponent {

public name = 'StatusComponent';

  public modeChoices!: Array<IChoice>;
  public languageChoices!: Array<IChoice>;

  public session!: Session | null;

  constructor(private route: ActivatedRoute,
    private router: Router,
    public auth: AuthenticationService) { }

  async ngOnInit() {
    await this.sessionUse();
  }

  // we do not activate session because we want to show last status ..
  private async sessionUse() {
    this.session = this.auth.getSession(this.name);
    this.modeChoices = [
      {text: 'admin', value: 'admin', isSelected: false},
      {text: 'server - user', value: 'server', isSelected: true},
      {text: 'local -user', value: 'local', isSelected: false}
    ];
    this.languageChoices = Object.keys(Language)
    .filter((k: any) => typeof Language[k] === 'number' && Number(Language[k]) > 0)
    .map(_ => {
      const enumStringType: { [key: string]: any } = Language;
      return {value: enumStringType[_] as string, text: _, isSelected: Number(enumStringType[_]) === this.session?.language };
    });
  }

  /** ------------------------  public methods --------------------------------------------------- */

  /**
   * change mode of app
   * @param event - choosen selection
   */
  public selectMode(event: any): void {
    this.router.navigate(['../' + event.target.value], { relativeTo: this.route.parent });
  }

  /**
   * rewuest language of selection-box
   * @param event - id of selection choices
   */
  public async selectLanguage(event: any)  {
    this.languageChoices.forEach(async _ => {
      if (Number(_.value) === Number(event.target.value)) {
        _.isSelected = true;
        await this.auth.changeLanguage(Number(_.value), this.name);
        this.session = this.auth.getSession(this.name);
      } else {
        _.isSelected = false;
      }
    });
  }

}

