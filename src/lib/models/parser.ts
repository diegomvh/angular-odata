import { ODataResource } from '../resources/requests';

export interface Parser<T> {
  type: string;
  parse(value: any, query?: ODataResource<any>): T;
  toJSON(value: T | Partial<T>): any;
  parserFor<E>(name: string): Parser<E>;
  resolveKey(attrs: any);
}

export const PARSERS: {[name: string]: Parser<any>} = {
  'Date': <Parser<Date>>{
    type: 'Date',
    parse(value: any, query?: ODataResource<any>) {
      return Array.isArray(value) ?
        value.map(v => new Date(v)) :
        new Date(value);
    },
    toJSON(value: Date) { 
      return Array.isArray(value) ?
        value.map(v => new Date(v)) :
        new Date(value);
    },
    parserFor<E>(name: string) { },
    resolveKey(attrs: any) {}
  },
};