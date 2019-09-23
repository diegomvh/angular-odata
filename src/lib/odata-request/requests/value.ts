import { ODataRequest } from '../request';
import { ODataService } from '../../odata-service/odata.service';
import { ODataSegment, PlainObject, Segments } from '../types';

export class ODataValueRequest extends ODataRequest {
  public static readonly $VALUE = '$value';

}
