import { HttpResponse } from '@angular/common/http';

import { Utils } from '../utils/utils';

export abstract class ODataResponseBase<T> {
  private httpResponse: HttpResponse<T>;

  constructor(httpResponse: HttpResponse<T>) {
    this.httpResponse = httpResponse;
  }

  getHttpResponse() {
    return this.httpResponse;
  }

  isOk(): boolean {
    return this.httpResponse.ok;
  }

  getBodyAsJson(): any {
    return null;
  }


}
