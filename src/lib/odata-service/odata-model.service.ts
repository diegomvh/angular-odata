import { HttpClient } from '@angular/common/http';

import { ODataContext } from '../odata-context';
import { ODataEntityService } from './odata-entity.service';
import { ODataModel } from '../odata-model/odata-model';
import { ODataCollection } from '../odata-model/odata-collection';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export class ODataModelService<M extends ODataModel, C extends ODataCollection<M>> extends ODataEntityService<M> {
  protected Model: new (...params: any) => M;
  protected Collection: new (...params: any) => C;

  constructor(protected http: HttpClient, protected context: ODataContext, protected set: string) {
    super(http, context, set);
  }

  fetch(entity: any) : Observable<M> {
    return super.fetch(entity)
      .pipe(
        map(attrs => new this.Model(attrs))
      );
  }

}
