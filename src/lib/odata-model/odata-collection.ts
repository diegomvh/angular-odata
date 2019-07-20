import { ODataModel } from './odata-model';
import { ODataEntityService } from '../odata-service/odata-entity.service';

export class ODataCollection<M extends ODataModel> {
  static Model: new (...params: any) => ODataModel = ODataModel;
  service: ODataEntityService<M>;

  constructor(values: any[], opts: {parse: boolean, service: ODataEntityService<M>}) {
  }
}
