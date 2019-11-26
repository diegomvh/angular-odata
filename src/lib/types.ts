export type EntityKey = string | number | PlainObject;
export type PlainObject = { [property: string]: any };

// ANNOTATIONS
export const ODATA_ANNOTATION_PREFIX = '@odata';
//odata.context: the context URL for a collection, entity, primitive value, or service document.
export const ODATA_CONTEXT = '@odata.context';
//odata.count: the total count of a collection of entities or collection of entity references, if requested.
export const ODATA_COUNT = '@odata.count';
//odata.nextLink: the next link of a collection with partial results
export const ODATA_NEXTLINK = '@odata.nextLink';
//odata.deltaLink: the delta link for obtaining changes to the result, if requested
export const ODATA_DELTALINK = '@odata.deltaLink';
//odata.id: the ID of the entity
export const ODATA_ID = '@odata.id';
//odata.etag: the ETag of the entity
export const ODATA_ETAG = '@odata.etag';
//odata.readLink: the link used to read the entity, if the edit link cannot be used to read the entity
export const ODATA_READLINK = '@odata.readLink';
//odata.editLink: the link used to edit/update the entity, if the entity is updatable and the odata.id does not represent a URL that can be used to edit the entity
export const ODATA_EDITLINK = '@odata.editLink';
export const ODATA_METADATAETAG = '@odata.metadataEtag';
//odata.associationLink: the link used to describe the relationship between this entity and related entities
export const ODATA_ASSOCIATIONLINK = '@odata.associationLink';
//odata.type: the type of the containing object or targeted property if the type of the object or targeted property cannot be heuristically determined
export const ODATA_TYPE = '@odata.type';
//odata.navigationLink: the link used to retrieve the values of a navigation property
export const ODATA_NAVIGATIONLINK = '@odata.navigationLink';
//Media entities and stream properties may in addition contain the following annotations:
//odata.mediaReadLink: the link used to read the stream
export const ODATA_MEDIA_READLINK = '@odata.mediaReadLink';
//odata.mediaEditLink: the link used to edit/update the stream
export const ODATA_MEDIA_EDITLINK = '@odata.mediaEditLink';
//odata.mediaEtag: the ETag of the stream, as appropriate
export const ODATA_MEDIA_ETAG = '@odata.mediaEtag';
//odata.mediaContentType: the content type of the stream
export const ODATA_MEDIA_CONTENTTYPE = '@odata.mediaContentType';

export const $ID = '$id';
  
// SEGMENTS
export const $METADATA = '$metadata';
export const $BATCH = '$batch';
export const $REF = '$ref';
export const $VALUE = '$value';
export const $COUNT = '$count';

// HEADERS
export const IF_MATCH_HEADER = 'If-Match';

export const VALUE = 'value';
