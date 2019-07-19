import { ODataModel } from './odata-model';
import { ODataEntityService } from '../odata-service/odata-entity.service';

export abstract class ODataCollection<M extends ODataModel> {
  protected _service: ODataEntityService<M>;

  constructor(protected models: M[]) {
  }
}
