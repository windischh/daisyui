import { Injectable, signal, WritableSignal } from '@angular/core';

/**
 * message service provides a bottom message conversation with the user as information
 *  about occuring events
 * messages are activated by components depending on production/test status of system
 *  and gravity of occuring event
 * messages are not used for user interaction - for this use case we are using alerts or popUp windows
 *
 */

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  
  messages: WritableSignal<Array<string>> = signal<Array<string>>([]);

  // message.show: message is presented to end-user - it should come from texts with correct language
  show(message: string) {
    this.messages.update((resObject: Array<string>) => [
      ...resObject, message]
    );
  }

  // MessageLveel to activate info is communicated via sessionStorage
  info(message: string) {
    if (sessionStorage.getItem('MessageLevel') === 'TEST') {
      this.messages.update((resObject: Array<string>) => [
        ...resObject, message]
      );
    }
  }

  clear() {
    this.messages = signal<Array<string>>([]);
  }
}
