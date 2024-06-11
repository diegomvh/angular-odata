import { Observable } from 'rxjs';
import { ODataApi } from '../../api';
import { $VALUE } from '../../constants';
import { PathSegment } from '../../types';
import { ODataPathSegments } from '../path';
import { ODataResource } from '../resource';
import { ODataOptions } from './options';

export class ODataValueResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<V>(
    api: ODataApi,
    {
      segments,
    }: {
      segments: ODataPathSegments;
    },
  ) {
    const currentType = segments.last()?.outgoingType();
    const segment = segments.add(PathSegment.value, $VALUE);
    segment.incomingType(currentType);
    return new ODataValueResource<V>(api, { segments });
  }

  static fromResource<V>(resource: ODataResource<any>) {
    const baseType = resource.outgoingType();
    let baseSchema = baseType !== undefined ? resource.api.structuredType<any>(baseType) : undefined;
    const value = ODataValueResource.factory<V>(
      resource.api,
      {
        segments: resource.cloneSegments(),
      }
    );

    // Switch entitySet to binding type if available
    if (baseSchema !== undefined && baseSchema.type() !== baseType) {
      let entitySet = resource.api.findEntitySetForType(baseSchema.type());
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
