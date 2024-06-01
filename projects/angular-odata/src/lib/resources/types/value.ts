import { Observable } from 'rxjs';
import type { ODataApi } from '../../api';
import { $VALUE } from '../../constants';
import { ODataStructuredType } from '../../schema/structured-type';
import { PathSegment } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataQueryOptions } from '../query';
import { ODataResource } from '../resource';
import { ODataOptions } from './options';

export class ODataValueResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<V>(
    api: ODataApi,
    {
      type,
      schema,
      segments,
      query,
    }: {
      type?: string;
      schema?: ODataStructuredType<V>;
      segments: ODataPathSegments;
      query?: ODataQueryOptions<V>;
    },
  ) {
    const baseType = type;
    const bindingType = schema?.type();

    const segment = segments.add(PathSegment.value, $VALUE);
    if (schema !== undefined) segment.type(schema.type());
    else if (type !== undefined) segment.type(type);

    query?.clear();
    const value = new ODataValueResource<V>(api, { segments, query, schema });

    // Switch entitySet to binding type if available
    if (bindingType !== undefined && bindingType !== baseType) {
      let entitySet = api.findEntitySetForType(bindingType);
      if (entitySet !== undefined) {
        value.segment((s) => s.entitySet().path(entitySet!.name));
      }
    }

    return value;
  }
  override clone(): ODataValueResource<T> {
    return super.clone() as ODataValueResource<T>;
  }
  //#endregion

  //#region Requests
  protected override get(options: ODataOptions = {}): Observable<T> {
    return super.get({ responseType: 'value', ...options });
  }
  //#endregion

  //#region Shortcuts

  /**
   * Fetch the value of the resource.
   * @param options OData options.
   * @returns Observable of the value.
   */
  fetch(options?: ODataOptions): Observable<T> {
    return this.get(options);
  }

  //#endregion
}
