import { ODataContext } from '../types';
import { VERSION_3_0, VERSION_2_0, VERSION_4_0 } from '../constants';

export const COLLECTION = /Collection\(([\w\.]+)\)/;

export interface ODataVersionTools {
  entity(value: Object, context: ODataContext): any;
  entities(value: Object, context: ODataContext): any;
  property(value: Object, context: ODataContext): any;
  annotations(value: Object): Object;
  attributes(value: Object): Object;
  id(value: Object): string;
  context(value: Object): ODataContext;
  functions(value: Object): Object;
  properties(value: Object): Object;
  etag(value: Object): string;
  mediaEtag(value: Object): string;
  metadataEtag(value: Object): string;
  type(value: Object): string;
  nextLink(value: Object): string;
  readLink(value: Object): string;
  mediaReadLink(value: Object): string;
  editLink(value: Object): string;
  mediaEditLink(value: Object): string;
  mediaContentType(value: Object): string;
  deltaLink(value: Object): string;
  count(value: Object): number;
}

export const OData = {
  //#region Version 4.0
  [VERSION_4_0]: <ODataVersionTools> {
    VALUE: 'value',
    ODATA_ANNOTATION_PREFIX: '@odata',
    ODATA_FUNCTION_PREFIX: '#',
    //odata.id: the ID of the entity
    ODATA_ID: '@odata.id',
    //odata.count: the total count of a collection of entities or collection of entity references, if requested.
    ODATA_COUNT: '@odata.count',
    //odata.context: the context URL for a collection, entity, primitive value, or service document.
    ODATA_CONTEXT: '@odata.context',
    //odata.etag: the ETag of the entity
    ODATA_ETAG: '@odata.etag',
    ODATA_METADATA_ETAG: '@odata.metadataEtag',
    //odata.type: the type of the containing object or targeted property if the type of the object or targeted property cannot be heuristically determined
    ODATA_TYPE: '@odata.type',
    //odata.nextLink: the next link of a collection with partial results
    ODATA_NEXTLINK: '@odata.nextLink',
    //odata.deltaLink: the delta link for obtaining changes to the result, if requested
    ODATA_DELTALINK: '@odata.deltaLink',
    //odata.readLink: the link used to read the entity, if the edit link cannot be used to read the entity
    ODATA_READLINK: '@odata.readLink',
    //odata.editLink: the link used to edit/update the entity, if the entity is updatable and the odata.id does not represent a URL that can be used to edit the entity
    ODATA_EDITLINK: '@odata.editLink',
    //odata.associationLink: the link used to describe the relationship between this entity and related entities
    ODATA_ASSOCIATIONLINK: '@odata.associationLink',
    //odata.navigationLink: the link used to retrieve the values of a navigation property
    ODATA_NAVIGATIONLINK: '@odata.navigationLink',
    //Media entities and stream properties may in addition contain the following annotations:
    //odata.mediaEtag: the ETag of the stream, as appropriate
    ODATA_MEDIA_ETAG: '@odata.mediaEtag',
    //odata.mediaContentType: the content type of the stream
    ODATA_MEDIA_CONTENTTYPE: '@odata.mediaContentType',
    //odata.mediaReadLink: the link used to read the stream
    ODATA_MEDIA_READLINK: '@odata.mediaReadLink',
    //odata.mediaEditLink: the link used to edit/update the stream
    ODATA_MEDIA_EDITLINK: '@odata.mediaEditLink',
    entity(data: Object, context: ODataContext) { return data; },
    entities(data: Object, context: ODataContext) { return data[this.VALUE]; },
    property(data: Object, context: ODataContext) { return data; },
    context(value: Object) {
      if (this.ODATA_CONTEXT in value) {
        let ctx: ODataContext = {};
        const str = value[this.ODATA_CONTEXT] as string;
        const index = str.lastIndexOf("#");
        ctx.metadata = str.substr(0, index);
        const parts = str.substr(index + 1).split("/");
        ctx.entitySet = parts[0];
        if (parts[parts.length - 1] === '$entity') {
          ctx.entity = parts[1];
        } else if (parts.length > 1) {
          ctx.property = parts[1];
        }
        return ctx;
      }
    },
    functions(value: Object) {
      return Object.keys(value)
        .filter(k => k.startsWith(this.ODATA_FUNCTION_PREFIX))
        .reduce((acc, key) => Object.assign(acc, { [key.substr(1)]: value[key] }), {});
    },
    properties(value: Object) {
      return Object.keys(value)
        .filter(k => k.indexOf(this.ODATA_ANNOTATION_PREFIX) > 0)
        .reduce((acc, key) => {
          let name = key.substr(0, key.indexOf(this.ODATA_ANNOTATION_PREFIX));
          if (!(name in acc)) {
            acc[name] = {};
          }
          Object.assign(acc[name], { [key.substr(key.indexOf(this.ODATA_ANNOTATION_PREFIX))]: value[key] });
          return acc;
        }, {});
    },
    id(value: Object): string {
      if (this.ODATA_ID in value) {
        return value[this.ODATA_ID] as string;
      }
    },
    etag(value: Object) {
      if (this.ODATA_ETAG in value) {
        return value[this.ODATA_ETAG] as string;
      }
    },
    mediaEtag(value: Object) {
      if (this.ODATA_MEDIA_ETAG in value)
        return decodeURIComponent(value[this.ODATA_MEDIA_ETAG] as string);
    },
    metadataEtag(value: Object) {
      if (this.ODATA_METADATA_ETAG in value)
        return decodeURIComponent(value[this.ODATA_METADATA_ETAG] as string);
    },
    type(value: Object) {
      if (this.ODATA_TYPE in value) {
        const type = value[this.ODATA_TYPE].substr(1) as string;
        const matches = COLLECTION.exec(type);
        if (matches)
          return matches[1].indexOf('.') === -1 ? `Edm.${matches[1]}` : matches[1];
        return type;
      }
    },
    count(value: Object) {
      if (this.ODATA_COUNT in value)
        return Number(value[this.ODATA_COUNT]);
    },
    annotations(value: Object) {
      return Object.keys(value)
        .filter(key => key.indexOf(this.ODATA_ANNOTATION_PREFIX) !== -1 || key.startsWith(this.ODATA_FUNCTION_PREFIX))
        .reduce((acc, key) => Object.assign(acc, { [key]: value[key] }), {});
    },
    attributes(value: Object) {
      return Object.keys(value)
        .filter(key => key.indexOf(this.ODATA_ANNOTATION_PREFIX) === -1 && !key.startsWith(this.ODATA_FUNCTION_PREFIX))
        .reduce((acc, key) => Object.assign(acc, { [key]: value[key] }), {});
    },
    nextLink(value: Object) {
      if (this.ODATA_NEXTLINK in value)
        return decodeURIComponent(value[this.ODATA_NEXTLINK] as string);
    },
    readLink(value: Object) {
      if (this.ODATA_READLINK in value)
        return decodeURIComponent(value[this.ODATA_READLINK] as string);
    },
    mediaReadLink(value: Object) {
      if (this.ODATA_MEDIA_READLINK in value)
        return decodeURIComponent(value[this.ODATA_MEDIA_READLINK] as string);
    },
    editLink(value: Object) {
      if (this.ODATA_EDITLINK in value)
        return decodeURIComponent(value[this.ODATA_EDITLINK] as string);
    },
    mediaEditLink(value: Object) { 
      if (this.ODATA_MEDIA_EDITLINK in value)
        return decodeURIComponent(value[this.ODATA_MEDIA_EDITLINK] as string);
    },
    deltaLink(value: Object) {
      if (this.ODATA_DELTALINK in value)
        return decodeURIComponent(value[this.ODATA_DELTALINK] as string);
    },
    mediaContentType(value: Object) {
      if (this.ODATA_MEDIA_CONTENTTYPE in value)
        return value[this.ODATA_MEDIA_CONTENTTYPE] as string;
    }
  },
  //#endregion
  //#region Version 3.0
  [VERSION_3_0]: <ODataVersionTools>{
    ODATA_CONTEXT: 'odata.metadata',
    ODATA_NEXTLINK: 'odata.nextLink',
    ODATA_COUNT: 'odata.count',
    VALUE: 'value',
    entity(data: Object, context: ODataContext) { return data; },
    entities(data: Object, context: ODataContext) { return data[this.VALUE]; },
    property(data: Object, context: ODataContext) { return data; },
    annotations(value: Object){ return value; },
    attributes(value: Object){ return value; },
    etag(value: Object) {
      if (this.ODATA_ETAG in value) {
        return value[this.ODATA_ETAG] as string;
      }
    },
    nextLink(value: Object) {
      if (this.ODATA_NEXTLINK in value)
        return decodeURIComponent(value[this.ODATA_NEXTLINK] as string);
    },
    id(value: Object){ return undefined; },
    context(value: Object){ return undefined; },
    functions(value: Object){ return undefined; },
    properties(value: Object){ return undefined; },
    mediaEtag(value: Object){ return undefined; },
    metadataEtag(value: Object){ return undefined; },
    type(value: Object){ return undefined; },
    readLink(value: Object){ return undefined; },
    mediaReadLink(value: Object){ return undefined; },
    editLink(value: Object){ return undefined; },
    mediaEditLink(value: Object){ return undefined; },
    mediaContentType(value: Object){ return undefined; },
    deltaLink(value: Object){ return undefined; },
    count(value: Object) {
      if (this.ODATA_COUNT in value)
        return Number(value[this.ODATA_COUNT]);
    }
  },
  //#endregion
  //#region Version 2.0
  [VERSION_2_0]: <ODataVersionTools>{
    ODATA_NEXTLINK: '__next',
    ODATA_COUNT: '__count',
    RESULTS: 'results',
    entity(data: Object, context: ODataContext) { return data; },
    entities(data: Object, context: ODataContext) { return data[this.RESULTS]; },
    property(data: Object, context: ODataContext) { return data; },
    annotations(value: Object){ return value; },
    attributes(value: Object){ return value; },
    etag(value: Object) {
      if (this.ODATA_ETAG in value) {
        return value[this.ODATA_ETAG] as string;
      }
    },
    nextLink(value: Object) {
      if (this.ODATA_NEXTLINK in value)
        return decodeURIComponent(value[this.ODATA_NEXTLINK] as string);
    },
    id(value: Object){ return undefined; },
    context(value: Object){ return undefined; },
    functions(value: Object){ return undefined; },
    properties(value: Object){ return undefined; },
    mediaEtag(value: Object){ return undefined; },
    metadataEtag(value: Object){ return undefined; },
    type(value: Object){ return undefined; },
    readLink(value: Object){ return undefined; },
    mediaReadLink(value: Object){ return undefined; },
    editLink(value: Object){ return undefined; },
    mediaEditLink(value: Object){ return undefined; },
    mediaContentType(value: Object){ return undefined; },
    deltaLink(value: Object){ return undefined; },
    count(value: Object) {
      if (this.ODATA_COUNT in value)
        return Number(value[this.ODATA_COUNT]);
    }
  }
  //#endregion
}