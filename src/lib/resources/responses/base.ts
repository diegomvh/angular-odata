import { ODataAnnotations } from './annotations';

export type ODataSingle<T> = {
  [P in keyof T]?: T[P];
} & { annotations: ODataAnnotations }

export type ODataCollection<T> = { 
  value: T[];
} & { annotations: ODataAnnotations }

export type ODataValue<T> = {
  value: T;
} & { annotations: ODataAnnotations }