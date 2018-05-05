import { HttpHeaders, HttpParams } from '@angular/common/http';

export interface HttpOptionsI {
    headers?: HttpHeaders;
    params?: HttpParams;
    reportProgress?: boolean;
    withCredentials?: boolean;
}

export class HttpOptions implements HttpOptionsI {
    constructor(
        public headers?: HttpHeaders,
        public observe: 'response' = 'response',
        public params?: HttpParams,
        public reportProgress?: boolean,
        public responseType: 'text' = 'text',
        public withCredentials?: boolean
    ) { }
}
