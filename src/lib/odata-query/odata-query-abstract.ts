import { Utils } from '../utils/utils';
import { ODataService } from '../odata-service/odata.service';
import { HttpOptionsI } from '../odata-service/http-options';
import { Observable } from 'rxjs';
import { ODataResponse } from '../odata-response/odata-response';

export abstract class ODataQueryAbstract {
  protected odataService: ODataService;
  protected serviceRoot: string;
  protected queryString: string;

  constructor(odataService: ODataService, serviceRoot: string) {
    Utils.requireNotNullNorUndefined(odataService, 'odataService');
    Utils.requireNotNullNorUndefined(serviceRoot, 'serviceRoot');
    Utils.requireNotEmpty(serviceRoot, 'serviceRoot');
    this.odataService = odataService;
    this.serviceRoot = serviceRoot;
    this.queryString = serviceRoot;
  }

  abstract toString();
}
