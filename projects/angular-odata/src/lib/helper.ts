import {
  VERSION_3_0,
  VERSION_2_0,
  VERSION_4_0,
  $COUNT,
  $INLINECOUNT,
} from './constants';

export const COLLECTION = /Collection\(([\w\.]+)\)/;

export type ODataContext = {
  serviceRootUrl?: string;
  metadataUrl?: string;
  entitySet?: string;
  key?: string;
  type?: string;
  property?: string;
  //entity?: boolean;
};

export interface ODataVersionHelper {
  VALUE: string;
  ODATA_ANNOTATION_PREFIX: string;
  ODATA_FUNCTION_PREFIX: string;
  ODATA_ID: string;
  ODATA_COUNT: string;
  ODATA_ETAG: string;
  ODATA_CONTEXT: string;
  ODATA_MEDIA_ETAG: string;
  entity(value: { [name: string]: any }, context: ODataContext): any;
  entities(value: { [name: string]: any }, context: ODataContext): any;
  property(value: { [name: string]: any }, context: ODataContext): any;
  annotations(value: { [name: string]: any }): { [name: string]: any };
  attributes(value: { [name: string]: any }): { [name: string]: any };
  //Get or Set Id
  id(value: { [name: string]: any }, id?: string): string | undefined;
  //Get or Set Etag
  etag(value: { [name: string]: any }, etag?: string): string | undefined;
  count(value: { [name: string]: any }): number | undefined;
  context(value: { [name: string]: any }): ODataContext;
  functions(value: { [name: string]: any }): { [name: string]: any };
  properties(value: { [name: string]: any }): { [name: string]: any };
  mediaEtag(value: { [name: string]: any }): string | undefined;
  metadataEtag(value: { [name: string]: any }): string | undefined;
  type(value: { [name: string]: any }): string | undefined;
  nextLink(value: { [name: string]: any }): string | undefined;
  readLink(value: { [name: string]: any }): string | undefined;
  mediaReadLink(value: { [name: string]: any }): string | undefined;
  editLink(value: { [name: string]: any }): string | undefined;
  mediaEditLink(value: { [name: string]: any }): string | undefined;
  mediaContentType(value: { [name: string]: any }): string | undefined;
  deltaLink(value: { [name: string]: any }): string | undefined;
  countParam(): { [name: string]: string };
}

const ODataVersionBaseHelper = <any>{
  entity(data: { [name: string]: any }, context: ODataContext) {
    return data;
  },
  entities(data: { [name: string]: any }, context: ODataContext) {
    return data[this.VALUE];
  },
  property(data: { [name: string]: any }, context: ODataContext) {
    return this.VALUE in data ? data[this.VALUE] : data;
  },
  functions(value: { [name: string]: any }) {
    return Object.keys(value)
      .filter((k) => k.startsWith(this.ODATA_FUNCTION_PREFIX))
      .reduce(
        (acc, key) => Object.assign(acc, { [key.substr(1)]: value[key] }),
        {}
      );
  },
  properties(value: { [name: string]: any }) {
    return Object.keys(value)
      .filter((k) => k.indexOf(this.ODATA_ANNOTATION_PREFIX) > 0)
      .reduce((acc: { [name: string]: any }, key) => {
        let name = key.substr(0, key.indexOf(this.ODATA_ANNOTATION_PREFIX));
        if (!(name in acc)) {
          acc[name] = {};
        }
        Object.assign(acc[name], {
          [key.substr(key.indexOf(this.ODATA_ANNOTATION_PREFIX))]: value[key],
        });
        return acc;
      }, {});
  },
  id(value: { [name: string]: any }, id?: string) {
    if (id !== undefined) value[this.ODATA_ID] = id;
    return this.ODATA_ID in value
      ? (value[this.ODATA_ID] as string)
      : undefined;
  },
  etag(value: { [name: string]: any }, etag?: string) {
    if (etag !== undefined) value[this.ODATA_ETAG] = etag;
    return this.ODATA_ETAG in value
      ? (value[this.ODATA_ETAG] as string)
      : undefined;
  },
  mediaEtag(value: { [name: string]: any }) {
    return this.ODATA_MEDIA_ETAG in value
      ? decodeURIComponent(value[this.ODATA_MEDIA_ETAG] as string)
      : undefined;
  },
  metadataEtag(value: { [name: string]: any }) {
    return this.ODATA_METADATA_ETAG in value
      ? decodeURIComponent(value[this.ODATA_METADATA_ETAG] as string)
      : undefined;
  },
  type(value: { [name: string]: any }) {
    if (this.ODATA_TYPE in value) {
      const type = value[this.ODATA_TYPE].substr(1) as string;
      const matches = COLLECTION.exec(type);
      if (matches)
        return matches[1].indexOf('.') === -1
          ? `Edm.${matches[1]}`
          : matches[1];
      return type;
    }
    return undefined;
  },
  count(value: { [name: string]: any }) {
    return this.ODATA_COUNT in value
      ? Number(value[this.ODATA_COUNT])
      : undefined;
  },
  annotations(value: { [name: string]: any }) {
    return Object.keys(value)
      .filter(
        (key) =>
          key.indexOf(this.ODATA_ANNOTATION_PREFIX) !== -1 ||
          key.startsWith(this.ODATA_FUNCTION_PREFIX)
      )
      .reduce((acc, key) => Object.assign(acc, { [key]: value[key] }), {});
  },
  attributes(value: { [name: string]: any }) {
    return Object.keys(value)
      .filter(
        (key) =>
          key.indexOf(this.ODATA_ANNOTATION_PREFIX) === -1 &&
          !key.startsWith(this.ODATA_FUNCTION_PREFIX)
      )
      .reduce((acc, key) => Object.assign(acc, { [key]: value[key] }), {});
  },
  nextLink(value: { [name: string]: any }) {
    return this.ODATA_NEXTLINK in value
      ? decodeURIComponent(value[this.ODATA_NEXTLINK] as string)
      : undefined;
  },
  readLink(value: { [name: string]: any }) {
    return this.ODATA_READLINK in value
      ? decodeURIComponent(value[this.ODATA_READLINK] as string)
      : undefined;
  },
  mediaReadLink(value: { [name: string]: any }) {
    return this.ODATA_MEDIA_READLINK in value
      ? decodeURIComponent(value[this.ODATA_MEDIA_READLINK] as string)
      : undefined;
  },
  editLink(value: { [name: string]: any }) {
    return this.ODATA_EDITLINK in value
      ? decodeURIComponent(value[this.ODATA_EDITLINK] as string)
      : undefined;
  },
  mediaEditLink(value: { [name: string]: any }) {
    return this.ODATA_MEDIA_EDITLINK in value
      ? decodeURIComponent(value[this.ODATA_MEDIA_EDITLINK] as string)
      : undefined;
  },
  deltaLink(value: { [name: string]: any }) {
    return this.ODATA_DELTALINK in value
      ? decodeURIComponent(value[this.ODATA_DELTALINK] as string)
      : undefined;
  },
  mediaContentType(value: { [name: string]: any }) {
    return this.ODATA_MEDIA_CONTENTTYPE in value
      ? decodeURIComponent(value[this.ODATA_MEDIA_CONTENTTYPE] as string)
      : undefined;
  },
};

export const ODataHelper = {
  //#region Version 4.0
  [VERSION_4_0]: <ODataVersionHelper>Object.assign({}, ODataVersionBaseHelper, {
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
    //odata.type: the type of the containing {[name: string]: any} or targeted property if the type of the {[name: string]: any} or targeted property cannot be heuristically determined
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
    //http://nb-mdp-dev01:57970/$metadata#recursos/$entity
    //http://nb-mdp-dev01:57970/$metadata#categorias
    //http://nb-mdp-dev01:57970/$metadata#juzgados
    //http://nb-mdp-dev01:57970/$metadata#Collection(SIU.Recursos.RecursoEntry)
    //http://nb-mdp-dev01:57970/$metadata#categorias/$entity
    //http://nb-mdp-dev01:57970/$metadata#categorias(children(children(children(children(children(children(children(children(children(children()))))))))))/$entity
    //http://nb-mdp-dev01:57970/$metadata#recursos/SIU.Documentos.Documento/$entity
    //http://nb-mdp-dev01:57970/$metadata#SIU.Api.Infrastructure.Storage.Backend.SiuUrls
    context(value: { [name: string]: any }) {
      let ctx: ODataContext = {};
      if (this.ODATA_CONTEXT in value) {
        const str = value[this.ODATA_CONTEXT] as string;
        let index = str.indexOf('$metadata');
        ctx.serviceRootUrl = str.substr(0, index);
        index = str.indexOf('#');
        ctx.metadataUrl = str.substr(0, index);
        const parts = str.substr(index + 1).split('/');
        const col = COLLECTION.exec(parts[0]);
        if (col) {
          ctx.type = col[1];
        } else if (parts[0].indexOf('.') !== -1) {
          ctx.type = parts[0];
        } else {
          const prop = parts[0].match(/([\w\d\-_]+)\(([\(\)\w\d\-_]+)\)/);
          if (prop) {
            ctx.entitySet = prop[1];
            ctx.key = prop[2];
            ctx.property = parts[1];
          } else {
            ctx.entitySet = parts[0];
            if (parts[1] && parts[1] !== '$entity') ctx.type = parts[1];
          }
        }
      }
      return ctx;
    },
    countParam() {
      return { [$COUNT]: 'true' };
    },
  }),
  //#endregion
  //#region Version 3.0
  [VERSION_3_0]: <ODataVersionHelper>Object.assign({}, ODataVersionBaseHelper, {
    ODATA_ANNOTATION_PREFIX: 'odata.',
    ODATA_FUNCTION_PREFIX: '',
    ODATA_ID: 'odata.id',
    ODATA_ETAG: 'odata.etag',
    ODATA_CONTEXT: 'odata.metadata',
    ODATA_NEXTLINK: 'odata.nextLink',
    ODATA_TYPE: 'odata.type',
    ODATA_COUNT: 'odata.count',
    VALUE: 'value',
    context(value: { [name: string]: any }) {
      let ctx: ODataContext = {};
      if (this.ODATA_CONTEXT in value) {
        const str = value[this.ODATA_CONTEXT] as string;
        let index = str.indexOf('$metadata');
        ctx.serviceRootUrl = str.substr(0, index);
        index = str.indexOf('#');
        ctx.metadataUrl = str.substr(0, index);
        const parts = str.substr(index + 1).split('/');
        ctx.entitySet = parts[0];
      }
      return ctx;
    },
    countParam() {
      return { [$INLINECOUNT]: 'allpages' };
    },
  }),
  //#endregion
  //#region Version 2.0
  [VERSION_2_0]: <ODataVersionHelper>Object.assign({}, ODataVersionBaseHelper, {
    ODATA_ID: 'id',
    ODATA_ETAG: 'etag',
    ODATA_ANNOTATION: '__metadata',
    ODATA_NEXTLINK: '__next',
    ODATA_COUNT: '__count',
    ODATA_DEFERRED: '__deferred',
    ODATA_TYPE: 'type',
    VALUE: 'results',
    annotations(value: { [name: string]: any }) {
      if (this.ODATA_ANNOTATION in value) return value[this.ODATA_ANNOTATION];
      return value;
    },
    attributes(value: { [name: string]: any }) {
      return value;
    },
    countParam() {
      return { [$INLINECOUNT]: 'allpages' };
    },
  }),
  //#endregion
};
