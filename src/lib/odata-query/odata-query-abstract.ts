import { Utils } from '../utils/utils';
import { ODataService } from '../odata-service/odata.service';

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
