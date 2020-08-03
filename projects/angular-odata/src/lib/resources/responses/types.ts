import { ODataEntityMeta, ODataEntitiesMeta, ODataPropertyMeta } from './meta';

export type ODataEntity<T> = {entity: T, meta: ODataEntityMeta};
export type ODataEntities<T> = {entities: T[], meta: ODataEntitiesMeta};
export type ODataProperty<T> = {property: T, meta: ODataPropertyMeta};
