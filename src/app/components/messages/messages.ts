import { Component, OnInit } from '@angular/core';
import { MessageService } from '../../_services/message.service';

@Component({
  selector: 'dsy-messages',
  imports: [],
  templateUrl: './messages.html',
  styleUrl: './messages.css',
})
export class MessagesComponent implements OnInit {

  public name = 'Messages';

  constructor(public messageService: MessageService) { }

  ngOnInit(): void {
  }

}
