import { ODataEntityMeta, ODataEntitiesMeta, ODataPropertyMeta } from './meta';
import { Options } from '../../types';

export type ODataEntity<T> = {entity: T, meta: ODataEntityMeta};
export type ODataEntities<T> = {entities: T[], meta: ODataEntitiesMeta};
export type ODataProperty<T> = {property: T, meta: ODataPropertyMeta};

export type ODataResponseOptions = Options & {streaming: boolean, etag: string};
