import { HttpHeaders, HttpResponse } from '@angular/common/http';

import { Utils } from '../utils/utils';
import { ODataResponse } from './odata-response';
import { ODataResponseAbstract } from './odata-response-abstract';

export class ODataResponseBatch extends ODataResponseAbstract {
    private static readonly CONTENT_TYPE = 'Content-Type';
    private static readonly CONTENT_ID = 'Content-ID';
    private static readonly HTTP11 = 'HTTP/1.1';
    private static readonly BOUNDARY_PREFIX_SUFFIX = '--';
    private static readonly NEWLINE = '\r\n';
    private static readonly MULTIPART_MIXED = 'multipart/mixed';

    private odataResponses: ODataResponse[];

    constructor(httpResponse: HttpResponse<string>) {
        super(httpResponse);
        this.odataResponses = [];
        this.parseResponses();
    }

    getODataResponses(): ODataResponse[] {
        return this.odataResponses;
    }

    protected parseResponses(): void {
        const contentType: string = this.getHttpResponse().headers.get(ODataResponseBatch.CONTENT_TYPE);
        const boundaryDelimiterBatch: string = this.getBoundaryDelimiter(contentType);
        const boundaryEndBatch: string = this.getBoundaryEnd(boundaryDelimiterBatch);

        const batchBody: string = this.getBodyAsText();
        const batchBodyLines: string[] = batchBody.split(ODataResponseBatch.NEWLINE);

        let odataResponseCS: ODataResponse[];
        let contentId: number;
        let boundaryDelimiterCS;
        let boundaryEndCS;
        let batchPartStartIndex;
        for (let index = 0; index < batchBodyLines.length; index++) {
            const batchBodyLine: string = batchBodyLines[index];

            if (batchBodyLine.startsWith(ODataResponseBatch.CONTENT_TYPE)) {
                const contentTypeValue: string = this.getHeaderValue(batchBodyLine);
                if (contentTypeValue === ODataResponseBatch.MULTIPART_MIXED) {
                    odataResponseCS = [];
                    contentId = undefined;
                    boundaryDelimiterCS = this.getBoundaryDelimiter(batchBodyLine);
                    boundaryEndCS = this.getBoundaryEnd(boundaryDelimiterCS);
                    batchPartStartIndex = undefined;
                }
                continue;
            } else if (Utils.isNotNullNorUndefined(odataResponseCS) && batchBodyLine.startsWith(ODataResponseBatch.CONTENT_ID)) {
                contentId = Number(this.getHeaderValue(batchBodyLine));
            } else if (batchBodyLine.startsWith(ODataResponseBatch.HTTP11)) {
                batchPartStartIndex = index;
            } else if (batchBodyLine === boundaryDelimiterBatch || batchBodyLine === boundaryDelimiterCS
                || batchBodyLine === boundaryEndBatch || batchBodyLine === boundaryEndCS) {
                if (!batchPartStartIndex) {
                    continue;
                }

                const odataResponse: ODataResponse = this.createODataResponse(batchBodyLines, batchPartStartIndex, index - 1);
                if (Utils.isNotNullNorUndefined(odataResponseCS)) {
                    odataResponseCS[contentId] = odataResponse;
                } else {
                    this.odataResponses.push(odataResponse);
                }

                if (batchBodyLine === boundaryDelimiterBatch || batchBodyLine === boundaryDelimiterCS) {
                    batchPartStartIndex = index + 1;
                } else if (batchBodyLine === boundaryEndBatch || batchBodyLine === boundaryEndCS) {
                    if (Utils.isNotNullNorUndefined(odataResponseCS)) {
                        for (const response of odataResponseCS) {
                            if (Utils.isNotNullNorUndefined(response)) {
                                this.odataResponses.push(response);
                            }
                        }
                    }
                    odataResponseCS = undefined;
                    boundaryDelimiterCS = undefined;
                    boundaryEndCS = undefined;
                    batchPartStartIndex = undefined;
                }
            }
        }
    }

    protected getHeaderValue(header: string): string {
        let res: string = header.split(';')[0].trim();
        res = res.split(':')[1].trim();
        return res;
    }

    protected getBoundaryDelimiter(contentType: string): string {
        const contentTypeParts: string[] = contentType.split(';');
        if (contentTypeParts.length === 2) {
            const boundary: string = contentType.split(';')[1].trim();
            const boundaryDelimiter: string = ODataResponseBatch.BOUNDARY_PREFIX_SUFFIX + boundary.split('=')[1];
            return boundaryDelimiter;
        } else {
            return '';
        }
    }

    protected getBoundaryEnd(boundaryDelimiter: string): string {
        if (!boundaryDelimiter.length) {
            return '';
        }
        const boundaryEnd: string = boundaryDelimiter + ODataResponseBatch.BOUNDARY_PREFIX_SUFFIX;
        return boundaryEnd;
    }

    protected createODataResponse(batchBodyLines: string[], batchPartStartIndex: number, batchPartEndIndex: number): ODataResponse {
        let index: number = batchPartStartIndex;
        const statusLine: string = batchBodyLines[index];
        const statusLineParts: string[] = batchBodyLines[index].split(' ');
        const status: string = statusLineParts[1];
        const statusTextIndex = statusLine.indexOf(status) + status.length + 1;
        const statusText: string = statusLine.substring(statusTextIndex);

        let httpHeaders: HttpHeaders = new HttpHeaders();
        for (++index; index <= batchPartEndIndex; index++) {
            const batchBodyLine: string = batchBodyLines[index];

            if (batchBodyLine === '') {
                break;
            }

            const batchBodyLineParts: string[] = batchBodyLine.split(': ');
            httpHeaders = httpHeaders.append(batchBodyLineParts[0].trim(), batchBodyLineParts[1].trim());
        }

        let body = '';
        for (; index <= batchPartEndIndex; index++) {
            body += batchBodyLines[index];
        }

        return new ODataResponse(new HttpResponse({
            body: body,
            headers: httpHeaders,
            status: Number(status),
            statusText: statusText
        }));
    }
}
