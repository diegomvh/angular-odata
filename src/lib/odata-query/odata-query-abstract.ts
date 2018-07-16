import { Utils } from '../utils/utils';
import { ODataService } from '../odata-service/odata.service';

export abstract class ODataQueryAbstract {
  protected odataService: ODataService;
  protected queryString: string;

  constructor(odataService: ODataService) {
    Utils.requireNotNullNorUndefined(odataService, 'odataService');
    this.odataService = odataService;
    this.queryString = "";
  }

  abstract toString();
}
