import {
  VERSION_3_0,
  VERSION_2_0,
  VERSION_4_0,
  $COUNT,
  $INLINECOUNT,
} from './constants';
import { ODataMetadataType } from './types';

export const COLLECTION = /Collection\(([\w\.]+)\)/;
export const PROPERTY = /([\w\d\-_]+)\(([\'\w\d\-_=]+)\)/;
export const EXPAND = /([\w\d\-_]+)\(([\w\d\,\(\)]+)\)/;

export type ODataContext = {
  serviceRootUrl?: string;
  metadataUrl?: string;
  entitySet?: string;
  key?: string;
  expand?: string;
  type?: string;
  property?: string;
  entity?: boolean;
};

export interface ODataVersionHelper {
  VALUE: string;
  ODATA_ANNOTATION_PREFIX: string;
  ODATA_FUNCTION_PREFIX: string;
  ODATA_ID: string;
  ODATA_TYPE: string;
  ODATA_COUNT: string;
  ODATA_ETAG: string;
  ODATA_CONTEXT: string;
  ODATA_MEDIA_ETAG: string;

  entity(value: { [key: string]: any }): any;
  entities(value: { [key: string]: any }): any;
  property(value: { [key: string]: any }): any;
  annotations(value: { [key: string]: any }): Map<string, any>;
  attributes(value: { [key: string]: any }, metadata: ODataMetadataType): any;
  context(value: { [key: string]: any }): ODataContext;

  id(annots: Map<string, any>): string | undefined;
  etag(annots: Map<string, any>): string | undefined;
  type(annots: Map<string, any>): string | undefined;
  count(annots: Map<string, any>): number | undefined;
  functions(annots: Map<string, any>): Map<string, any>;
  properties(annots: Map<string, any>): Map<string, Map<string, any>>;
  mediaEtag(annots: Map<string, any>): string | undefined;
  metadataEtag(annots: Map<string, any>): string | undefined;
  nextLink(annots: Map<string, any>): string | undefined;
  readLink(annots: Map<string, any>): string | undefined;
  mediaReadLink(annots: Map<string, any>): string | undefined;
  editLink(annots: Map<string, any>): string | undefined;
  mediaEditLink(annots: Map<string, any>): string | undefined;
  mediaContentType(annots: Map<string, any>): string | undefined;
  deltaLink(annots: Map<string, any>): string | undefined;
  countParam(): { [key: string]: string };
}

const ODataVersionBaseHelper = <any>{
  entity(data: { [key: string]: any }) {
    return data;
  },
  entities(data: { [key: string]: any }) {
    return data[this.VALUE];
  },
  property(data: { [key: string]: any }) {
    return this.VALUE in data ? data[this.VALUE] : data;
  },
  functions(annots: Map<string, any>) {
    const funcs = new Map<string, any>();
    [...annots.keys()]
      .filter((key) => key.startsWith(this.ODATA_FUNCTION_PREFIX))
      .forEach(key => funcs.set(key.substring(this.ODATA_FUNCTION_PREFIX.length), annots.get(key)));
    return funcs;     
  },
  properties(annots: Map<string, any>) {
    const props = new Map<string, Map<string, any>>();
    [...annots.keys()]
      .filter((key) => key.indexOf(this.ODATA_ANNOTATION_PREFIX) > 0)
      .forEach(key => {
        let name = key.substring(0, key.indexOf(this.ODATA_ANNOTATION_PREFIX));
        let prop = props.has(name) ? props.get(name)! : new Map<string, any>();
        prop.set(key.substring(key.indexOf(this.ODATA_ANNOTATION_PREFIX)), annots.get(key));
        props.set(name, prop);
      }); 
    return props;     
  },
  id(annots: Map<string, any>) {
    return annots.has(this.ODATA_ID)
      ? (annots.get(this.ODATA_ID) as string)
      : undefined;
  },
  etag(annots: Map<string, any>) {
    return annots.has(this.ODATA_ETAG)
      ? (annots.get(this.ODATA_ETAG) as string)
      : undefined;
  },
  type(annots: Map<string, any>) {
    if (!annots.has(this.ODATA_TYPE)) return undefined;
    const t = annots.get(this.ODATA_TYPE).substring(1);
    const matches = COLLECTION.exec(t);
    if (matches)
      return matches[1].indexOf('.') === -1 ? `Edm.${matches[1]}` : matches[1];
    return t;
  },
  mediaEtag(annots: Map<string, any>) {
    return annots.has(this.ODATA_MEDIA_ETAG)
      ? decodeURIComponent(annots.get(this.ODATA_MEDIA_ETAG) as string)
      : undefined;
  },
  metadataEtag(annots: Map<string, any>) {
    return annots.has(this.ODATA_METADATA_ETAG)
      ? decodeURIComponent(annots.get(this.ODATA_METADATA_ETAG) as string)
      : undefined;
  },
  count(annots: Map<string, any>) {
    return annots.has(this.ODATA_COUNT)
      ? Number(annots.get(this.ODATA_COUNT))
      : undefined;
  },
  annotations(value: { [key: string]: any }) {
    const annots = new Map<string, any>();
    Object.entries(value)
      .filter(
        ([key, ]) =>
          key.indexOf(this.ODATA_ANNOTATION_PREFIX) !== -1 ||
          key.startsWith(this.ODATA_FUNCTION_PREFIX)
      ).forEach(([key, value]) => annots.set(key, value));
    return annots;
  },
  attributes(value: { [key: string]: any }, metadata: ODataMetadataType) {
    return Object.entries(value)
      .filter(
        ([k]) =>
          metadata === 'none' ||
          (metadata === 'minimal' &&
            (k.indexOf(this.ODATA_ANNOTATION_PREFIX) === -1 ||
              k.startsWith(this.ODATA_ANNOTATION_PREFIX)) &&
            !k.startsWith(this.ODATA_FUNCTION_PREFIX)) ||
          (metadata === 'full' &&
            k.indexOf(this.ODATA_ANNOTATION_PREFIX) === -1 &&
            !k.startsWith(this.ODATA_FUNCTION_PREFIX))
      )
      .reduce((acc, e) => ({ ...acc, [e[0]]: e[1] }), {});
  },
  nextLink(annots: Map<string, any>) {
    return annots.has(this.ODATA_NEXTLINK)
      ? decodeURIComponent(annots.get(this.ODATA_NEXTLINK) as string)
      : undefined;
  },
  readLink(annots: Map<string, any>) {
    return annots.has(this.ODATA_READLINK)
      ? decodeURIComponent(annots.get(this.ODATA_READLINK) as string)
      : undefined;
  },
  mediaReadLink(annots: Map<string, any>) {
    return annots.has(this.ODATA_MEDIA_READLINK)
      ? decodeURIComponent(annots.get(this.ODATA_MEDIA_READLINK) as string)
      : undefined;
  },
  editLink(annots: Map<string, any>) {
    return annots.has(this.ODATA_EDITLINK)
      ? decodeURIComponent(annots.get(this.ODATA_EDITLINK) as string)
      : undefined;
  },
  mediaEditLink(annots: Map<string, any>) {
    return annots.has(this.ODATA_MEDIA_EDITLINK)
      ? decodeURIComponent(annots.get(this.ODATA_MEDIA_EDITLINK) as string)
      : undefined;
  },
  deltaLink(annots: Map<string, any>) {
    return annots.has(this.ODATA_DELTALINK)
      ? decodeURIComponent(annots.get(this.ODATA_DELTALINK) as string)
      : undefined;
  },
  mediaContentType(annots: Map<string, any>) {
    return annots.has(this.ODATA_MEDIA_CONTENTTYPE)
      ? decodeURIComponent(annots.get(this.ODATA_MEDIA_CONTENTTYPE) as string)
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
    //odata.type: the type of the containing {[key: string]: any} or targeted property if the type of the {[key: string]: any} or targeted property cannot be heuristically determined
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
    context(value: {[key: string]: any}) {
      let ctx: ODataContext = {};
      if (this.ODATA_CONTEXT in value) {
        const str = value[this.ODATA_CONTEXT] as string;
        let index = str.indexOf('$metadata');
        ctx.serviceRootUrl = str.substring(0, index);
        index = str.indexOf('#');
        ctx.metadataUrl = str.substring(0, index);
        const parts = str.substring(index + 1).split('/');
        const col = COLLECTION.exec(parts[0]);
        if (col) {
          ctx.type = col[1];
        } else if (parts[0].indexOf('.') !== -1) {
          ctx.type = parts[0];
        } else {
          const property = parts[0].match(PROPERTY);
          const expand = parts[0].match(EXPAND);
          ctx.entity = parts[1] === '$entity';
          if (property) {
            ctx.entitySet = property[1];
            ctx.key = property[2];
            ctx.property = parts[1];
          } else if (expand) {
            ctx.entitySet = expand[1];
            ctx.expand = expand[2];
          } else {
            ctx.entitySet = parts[0];
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
    context(value: {[key: string]: any}) {
      let ctx: ODataContext = {};
      if (this.ODATA_CONTEXT in value) {
        const str = value[this.ODATA_CONTEXT] as string;
        let index = str.indexOf('$metadata');
        ctx.serviceRootUrl = str.substring(0, index);
        index = str.indexOf('#');
        ctx.metadataUrl = str.substring(0, index);
        const parts = str.substring(index + 1).split('/');
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
    annotations(value: { [key: string]: any }) {
      const annots = new Map<string, any>();
      if (this.ODATA_ANNOTATION in value) {
        Object.entries(value[this.ODATA_ANNOTATION])
        .forEach(([key, value]) => annots.set(key, value));
      } 
      return annots;
    },
    attributes(value: { [key: string]: any }, metadata: ODataMetadataType) {
      return value;
    },
    countParam() {
      return { [$INLINECOUNT]: 'allpages' };
    },
  }),
  //#endregion
};
