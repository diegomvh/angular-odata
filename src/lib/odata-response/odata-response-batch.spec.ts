import { ODataResponseBatch } from './odata-response-batch';
import { HttpResponse, HttpHeaders } from '@angular/common/http';
import { ODataResponse } from './odata-response';

describe('ODataResponseBatch', () => {
    // odata batch response example from page http://docs.oasis-open.org/odata/odata/v4.0/errata03/os/complete/part1-protocol/odata-v4.0-errata03-os-part1-protocol-complete.html#_Toc453752317
    it('test parser', () => {
        const body = '--b_243234_25424_ef_892u748\r\nContent-Type: application/http\r\n\r\nHTTP/1.1 200 Ok\r\nContent-Type: application/json\r\nContent-Length: ###\r\n\r\n<JSON representation of the Customer entity with EntityKey ALFKI>\r\n\r\n--b_243234_25424_ef_892u748\r\nContent-Type: multipart/mixed; boundary=cs_12u7hdkin252452345eknd_383673037\r\n\r\n--cs_12u7hdkin252452345eknd_383673037\r\nContent-Type: application/http\r\nContent-ID: 1\r\n\r\nHTTP/1.1 201 Created\r\nContent-Type: application/json\r\nLocation: http://host/service.svc/Customer(\'POIUY\')\r\nContent-Length: ###\r\n\r\n<JSON representation of a new Customer entity>\r\n\r\n--cs_12u7hdkin252452345eknd_383673037\r\nContent-Type: application/http\r\nContent-ID: 2\r\n\r\nHTTP/1.1 204 No Content\r\nHost: host\r\n\r\n\r\n--cs_12u7hdkin252452345eknd_383673037--\r\n\r\n--b_243234_25424_ef_892u748\r\nContent-Type: application/http\r\n\r\nHTTP/1.1 404 Not Found\r\nContent-Type: application/xml\r\nContent-Length: ###\r\n\r\n<Error message>\r\n--b_243234_25424_ef_892u748--';
        const headers: HttpHeaders = new HttpHeaders({
            'Content-Type': 'multipart/mixed; boundary=b_243234_25424_ef_892u748'
        });
        const status = 200;
        const statusText = 'Ok';
        const httpResponse: HttpResponse<string> = new HttpResponse({
            body: body,
            headers: headers,
            status: status,
            statusText: statusText,
        });

        const odataResponse: ODataResponse = new ODataResponse(httpResponse);
        const odataResponseBatch: ODataResponseBatch = odataResponse.toODataResponseBatch();
        const responses: ODataResponse[] = odataResponseBatch.getODataResponses();
        expect(responses.length).toEqual(4);

        let response: ODataResponse = responses[0];
        expect(response.getHttpResponse().status).toEqual(200);
        expect(response.getHttpResponse().statusText).toEqual('Ok');
        expect(response.getHttpResponse().headers.get('Content-Type')).toEqual('application/json');
        expect(response.getHttpResponse().headers.get('Content-Length')).toEqual('###');
        expect(response.getHttpResponse().body).toEqual('<JSON representation of the Customer entity with EntityKey ALFKI>');

        response = responses[1];
        expect(response.getHttpResponse().status).toEqual(201);
        expect(response.getHttpResponse().statusText).toEqual('Created');
        expect(response.getHttpResponse().headers.get('Content-Type')).toEqual('application/json');
        expect(response.getHttpResponse().headers.get('Location')).toEqual('http://host/service.svc/Customer(\'POIUY\')');
        expect(response.getHttpResponse().headers.get('Content-Length')).toEqual('###');
        expect(response.getHttpResponse().body).toEqual('<JSON representation of a new Customer entity>');

        response = responses[2];
        expect(response.getHttpResponse().status).toEqual(204);
        expect(response.getHttpResponse().statusText).toEqual('No Content');
        expect(response.getHttpResponse().headers.get('Host')).toEqual('host');
        expect(response.getHttpResponse().body).toEqual('');

        response = responses[3];
        expect(response.getHttpResponse().status).toEqual(404);
        expect(response.getHttpResponse().statusText).toEqual('Not Found');
        expect(response.getHttpResponse().headers.get('Content-Type')).toEqual('application/xml');
        expect(response.getHttpResponse().headers.get('Content-Length')).toEqual('###');
        expect(response.getHttpResponse().body).toEqual('<Error message>');
    });
});
