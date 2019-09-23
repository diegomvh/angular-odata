import { ODataRequestBase } from './odata-request';
import { ODataRefUrl } from './odata-ref-request';
import { ODataSingleUrl } from './odata-single-request';
import { ODataCollectionUrl } from './odata-collection-request';

export class ODataNavigationPropertyUrl<T> extends ODataRequestBase {
  name(name: string) {
    this.removeSelect();
    this.removeExpand();
    return this.wrapSegment(ODataRequestBase.NAVIGATION_PROPERTY, name);
  }

  ref() {
    return this.clone(ODataRefUrl) as ODataRefUrl;
  }

  single() {
    return this.clone(ODataSingleUrl) as ODataSingleUrl<T>;
  }

  collection() {
    return this.clone(ODataCollectionUrl) as ODataCollectionUrl<T>;
  }
}
