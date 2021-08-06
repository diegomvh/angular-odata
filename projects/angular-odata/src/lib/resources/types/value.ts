import { Observable } from 'rxjs';

import { ODataResource } from '../resource';
import { ODataPathSegments, PathSegmentNames } from '../path-segments';
import { ODataQueryOptions } from '../query-options';
import { HttpOptions } from './options';
import { $VALUE } from '../../constants';
import { ODataApi } from '../../api';

export class ODataValueResource<T> extends ODataResource<T> {
  //#region Factory
  static factory<V>(
    api: ODataApi,
    type: string | undefined,
    segments: ODataPathSegments,
    options: ODataQueryOptions
  ) {
    const segment = segments.add(PathSegmentNames.value, $VALUE);
    if (type) segment.type(type);
    options.clear();
    return new ODataValueResource<V>(api, segments, options);
  }
  //#endregion

  clone() {
    return new ODataValueResource<T>(
      this.api,
      this.cloneSegments(),
      this.cloneQuery()
    );
  }

  schema() {
    return undefined;
  }
  serializer<E>() {
    const type = this.type();
    return type !== undefined
      ? this.api.parserForType<E>(type)
      : undefined;
  }

  deserializer<E>() {
    const type = this.returnType();
    return type !== undefined
      ? this.api.parserForType<E>(type)
      : undefined;
  }

  encoder<E>() {
    const type = this.type();
    return type !== undefined
      ? this.api.parserForType<E>(type)
      : undefined;
  }

  //#region Shortcuts
  fetch(options?: HttpOptions): Observable<number> {
    return super.get({ responseType: 'value', ...options });
  }
  fetchValue(options?: HttpOptions): Observable<number> {
    return this.fetch(options);
  }
  //#endregion
}
