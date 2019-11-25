import { ODataAnnotations } from './annotations';

export type ODataSingle<T> = {
  [P in keyof T]?: T[P];
} & { _odata: ODataAnnotations }

export type ODataCollection<T> = { 
  value: T[];
} & { _odata: ODataAnnotations }

export type ODataValue<T> = {
  value: T;
} & { _odata: ODataAnnotations }