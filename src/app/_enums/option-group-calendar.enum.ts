/**
 * option group is part of dynamic style options for calendar
 * (dynamic style options for calendar have options with "calendar_##_xxxx_style"
 * where calendar is area,  ## is number of style (00 is default style), xxxx is optionGroup)
 *
 */
export enum OptionGroupCalendar {
  calendar_tableBgStyle = 101,
  calendar_tableStyle = 102,
  calendar_tableHeaderStyle = 201,
  calendar_tableRowStyle = 202,
  calendar_tableFooterStyle = 203,
  calendar_timeElementStyle = 301,
  calendar_timeInTimeElementStyle = 302,
  calendar_timeElementOutsideStyle = 303,
  calendar_eventElementStyle = 401,
  calendar_timeStyle = 402,
  calendar_durationStyle = 403,
  calendar_eventStyle = 404,
  calendar_locationStyle = 405,
  calendar_descriptionStyle = 406,
  calendar_contactStyle = 407,
  calendar_isShowDuration = 501,
  calendar_isShowLocation = 502,
  calendar_isShowDescription = 503,
  calendar_isShowTimeColumn = 504,
  calendar_isShowContactColumn = 505,
  /**********      9300 - 9700 test sequences  */
  test_name_choice = 9300,
  test_value_choice = 9400,
  test_value_choice_unique = 9500,
  test_both_choice = 9600,
  test_both_choice_unique = 9700
  }

