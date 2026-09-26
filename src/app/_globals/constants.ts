/**
 * Constants
 */

const WHITE = '#FFFFFF';
const WHITE_SMOKE = '#F5F5F5';
const GAINSBORO = '#DCDCDC';
const LIGHT_GREY = '#D3D3D3';
const SILVER = '#C0C0C0';
const DARK_GREY = '#A9A9A9';
const GREY = '#808080';
const YELLOW = 'Yellow';
const LIGHT_CORAL='LightCoral';
const RED = 'Red';
const LIGHT_GREEN = 'LightGreen';
const GREEN = 'Green';
const POWDER_BLUE = 'PowderBlue';
const BLACK = '#000000';
const BOLD_WEIGHT = 'bold';
const ITALIC_STYLE = 'italic';
const LINE_THROUGH = 'line-through';
const ARIAL_FONT = 'Arial, Helvetica, sans-serif';
const COMIC_SANS_FONT =  '"Comic Sans MS", Helvetica, sans-serif';
const CONSOLAS_FONT =  'Consolas, Courier, monospace';
const COURIER_NEW_FONT = '"Courier New", Courier, monospace';
const PALATINO_FONT = '"Palatino Linotype", "Book Antiqua", Palatino, serif';
const TAHOMA_FONT = 'Tahoma, Geneva, sans-serif';
const TIMES_NEW_ROMAN_FONT = '"Times New Roman", Times, serif';
const TREBUCHET_FONT = '"Trebuchet MS", Helvetica, sans-serif';
const VERDANA_FONT = 'Verdana, Geneva, sans-serif';

const COLOR_SELECTED = 'Green';
const COLOR_UNSELECTED = 'Gray';


const CLICK = 'click';
const KEYUP = 'keyup';
const BLUR = 'blur';

const WINDOW_WIDTH_MOBILE = 768;
const WINDOW_WIDTH_TABLET = 992;

/**
 * max contacts to show select box - if there ar more than this, we show search element
 */
const MAX_CUST_SELECT_BOX = 18;

/**
 * we accept dates in date picker
 * reaching from max months before today to max months after today
 */
const MAX_MONTHS = 18;

/**
 * max interval legth is a fixed constant - overlapping algorithm is based on this constant
 */
const MAX_INTERVAL_LENGTH = 720;

/**
 * max document number - we allow a million documents for each type
 */
const MAX_DOCUMENT_NR = 999999;

/**
 * max contact number - we allow 9 million contacts (contacts)
 */
const MAX_CONTACT_NR = 9999999;

/**
 * max document name clones - max nr for clone suffix (####)
 */
const MAX_DOCUMENT_CLONE = 9;


/**
 * time slize in min
 * can be 5, 10, 15, 20, 30, 60
 */
const DEFAULT_TIME_SLIZE = 5;

/**
 * default time zone
 */
const DEFAULT_TIME_ZONE_IDENTIFIER = 'Europe/Vienna';

const THUMBNAIL_WIDTH = 60;

const LF = '\n';
const LF_ZONED = '\\' + 'n';
const CRLF = '\r\n';
const QUOTATION_MARK = '\'';
const DOUBLE_QUOTATION_MARK = '"';
const COMMA = ',';
const SEMICOLON = ';';
const DECIMAL_POINT = '.';
const COLON = ':';
const EQUALS = '=';
const HORIZONTAL_TAB = '\t';

const BEGIN = 'BEGIN';
const END = 'END';
const VCALENDAR  = 'VCALENDAR';
const PRODID = 'PRODID';
const VERSION = 'VERSION';
const METHOD = 'METHOD';
const PUBLISH = 'PUBLISH';
const X_WR_TIMEZONE = 'X-WR-TIMEZONE';
const TZID = 'TZID';
const VEVENT = 'VEVENT';
const DTSTART = 'DTSTART';
const DTEND = 'DTEND';
const DTSTAMP = 'DTSTAMP';
const UID = 'UID';
const SUMMARY = 'SUMMARY';
const DESCRIPTION = 'DESCRIPTION';
const LOCATION = 'LOCATION';
const CLASS = 'CLASS';
const CREATED = 'CREATED';
const LAST_MODIFIED = 'LAST-MODIFIED';

const VCARD = 'VCARD';

const TYPE = 'TYPE';
const FN = 'FN';
const N = 'N';
const NICKNAME = 'NICKNAME';
const EMAIL = 'EMAIL';
const TEL = 'TEL';
const ADR = 'ADR';
const ORG = 'ORG';
const TITLE = 'TITLE';
const CATEGORIES = 'CATEGORIES';
const URL = 'URL';
const NOTE = 'NOTE';
const BDAY = 'BDAY';
const PHOTO = 'PHOTO';
// types for adress, email, tel
const HOME = 'HOME';
const WORK= 'WORK';
const CELL = 'CELL';
const INTERNET = 'INTERNET';
const DATE = 'DATE';

// already defined
// const UID = 'UID';
// const VERSION = 'VERSIOM';



const TXT_BASE: string[] = [
  'application_title',
  'you_are_logged_in_for',
  'you_are_not_logged_on',
  'enter_your_login',
  'must_be_entered',
  'must_have_not_more',
  'must_have_at_least',
  'must_be_numeric',
  'must_be_greater_than',
  'must_be_greater_or_equal_than',
  'must_exist',
  'must_not_be_changed',
  'must_not_be_greater_than',
  'date_is_not_in_format_dd_mm_yyyy',
  'session_refresh',
  'session_refreshed',
  'session_refresh_failed_timed_out',
  'session_refresh_failed_no_valid_session',
  'session_timed_out__new_login',
  'found',
  'not_found',
  'executed',
  'name',
  'login',
  'password',
  'home',
  'mandant',
  'value',
  'user',
  'text',
  'set_mandant',
  'logoff',
  'refresh',
  'enter',
  'list',
  'detail',
  'show',
  'list_home',
  'insert_home',
  'mandant_disable',
  'commit_changes',
  'keep_changes',
  'dismiss_changes',
  'year',
  'set_to',
  'not_succssful',
  'communication_error',
  'clone_number_increase',
  'clone_language_switch',
  'nr',
  'switch_to',
  'weekly',
  'monthly',
  'standard',
  'all',
  'not_ready',
  'closed',
  'for',
  'set_status',
  'to',
  'release',
  'filter',
  'show_second_line',
  'next_current',
  'language',
  'close',
  'with',
  'this_nr',
  'show_and_print',
  'show_closed',
  'text_disable',
  'user_disable',
  'event',
  'time_is_not_in_format_hh_mm',
  'event_disable',
  'already_exists',
  'interval_overlaps',
  'dd_mm_yyyy',
  'wrong_interval',
  'clear_log',
  'show_log',
  'cleared',
  'could_not_be_cleared',
  'released',
  'calendarDay',
  'eventImport',
  'eventExport',
  'time',
  'sort',
  'evented',
  'suppressed',
  'undefined',
  'transfer',
  'notRecurring',
  'time_zone_diff',
  'cancel',
  'submit',
  'position_lower',
  'position_raise',
  'noEvent',
  'eventHeaders',
  'allEvent',
  'alsoSuppressedEvent',
  'from_dMy_to_dMy',
  'from_dMy',
  'to_dMy',
  'from_month_to_month',
  'from_month',
  'to_month',
  'not_shown',
  'noRounding',
  'eventHeader',
  'events',
  'options',
  'configuration',
  'count',
  'styles',
  'event_day',
  'event_day_style',
  'option_update_failure',
  'option_insert_failure',
  'option_delete_failure',
  'option_delete',
  'option_group',
  'opt_style_name',
  'style',
  'create_new_style',
  'option_value',
  'image',
  'delete',
  'note',
  'image_update_failure',
  'iamge_insert_failure',
  'image_delete_failure',
  'image_delete',
  'select',
  'printRequests',
  'positions',
  'depends_on',
  'page',
  'notPossible',
  'onlyForward',
  'yesIfNotExists',
  'preview',
  'preview_print',
  'activated',
  'printRequested',
  'printProcessStarted',
  'printed',
  'emailed',
  'actual',
  'unlimited',
  'months',
  'loading_data',
  'active',
  'session expired - update cancelled',
  'show_ad_hoc_form',
  'unavailable',
  'show_all',
  'templates',
  'clone',
  'update',
  'updated',
  'types',
  'hdr_data',
  'ftr_data',
  'id_data',
  'data',
  'show_menu',
  'go_back',
  'discard_changes',
  'copy',
  'print_as_pdf',
  'enter_color',
  'reprint',
  'to_email',
  'select_all_for_insert',
  'enter_a_number',
  'eventCalendar',
  'userEvents',
  'store',
  'permanent',
  'now',
  'at_every_change',
  'remail',
  'reMailRequested',
  'unique',
  'plan',
  'not_assigned',
  'time_slize',
  'time_slizes',
  'startHour',
  'lastHour',
  'minutes',
  'max_selections',
  'for_cust_issue',
  'my_plan',
  'all_users',
  'select_option',
  'rounded',
  'select_user',
  'select_relative_date',
  'select_date_interval',
  'select_date_range',
  'select_fix_date',
  'date',
  'dateFrom',
  'dateTo',
  'days',
  'previous_day',
  'previous_week',
  'previous_month',
  'current_day',
  'current_week',
  'current_month',
  'next_day',
  'next_week',
  'next_month',
  'before',
  'after',
  'reset',
  'sortCriteria',
  'date_interval',
  'date_range',
  'from',
  'to',
  'month',
  'week',
  'day',
  'cloned',
  'for_update',
  'new_master_service_user',
  'new_service_user',
  'reopen',
  'missing_address_details',
  'regular',
  'hidden',
  'reopened',
  'search_number',
  'do_you_intend',
  'place_with',
  'suppress_with',
  'session',
  'onSite',
  'onTheWay',
  'office',
  'homeOffice',
  'smartPhone',
  'other',
  'locationType',
  'insert_before',
  'insert_after',
  'set_time',
  'select_events',
  'stop_selecting',
  'selected',
  'shift_events',
  'shift_events_to',
  'to_after',
  'to_before',
  'to_earlier',
  'to_later',
  'to_another_day',
  'copy_events_to_actual',
  'copy_events_to',
  'copy_events',
  'no_date_selected',
  'done',
  'not',
  'no_entry',
  'no_plan_entry',
  'at_this_day',
  'today',
  'tomorrow',
  'week_view',
  'grid_view',
  'cards_view',
  'issues_view',
  'options_view',
  'wrong_password',
  'positions_containing',
  'not_allowed',
  'maint',
  'service_level',
  'all_are_copied',
  'will_not_be_deleteable_at',
  'new',
  'contact_data',
  'mon',
  'change',
  'show_plan',
  'contact',
  'contacts',
  'contact',
  'contacts',
  'company',
  'select_contact',
  'select_contact',
  'select_page',
  'element',
  'log_level',
  'person',
  'settings',
  'address_data',
  'person_data',
  'company',
  'details',
  'last_invoice_nr',
  'link',
  'set_link',
  'set_password',
  'link_disable',
  'enter_user_link_login',
  'no_user_self_link',
  'enter_password',
  'new_password',
  'confirm_password',
  'different_passwords',
  'password_is_set',
  'enable',
  'show_disabled',
  'contact_enable',
  'contact_enable',
  'provider_enable',
  'to_today',
  'to_tomorrow',
  'event_shifted_to',
  'suppress',
  'leave_form',
  'timeSpanCategory',
  'todoCategory',
  'time_span',
  'no_new_plan_past_today',
  'new_event_before_previous_month',
  'event',
  'events',
  'calendar',
  'calendarExport',
  'select_events',
  'companyData',
  'file',
  'fileName',
  'fileNameExtension',
  'fileType',
  'filePattern',
  'prepare_export',
  'record_count',
  'no_records_to_show',
  'no_records_to_export',
  'records_exported',
  'columnHeader',
  'columnContent',
  'export_all_planned',
  'export_according_to_list',
  'no_matching_export_field',
  'maxLength',
  'decimalPositions',
  'dateFormat',
  'more_filters_are_set',
  'hide',
  'export_columns',
  'event_selection',
  'event_selection',
  'event_list',
  'like',
  'current',
  'related_to',
  'of',
  'set_to_be_done',
  'no_destination_outside_AT',
  'during',
  'all_jira_issues',
  'all_client_issues',
  'all_server_issues',
  'all_trello_issues',
  'reset_existing_authorization',
  'login_retries_cancelled',
  'return',
  'without_issue',
  'issue_provider',
  'issue',
  'reload_menu',
  'reload_filter',
  'show_issue',
  'activate_link',
  'login_necessary',
  'disabled',
  'issue_subtask_structure_corrupted',
  'recognized',
  'system_error',
  'not_active',
  'select_issue',
  'unknown',
  'show_user',
  'set_user',
  'server_user',
  'user_is_selected',
  'session_internal_error',
  'disable_failed',
  'disable_not_possible',
  'insert',
  'provider_not_available',
  'remember_login',
  'show_authorizations',
  'hide_authorizations',
  'last_login_successful',
  'last_login_rejected',
  'login',
  'show_details',
  'hide_details',
  'issue_title',
  'issue_sub_title',
  'user_title_server',
  'user_title_local',
  'event_day_title',
  'issue_disable',
  'show_issue_menu',
  'hide_issue_menu',
  'main_choice',
  'event_day_calendar',
  'event_list',
  'event_export',
  'calendar_export',
  'export',
  'category',
  'time_span_disable',
  'issue_selection',
  'all_contact_issue_relations',
  'search',
  'issue_select_title',
  'select_former_issues',
  'search_contact',
  'search_contact',
  'issues',
  'show_my_issues',
  'show_unstarted',
  'show_done',
  'show_subtasks',
  'show_parents',
  'search_external',
  'asap',
  'no_contact',
  'no_contact',
  'highest',
  'high',
  'medium',
  'low',
  'lowest',
  'choose_another_issue',
  'inclusive',
  'id',
  'rest',
  'hours',
  'enter_a_name',
  'contact_import',
  'contact_import',
  'calendar_import',
  'import',
  'prepare_import',
  'no_records_to_import',
  'records_imported',
  'wrong_json_format',
  'event_export',
  'no_event_entry_without_login',
  'status',
  'create_a_local_user',
  'local_provider',
  'filter_loaded',
  'menu_problem',
  'menu_loaded',
  'user_not_authorized',
  'local_user',
  'documents',
  'files',
  'distinct_category',
  'distinct_directory',
  'created',
  'is_set',
  'is_not_set',
  'document_enable',
  'document_disable',
  'wrong_ics_format',
  'fileSize',
  'message',
  'from_this',
  'error_count',
  'show_errors',
  'check_import',
  'check_source',
  'source',
  'checked',
  'ready_for_import',
  'time_spans',
  'event_count',
  'modified_count',
  'rejected_count',
  'not_checked',
  'unchanged',
  'not_overlap_count',
  'partially_overlap_count',
  'complete_overlap_count',
  'aborted',
  'last_tx_time',
  'import_local_timezone','documentCategory',
  'login_rejected',
  'mode',
  'choose_directory',
  'directory_upload',
  'server_documents',
  'local_file_system',
  'server_issues',
  'client_issues',
  'select_file',
  'no_duplicates_count',
  'duplicates_count',
  'wrong_vcf_format',
  'accepted_count',
  'start_with',
  'contactsExport',
  'exprt_all_contacts',
  'export_all_actual',
  'not_accepted_count',
  'time_spans_typed',
  'uploaded',
  'linked_documents',
  'link_documents',
  'start_link'











];

const CAL_BASE: string[] = [
  'newYear',
  'epiphany',
  'laborDay',
  'assumptionOfMary',
  'nationalDay',
  'allSaintsDay',
  'immaculateConception',
  'christmasDay',
  'stStephensDay',
  'goodFriday',
  'easterSunday',
  'easterMonday',
  'ascensionDay',
  'whitSunday',
  'whitMonday',
  'corpusChristi'
];

export {
  WHITE,
  WHITE_SMOKE,
  GAINSBORO,
  LIGHT_GREY,
  SILVER,
  DARK_GREY,
  GREY,
  YELLOW,
  LIGHT_CORAL,
  RED,
  LIGHT_GREEN,
  GREEN,
  POWDER_BLUE,
  BLACK,
  BOLD_WEIGHT,
  ITALIC_STYLE,
  LINE_THROUGH,
  ARIAL_FONT,
  COMIC_SANS_FONT,
  CONSOLAS_FONT,
  COURIER_NEW_FONT,
  PALATINO_FONT,
  TAHOMA_FONT,
  TIMES_NEW_ROMAN_FONT,
  TREBUCHET_FONT,
  VERDANA_FONT,
  COLOR_SELECTED,
  COLOR_UNSELECTED,
  CLICK,
  KEYUP,
  BLUR,
  WINDOW_WIDTH_MOBILE,
  WINDOW_WIDTH_TABLET,
  MAX_DOCUMENT_NR,
  MAX_CONTACT_NR,
  MAX_DOCUMENT_CLONE,
  MAX_CUST_SELECT_BOX,
  MAX_MONTHS,
  MAX_INTERVAL_LENGTH,
  DEFAULT_TIME_SLIZE,
  DEFAULT_TIME_ZONE_IDENTIFIER,
  LF,
  LF_ZONED,
  CRLF,
  QUOTATION_MARK,
  DOUBLE_QUOTATION_MARK,
  COMMA,
  SEMICOLON,
  DECIMAL_POINT,
  HORIZONTAL_TAB,
  COLON,
  EQUALS,
  BEGIN,
  END,
  VCALENDAR,
  PRODID,
  VERSION,
  METHOD,
  PUBLISH,
  THUMBNAIL_WIDTH,
  X_WR_TIMEZONE,
  TZID,
  VEVENT,
  DTSTART,
  DTEND,
  DTSTAMP,
  UID,
  SUMMARY,
  DESCRIPTION,
  LOCATION,
  CLASS,
  CREATED,
  LAST_MODIFIED,
  TXT_BASE,
  CAL_BASE,
  VCARD,
  TYPE,
  FN,
  N,
  NICKNAME,
  EMAIL,
  TEL,
  ADR,
  ORG,
  TITLE,
  CATEGORIES,
  URL,
  NOTE,
  BDAY,
  PHOTO,
  HOME,
  WORK,
  CELL,
  INTERNET,
  DATE
};
