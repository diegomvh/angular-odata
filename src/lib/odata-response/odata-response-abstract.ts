import { HttpResponse } from '@angular/common/http';

import { Utils } from '../utils/utils';

export abstract class ODataResponseAbstract {
    private httpResponse: HttpResponse<string>;

    constructor(httpResponse: HttpResponse<string>) {
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

    getBodyAsText(): string {
        return this.httpResponse.body;
    }

    toString(): string {
        let res = `${this.httpResponse.status} ${this.httpResponse.statusText}\n`;

        const headers = this.httpResponse.headers;
        for (const key of headers.keys()) {
            res += key + ': ';
            let valueString = '';
            for (const value of headers.getAll(key)) {
                if (valueString.length) {
                    valueString += ' ';
                }
                valueString += value;
            }
            res += valueString + '\n';
        }

        const json = this.getBodyAsJson();
        if (Utils.isNotNullNorUndefined(json)) {
            res += JSON.stringify(json, null, 4);
        } else {
            res += this.getBodyAsText();
        }
        return res;
    }
}
