import { ODataSingleUrl } from './odata-single-request';

export class ODataSingletonUrl<T> extends ODataSingleUrl<T> {
  public static readonly SINGLETON = 'singleton';

  name(name: string) {
    return this.wrapSegment(ODataSingletonUrl.SINGLETON, name);
  }
}
