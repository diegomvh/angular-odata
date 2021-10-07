import {
  ODataEntitiesAnnotations,
  ODataEntityAnnotations,
  ODataPropertyAnnotations,
} from './annotations';

export type ODataEntity<T> = {
  entity: T | null;
  annots: ODataEntityAnnotations;
};
export type ODataEntities<T> = {
  entities: T[] | null;
  annots: ODataEntitiesAnnotations;
};
export type ODataProperty<T> = {
  property: T | null;
  annots: ODataPropertyAnnotations;
};
