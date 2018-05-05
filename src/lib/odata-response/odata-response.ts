import { HttpResponse } from '@angular/common/http';

import { Utils } from '../utils/utils';
import { EntitySet } from './entity-collection';
import { Metadata } from './metadata';
import { ODataResponseAbstract } from './odata-response-abstract';
import { ODataResponseBatch } from './odata-response-batch';

export class ODataResponse extends ODataResponseAbstract {
    private static readonly VALUE = 'value';
    private static readonly ODATA_COUNT = '@odata.count';

    constructor(httpResponse: HttpResponse<string>) {
        super(httpResponse);
    }

    getBodyAsJson(): any {
        const contentType: string = this.getHttpResponse().headers.get('Content-Type');
        if (Utils.isNotNullNorUndefined(contentType) && contentType.includes('json')) {
            try {
                return JSON.parse(this.getBodyAsText());
            } catch (error) {
                return null;
            }
        }
        return null;
    }

    toMetadata(): Metadata {
        const xml: string = this.getBodyAsText();
        return new Metadata(xml);
    }

    toEntitySet<T>(): EntitySet<T> {
        const json: any = this.getBodyAsJson();
        if (Utils.isNotNullNorUndefined(json) && json.hasOwnProperty(ODataResponse.VALUE)) {
            let count: number = null;
            if (json.hasOwnProperty(ODataResponse.ODATA_COUNT)) {
                count = json[ODataResponse.ODATA_COUNT];
            }
            return new EntitySet<T>(json[ODataResponse.VALUE], count);
        }
        return null;
    }

    toEntity<T>(): T {
        return this.toObject<T>();
    }

    toPropertyValue<T>(): T {
        const json: any = this.getBodyAsJson();
        if (Utils.isNotNullNorUndefined(json)) {
            if (json.hasOwnProperty(ODataResponse.VALUE)) {
                return <T>json[ODataResponse.VALUE];
            }
            return null;
        } else {
            return <T>JSON.parse(this.getBodyAsText());
        }
    }

    toComplexValue<T>(): T {
        return this.toObject<T>();
    }

    toCount(): number {
        return Number(this.getBodyAsText());
    }

    toODataResponseBatch(): ODataResponseBatch {
        return new ODataResponseBatch(this.getHttpResponse());
    }

    protected toObject<T>(): T {
        const json: any = this.getBodyAsJson();
        if (Utils.isNotNullNorUndefined(json)) {
            return <T>json;
        }
        return null;
    }
}
