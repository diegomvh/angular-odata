import { Types } from '../utils/types';
import { PlainObject, ODataRequest } from '../odata-request';

import { ODataSettings } from '../settings';

export interface Key {
  name: string;
  resolve?: (attrs: PlainObject) => number | string | PlainObject;
}

export interface Field {
  name: string;
  type: string;
  default?: any;
  maxLength?: number;
  isCollection?: boolean;
  isNullable?: boolean;
  isFlags?: boolean;
  isNavigation?: boolean;
  field?: string;
  ref?: string;
}

export class Schema<K extends Key, F extends Field, M> {
  keys: K[];
  fields: F[];
  stringAsEnums: boolean;

  configure(settings: ODataSettings) {
    this.stringAsEnums = !!settings.stringAsEnum;
  }

  resolveKey(attrs: Partial<M>) {
    let keys = this.keys
      .map(key => [key.name, (key.resolve) ? key.resolve(attrs) : attrs[key.name]]);
    let key = keys.length === 1 ?
      keys[0][1] :
      keys.reduce((acc, key) => Object.assign(acc, { [key[0]]: key[1] }), {});
    if (!Types.isEmpty(key))
      return key;
  }

  isNew(attrs: Partial<M>) {
    return !this.resolveKey(attrs);
  }

  get navigations(): F[] {
    return this.fields.filter(f => f.isNavigation);
  }

  get properties(): F[] {
    return this.fields.filter(f => !f.isNavigation);
  }
}