import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
    name: 'safeResource',
    standalone: true
})
export class SafeResource implements PipeTransform {

  constructor(
    private sanitizer: DomSanitizer
  ) {}

  transform(fileUrl: any) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);
  }

}
