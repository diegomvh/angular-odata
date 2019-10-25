import { HttpHeaders, HttpResponse } from '@angular/common/http';

import { Types } from '../../utils/types';

export class ODataBatch {
    private static readonly CONTENT_TYPE = 'Content-Type';
    private static readonly CONTENT_ID = 'Content-ID';
    private static readonly HTTP11 = 'HTTP/1.1';
    private static readonly BOUNDARY_PREFIX_SUFFIX = '--';
    private static readonly NEWLINE = '\r\n';
    private static readonly MULTIPART_MIXED = 'multipart/mixed';

    private httpResponse: HttpResponse<string>;
    private odataResponses: HttpResponse<string>[];

    constructor(httpResponse: HttpResponse<string>) {
        this.httpResponse = httpResponse;
        this.odataResponses = [];
        this.parseResponses();
    }

    getODataResponses(): HttpResponse<string>[] {
        return this.odataResponses;
    }

    static fromODataResponse(odataResponse: HttpResponse<string>): ODataBatch {
        return new ODataBatch(odataResponse);
    }

    protected parseResponses(): void {
        const contentType: string = this.httpResponse.headers.get(ODataBatch.CONTENT_TYPE);
        const boundaryDelimiterBatch: string = this.getBoundaryDelimiter(contentType);
        const boundaryEndBatch: string = this.getBoundaryEnd(boundaryDelimiterBatch);

        const batchBody: string = this.httpResponse.body;
        const batchBodyLines: string[] = batchBody.split(ODataBatch.NEWLINE);

        let odataResponseCS: HttpResponse<any>[];
        let contentId: number;
        let boundaryDelimiterCS;
        let boundaryEndCS;
        let batchPartStartIndex;
        for (let index = 0; index < batchBodyLines.length; index++) {
            const batchBodyLine: string = batchBodyLines[index];

            if (batchBodyLine.startsWith(ODataBatch.CONTENT_TYPE)) {
                const contentTypeValue: string = this.getHeaderValue(batchBodyLine);
                if (contentTypeValue === ODataBatch.MULTIPART_MIXED) {
                    odataResponseCS = [];
                    contentId = undefined;
                    boundaryDelimiterCS = this.getBoundaryDelimiter(batchBodyLine);
                    boundaryEndCS = this.getBoundaryEnd(boundaryDelimiterCS);
                    batchPartStartIndex = undefined;
                }
                continue;
            } else if (Types.isNotNullNorUndefined(odataResponseCS) && batchBodyLine.startsWith(ODataBatch.CONTENT_ID)) {
                contentId = Number(this.getHeaderValue(batchBodyLine));
            } else if (batchBodyLine.startsWith(ODataBatch.HTTP11)) {
                batchPartStartIndex = index;
            } else if (batchBodyLine === boundaryDelimiterBatch || batchBodyLine === boundaryDelimiterCS
                || batchBodyLine === boundaryEndBatch || batchBodyLine === boundaryEndCS) {
                if (!batchPartStartIndex) {
                    continue;
                }

                const odataResponse: HttpResponse<any> = this.createODataResponse(batchBodyLines, batchPartStartIndex, index - 1);
                if (Types.isNotNullNorUndefined(odataResponseCS)) {
                    odataResponseCS[contentId] = odataResponse;
                } else {
                    this.odataResponses.push(odataResponse);
                }

                if (batchBodyLine === boundaryDelimiterBatch || batchBodyLine === boundaryDelimiterCS) {
                    batchPartStartIndex = index + 1;
                } else if (batchBodyLine === boundaryEndBatch || batchBodyLine === boundaryEndCS) {
                    if (Types.isNotNullNorUndefined(odataResponseCS)) {
                        for (const response of odataResponseCS) {
                            if (Types.isNotNullNorUndefined(response)) {
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
            const boundaryDelimiter: string = ODataBatch.BOUNDARY_PREFIX_SUFFIX + boundary.split('=')[1];
            return boundaryDelimiter;
        } else {
            return '';
        }
    }

    protected getBoundaryEnd(boundaryDelimiter: string): string {
        if (!boundaryDelimiter.length) {
            return '';
        }
        const boundaryEnd: string = boundaryDelimiter + ODataBatch.BOUNDARY_PREFIX_SUFFIX;
        return boundaryEnd;
    }

    protected createODataResponse(batchBodyLines: string[], batchPartStartIndex: number, batchPartEndIndex: number): HttpResponse<any> {
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

        return new HttpResponse({
            body,
            headers: httpHeaders,
            status: Number(status),
            statusText
        });
    }
}
