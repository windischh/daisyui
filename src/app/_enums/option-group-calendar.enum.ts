/**
 * option group is part of dynamic style options for calendar
 * (dynamic style options for calendar have options with "calendar_##_xxxx_style"
 * where calendar is area,  ## is number of style (00 is default style), xxxx is optionGroup)
 *
 */
export enum OptionGroupCalendar {
  opt_calendar_tableBgStyle = 101,
  opt_calendar_tableStyle = 102,
  opt_calendar_tableHeaderStyle = 201,
  opt_calendar_tableRowStyle = 202,
  opt_calendar_tableFooterStyle = 203,
  opt_calendar_timeElementStyle = 301,
  opt_calendar_timeInTimeElementStyle = 302,
  opt_calendar_timeElementOutsideStyle = 303,
  opt_calendar_eventElementStyle = 401,
  opt_calendar_timeStyle = 402,
  opt_calendar_durationStyle = 403,
  opt_calendar_eventStyle = 404,
  opt_calendar_locationStyle = 405,
  opt_calendar_descriptionStyle = 406,
  opt_calendar_custStyle = 407,
  opt_calendar_isShowDuration = 501,
  opt_calendar_isShowLocation = 502,
  opt_calendar_isShowDescription = 503,
  opt_calendar_isShowTimeColumn = 504,
  opt_calendar_isShowContactColumn = 505,
  /**********      9300 - 9700 test sequences  */
  opt_test_name_choice = 9300,
  opt_test_value_choice = 9400,
  opt_test_value_choice_unique = 9500,
  opt_test_both_choice = 9600,
  opt_test_both_choice_unique = 9700
  }

