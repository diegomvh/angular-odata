import { ODataEntityOptions, ODataEntitiesOptions, ODataPropertyOptions } from './options';

export type ODataEntity<T> = {entity: T, meta: ODataEntityOptions};
export type ODataEntities<T> = {entities: T[], meta: ODataEntitiesOptions};
export type ODataProperty<T> = {property: T, meta: ODataPropertyOptions};
