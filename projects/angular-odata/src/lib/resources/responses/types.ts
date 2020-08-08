import { ODataEntityMeta, ODataEntitiesMeta, ODataPropertyMeta } from './meta';

export type ODataEntity<T> = {entity: T | null, meta: ODataEntityMeta};
export type ODataEntities<T> = {entities: T[] | null, meta: ODataEntitiesMeta};
export type ODataProperty<T> = {property: T | null, meta: ODataPropertyMeta};
