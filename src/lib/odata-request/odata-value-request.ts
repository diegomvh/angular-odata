import { ODataRequestBase } from './odata-request';
import { ODataService } from '../odata-service/odata.service';
import { Segment, PlainObject } from './odata-request-handlers';

export class ODataValueUrl extends ODataRequestBase {
  public static readonly VALUE = 'value';
  public static readonly $VALUE = '$value';

  constructor(
    service: ODataService,
    segments?: Segment[],
    options?: PlainObject
  ) {
    super(service, segments, options);
    this.wrapSegment(ODataValueUrl.VALUE, ODataValueUrl.$VALUE);
  }
}
