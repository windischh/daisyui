/**
 * ISecurityLevel
 * used in session and got from login at server
 * local users which have not logged in at server have all levels = 0, but are allowed for standard maint
 */
export interface ISecurityLevel {
  /*
    user level defined at server:
    0 no user rights (not a valid user...)
    1 local user
    2 server user (could be extended with various rights from 3 to 8)
    9 admin user(could be extended with various admin rights > 9)
    user corresponds to type of local user as follows:
    securityLevel.user 9 <=> local user type 0 admin, 1 - local user (no calendar at server), 2 - server user
  */
  user: number
  /*
    maint rights can/must be applied for all user types at server
    0 no maint right
    1 standard maint (create other local users, add event select options)
    2 admin maint (finish issues)
  */
  maint: number;
  /*
    not used in the moment
  */
  show: number;
  /**
   * isTest is true if this is a user for which some (e2e - cypress,..) test szenarios are opened
   */
  isTest: boolean;
}
