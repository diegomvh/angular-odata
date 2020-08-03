import { ODataEntityAnnotations, ODataEntitiesAnnotations, ODataPropertyAnnotations } from '../../models/index';

export type ODataEntity<T> = {entity: T, meta: ODataEntityAnnotations};
export type ODataEntities<T> = {entities: T[], meta: ODataEntitiesAnnotations};
export type ODataProperty<T> = {property: T, meta: ODataPropertyAnnotations};
