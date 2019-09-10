import { PlainObject } from './odata-query-builder';

export interface ODataQueryType {
  toString(): string;
  path(): string;
  params(): PlainObject;
}