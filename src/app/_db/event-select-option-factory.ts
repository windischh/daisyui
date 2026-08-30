import { EventSelectOption } from './event-select-option';
import { EventSelectOptionRaw } from './event-select-option-raw';

export class EventSelectOptionFactory {

  static empty(): EventSelectOption {
    return new EventSelectOption(0, '', 0, 0, '', '', 0, '', 0, '', '',
     false, 0, false, []);
  }

  static fromObject(rawEventSelectOption: EventSelectOptionRaw): EventSelectOption {
    return new EventSelectOption(
      rawEventSelectOption.nr,
      rawEventSelectOption.name,
      rawEventSelectOption.contactNr,
      rawEventSelectOption.issueProviderId,
      rawEventSelectOption.providerUrl,
      rawEventSelectOption.login,
      rawEventSelectOption.nExternalIssueId,
      rawEventSelectOption.sExternalIssueId,
      rawEventSelectOption.userId,
      rawEventSelectOption.externalUserId,
      rawEventSelectOption.userLogin,
      rawEventSelectOption.isPlan,
      rawEventSelectOption.locationType,
      rawEventSelectOption.isShowDetails,
      rawEventSelectOption.sortCriterias,
      rawEventSelectOption.userName,
      rawEventSelectOption.custIssueNr,
      rawEventSelectOption.contactDisplayNr,
      rawEventSelectOption.contactName,
      rawEventSelectOption.contactColor,
      rawEventSelectOption.issueDisplayNr,
      rawEventSelectOption.issueText,
      rawEventSelectOption.isPreviousDay,
      rawEventSelectOption.isPreviousWeek,
      rawEventSelectOption.isPreviousMonth,
      rawEventSelectOption.isCurrentDay,
      rawEventSelectOption.isCurrentWeek,
      rawEventSelectOption.isCurrentMonth,
      rawEventSelectOption.isNextDay,
      rawEventSelectOption.isNextWeek,
      rawEventSelectOption.isNextMonth,
      rawEventSelectOption.isDateInterval,
      rawEventSelectOption.showFrom,
      rawEventSelectOption.showTo,
      rawEventSelectOption.isDateRange,
      typeof(rawEventSelectOption.dateFrom) === 'string' ?
      new Date(rawEventSelectOption.dateFrom) : rawEventSelectOption.dateFrom,
      typeof(rawEventSelectOption.dateTo) === 'string' ?
      new Date(rawEventSelectOption.dateTo) : rawEventSelectOption.dateTo
    )
  }

}
