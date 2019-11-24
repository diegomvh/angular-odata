export type EntityKey = string | number | PlainObject;
export type PlainObject = { [property: string]: any };

// ANNOTATIONS
export const ODATA_ANNOTATION_PREFIX = '@odata';
export const ODATA_CONTEXT = '@odata.context';
export const ODATA_METADATAETAG = '@odata.metadataEtag';
export const ODATA_TYPE = '@odata.type';
export const ODATA_COUNT = '@odata.count';
export const ODATA_ID = '@odata.id';
export const ODATA_ETAG = '@odata.etag';
export const ODATA_NEXTLINK = '@odata.nextLink';
export const ODATA_DELTALINK = '@odata.deltaLink';
export const ODATA_EDITLINK = '@odata.editLink';
export const ODATA_READLINK = '@odata.readLink';
export const ODATA_NAVIGATIONLINK = '@odata.navigationLink';
export const ODATA_MEDIA = '@odata.media*';
//The odata.mediaEditLink annotation contains a URL that can be used to update the binary stream associated with the media entity or stream property. It MUST be included for updatable media entities if it differs from the value of the odata.id, and for updatable stream properties if it differs from standard URL conventions.
//The odata.mediaReadLink annotation contains a URL that can be used to read the binary stream associated with the media entity or stream property. It MUST be included if its value differs from the value of the associated odata.mediaEditLink, if present, or the value of the odata.id for media entities if the associated odata.mediaEditLink is not present.
//The odata.mediaContentType annotation MAY be included; its value SHOULD match the content type of the binary stream represented by the odata.mediaReadLink URL. This is only a hint; the actual content type will be included in a header when the resource is requested.
//The odata.mediaEtag annotation MAY be included; its value is the ETag of the binary stream represented by this media entity or stream property.

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
