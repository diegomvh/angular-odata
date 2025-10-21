import { VERSION_4_0 } from '../constants';
import { ODataMetadata } from './metadata';

enum FieldType {
  ATTRIBUTE,
  TAG,
}

class Field {
  constructor(
    public name: string,
    public fieldType: FieldType,
  ) {}
}

export class ODataMetadataParser {
  // TAGS
  private static readonly TAG_EDMX = 'edmx:Edmx';
  private static readonly TAG_DATA_SERVICES = 'edmx:DataServices';
  private static readonly TAG_REFERENCE = 'edmx:Reference';
  private static readonly TAG_INCLUDE = 'edmx:Include';
  private static readonly TAG_INCLUDE_ANNOTATIONS = 'edmx:IncludeAnnotations';
  private static readonly TAG_TERM = 'Term';
  private static readonly TAG_ANNOTATIONS = 'Annotations';
  private static readonly TAG_ANNOTATION = 'Annotation';
  private static readonly TAG_SCHEMA = 'Schema';
  private static readonly TAG_ENUM_TYPE = 'EnumType';
  private static readonly TAG_MEMBER = 'Member';
  private static readonly TAG_COMPLEX_TYPE = 'ComplexType';
  private static readonly TAG_ENTITY_TYPE = 'EntityType';
  private static readonly TAG_PROPERTY = 'Property';
  private static readonly TAG_KEY = 'Key';
  private static readonly TAG_PROPERTY_REF = 'PropertyRef';
  private static readonly TAG_NAVIGATION_PROPERTY = 'NavigationProperty';
  private static readonly TAG_REFERENTIAL_CONSTRAINT = 'ReferentialConstraint';
  private static readonly TAG_ON_DELETE = 'OnDelete';
  private static readonly TAG_FUNCTION = 'Function';
  private static readonly TAG_RETURN_TYPE = 'ReturnType';
  private static readonly TAG_PARAMETER = 'Parameter';
  private static readonly TAG_ACTION = 'Action';
  private static readonly TAG_ENTITY_CONTAINER = 'EntityContainer';
  private static readonly TAG_ENTITY_SET = 'EntitySet';
  private static readonly TAG_SINGLETON = 'Singleton';
  private static readonly TAG_COLLECTION = 'Collection';
  private static readonly TAG_RECORD = 'Record';
  private static readonly TAG_STRING = 'String';
  private static readonly TAG_ENUM_MEMBER = 'EnumMember';
  private static readonly TAG_PROPERTY_VALUE = 'PropertyValue';
  private static readonly TAG_PROPERTY_PATH = 'PropertyPath';
  private static readonly TAG_NAVIGATION_PROPERTY_PATH = 'NavigationPropertyPath';
  private static readonly TAG_FUNCTION_IMPORT = 'FunctionImport';
  private static readonly TAG_ACTION_IMPORT = 'ActionImport';
  private static readonly TAG_NAVIGATION_PROPERTY_BINDING = 'NavigationPropertyBinding';
  private static readonly TAG_TYPE_DEFINITION = 'TypeDefinition';

  // ATTRIBUTES
  private static readonly ATTRIBUTE_VERSION = 'Version';
  private static readonly ATTRIBUTE_URI = 'Uri';
  private static readonly ATTRIBUTE_ALIAS = 'Alias';
  private static readonly ATTRIBUTE_NAMESPACE = 'Namespace';
  private static readonly ATTRIBUTE_TERM_NAMESPACE = 'TermNamespace';
  private static readonly ATTRIBUTE_QUALIFIER = 'Qualifier';
  private static readonly ATTRIBUTE_STRING = 'String';
  private static readonly ATTRIBUTE_DATE = 'Date';
  private static readonly ATTRIBUTE_BOOL = 'Bool';
  private static readonly ATTRIBUTE_INT = 'Int';
  private static readonly ATTRIBUTE_TARGET_NAMESPACE = 'TargetNamespace';
  private static readonly ATTRIBUTE_TERM = 'Term';
  private static readonly ATTRIBUTE_NAME = 'Name';
  private static readonly ATTRIBUTE_VALUE = 'Value';
  private static readonly ATTRIBUTE_BASE_TYPE = 'BaseType';
  private static readonly ATTRIBUTE_OPEN_TYPE = 'OpenType';
  private static readonly ATTRIBUTE_TYPE = 'Type';
  private static readonly ATTRIBUTE_NULLABLE = 'Nullable';
  private static readonly ATTRIBUTE_MAX_LENGTH = 'MaxLength';
  private static readonly ATTRIBUTE_PRECISION = 'Precision';
  private static readonly ATTRIBUTE_SCALE = 'Scale';
  private static readonly ATTRIBUTE_UNICODE = 'Unicode';
  private static readonly ATTRIBUTE_SRID = 'SRID';
  private static readonly ATTRIBUTE_DEFAULT_VALUE = 'DefaultValue';
  private static readonly ATTRIBUTE_PARTNER = 'Partner';
  private static readonly ATTRIBUTE_PROPERTY = 'Property';
  private static readonly ATTRIBUTE_REFERENCED_PROPERTY = 'ReferencedProperty';
  private static readonly ATTRIBUTE_HAS_STREAM = 'HasStream';
  private static readonly ATTRIBUTE_CONTAINS_TARGET = 'ContainsTarget';
  private static readonly ATTRIBUTE_IS_BOUND = 'IsBound';
  private static readonly ATTRIBUTE_ENTITY_SET_PATH = 'EntitySetPath';
  private static readonly ATTRIBUTE_IS_COMPOSABLE = 'IsComposable';
  private static readonly ATTRIBUTE_ENTITY_TYPE = 'EntityType';
  private static readonly ATTRIBUTE_PATH = 'Path';
  private static readonly ATTRIBUTE_TARGET = 'Target';
  private static readonly ATTRIBUTE_FUNCTION = 'Function';
  private static readonly ATTRIBUTE_ACTION = 'Action';
  private static readonly ATTRIBUTE_ENTITY_SET = 'EntitySet';
  private static readonly ATTRIBUTE_INCLUDE_IN_SERVICE_DOCUMENT = 'IncludeInServiceDocument';
  private static readonly ATTRIBUTE_ABSTRACT = 'Abstract';
  private static readonly ATTRIBUTE_UNDERLYING_TYPE = 'UnderlyingType';
  private static readonly ATTRIBUTE_IS_FLAGS = 'IsFlags';
  private static readonly ATTRIBUTE_EXTENDS = 'Extends';
  private static readonly ATTRIBUTE_BASE_TERM = 'BaseTerm';
  private static readonly ATTRIBUTE_APPLIES_TO = 'AppliesTo';

  public readonly document: Document;

  constructor(xml: string) {
    try {
      const parser: DOMParser = new DOMParser();
      this.document = parser.parseFromString(xml, 'text/xml');

      this.checkVersion(this.document);
    } catch (error) {
      throw new Error('Unable to parse metadata, ' + error);
    }
  }

  metadata() {
    const version = this.getFieldValueByAttribute(
      new Field(ODataMetadataParser.ATTRIBUTE_VERSION, FieldType.ATTRIBUTE),
      this.document.documentElement.attributes,
    );

    const references = this.getObjects(
      this.document.documentElement,
      ODataMetadataParser.TAG_REFERENCE,
      [
        new Field(ODataMetadataParser.ATTRIBUTE_URI, FieldType.ATTRIBUTE),
        new Field(ODataMetadataParser.TAG_INCLUDE, FieldType.TAG),
        new Field(ODataMetadataParser.TAG_INCLUDE_ANNOTATIONS, FieldType.TAG),
        new Field(ODataMetadataParser.TAG_ANNOTATION, FieldType.TAG),
      ],
    );

    const dataServices: Element = this.document.documentElement.getElementsByTagName(
      ODataMetadataParser.TAG_DATA_SERVICES,
    )[0];
    const schemas = this.getObjects(dataServices, ODataMetadataParser.TAG_SCHEMA, [
      new Field(ODataMetadataParser.ATTRIBUTE_NAMESPACE, FieldType.ATTRIBUTE),
      new Field(ODataMetadataParser.ATTRIBUTE_ALIAS, FieldType.ATTRIBUTE),
      new Field(ODataMetadataParser.TAG_ENUM_TYPE, FieldType.TAG),
      new Field(ODataMetadataParser.TAG_COMPLEX_TYPE, FieldType.TAG),
      new Field(ODataMetadataParser.TAG_ENTITY_TYPE, FieldType.TAG),
      new Field(ODataMetadataParser.TAG_FUNCTION, FieldType.TAG),
      new Field(ODataMetadataParser.TAG_ACTION, FieldType.TAG),
      new Field(ODataMetadataParser.TAG_ENTITY_CONTAINER, FieldType.TAG),
      new Field(ODataMetadataParser.TAG_TYPE_DEFINITION, FieldType.TAG),
      new Field(ODataMetadataParser.TAG_TERM, FieldType.TAG),
      new Field(ODataMetadataParser.TAG_ANNOTATIONS, FieldType.TAG),
    ]);

    return new ODataMetadata(version, references, schemas);
  }

  protected checkVersion(doc: Document) {
    // check version
    const attributes: NamedNodeMap = doc.documentElement.attributes;
    if (!attributes) {
      throw new Error('OData version is not specified in the metadata');
    }
    const attr: Attr | null = attributes.getNamedItem('Version');
    if (attr === null) {
      throw new Error('OData version is not specified in the metadata');
    }
    const odataVersion = attr?.nodeValue;
    if (odataVersion !== VERSION_4_0) {
      throw new Error('OData version "' + odataVersion + '" is not supported');
    }
  }

  protected getObjects(parentElement: Element, tag: string, fieldNames: Field[]): any[] {
    let objects: any[] = [];

    const children: HTMLCollection = parentElement.children;
    for (let index = 0; index < children.length; index++) {
      const element = children.item(index);

      if (!element || element.nodeName !== tag) {
        continue;
      }

      const attributes: NamedNodeMap = element.attributes;
      const fieldValues: any = this.getFieldValues(fieldNames, attributes, element);
      fieldValues['TextContent'] = element.textContent;
      switch (tag) {
        case ODataMetadataParser.TAG_REFERENCE:
        case ODataMetadataParser.TAG_INCLUDE:
        case ODataMetadataParser.TAG_INCLUDE_ANNOTATIONS:
        case ODataMetadataParser.TAG_TERM:
        case ODataMetadataParser.TAG_ANNOTATIONS:
        case ODataMetadataParser.TAG_COLLECTION:
        case ODataMetadataParser.TAG_RECORD:
        case ODataMetadataParser.TAG_STRING:
        case ODataMetadataParser.TAG_ENUM_MEMBER:
        case ODataMetadataParser.TAG_PROPERTY_VALUE:
        case ODataMetadataParser.TAG_PROPERTY_PATH:
        case ODataMetadataParser.TAG_NAVIGATION_PROPERTY_PATH:
        case ODataMetadataParser.TAG_ANNOTATION:
        case ODataMetadataParser.TAG_SCHEMA:
        case ODataMetadataParser.TAG_ENUM_TYPE:
        case ODataMetadataParser.TAG_COMPLEX_TYPE:
        case ODataMetadataParser.TAG_ENTITY_TYPE:
        case ODataMetadataParser.TAG_FUNCTION:
        case ODataMetadataParser.TAG_MEMBER:
        case ODataMetadataParser.TAG_PROPERTY:
        case ODataMetadataParser.TAG_PROPERTY_REF:
        case ODataMetadataParser.TAG_NAVIGATION_PROPERTY:
        case ODataMetadataParser.TAG_REFERENTIAL_CONSTRAINT:
        case ODataMetadataParser.TAG_PARAMETER:
        case ODataMetadataParser.TAG_ACTION:
        case ODataMetadataParser.TAG_ENTITY_SET:
        case ODataMetadataParser.TAG_SINGLETON:
        case ODataMetadataParser.TAG_FUNCTION_IMPORT:
        case ODataMetadataParser.TAG_ACTION_IMPORT:
        case ODataMetadataParser.TAG_NAVIGATION_PROPERTY_BINDING:
        case ODataMetadataParser.TAG_TYPE_DEFINITION:
        case ODataMetadataParser.TAG_ENTITY_CONTAINER:
          objects.push(fieldValues);
          break;
        default:
          throw new Error('Unknwon tag:' + tag);
      }
    }

    return objects;
  }

  protected getObject(parentElement: Element, tag: string, fieldNames: Field[]): any {
    let object: any;

    const children: HTMLCollection = parentElement.children;
    let element: Element | undefined | null;
    for (let index = 0; index < children.length; index++) {
      if (children && children.item(index)?.nodeName === tag) {
        if (element !== undefined && element !== null) {
          throw new Error('Expected one ' + tag);
        }
        element = children.item(index);
      }
    }

    if (element !== undefined && element !== null) {
      const attributes: NamedNodeMap = element.attributes;
      const fieldValues: any = this.getFieldValues(fieldNames, attributes, element);
      fieldValues['TextContent'] = element.textContent;
      switch (tag) {
        case ODataMetadataParser.TAG_KEY:
        case ODataMetadataParser.TAG_RETURN_TYPE:
        case ODataMetadataParser.TAG_ON_DELETE:
          return fieldValues;
        default:
          throw new Error('Unknwon tag:' + tag);
      }
    }

    return object;
  }

  protected getFieldValues(
    fields: Field[],
    attributes: NamedNodeMap,
    element: Element,
  ): { [name: string]: any } {
    const fieldValues: { [name: string]: any } = {};

    for (const field of fields) {
      if (field.fieldType === FieldType.TAG) {
        fieldValues[field.name] = this.getFieldValueByTag(field, element);
      } else if (field.fieldType === FieldType.ATTRIBUTE) {
        fieldValues[field.name] = this.getFieldValueByAttribute(field, attributes);
      } else {
        throw new Error('Unknown field type: ' + field.fieldType);
      }
    }

    return fieldValues;
  }

  protected getFieldValueByAttribute(field: Field, attributes: NamedNodeMap): any {
    switch (field.name) {
      case ODataMetadataParser.ATTRIBUTE_VERSION:
      case ODataMetadataParser.ATTRIBUTE_URI:
      case ODataMetadataParser.ATTRIBUTE_NAMESPACE:
      case ODataMetadataParser.ATTRIBUTE_ALIAS:
      case ODataMetadataParser.ATTRIBUTE_TERM_NAMESPACE:
      case ODataMetadataParser.ATTRIBUTE_TERM:
      case ODataMetadataParser.ATTRIBUTE_QUALIFIER:
      case ODataMetadataParser.ATTRIBUTE_STRING:
      case ODataMetadataParser.ATTRIBUTE_BOOL:
      case ODataMetadataParser.ATTRIBUTE_INT:
      case ODataMetadataParser.ATTRIBUTE_TARGET_NAMESPACE:
      case ODataMetadataParser.ATTRIBUTE_NAME:
      case ODataMetadataParser.ATTRIBUTE_TYPE:
      case ODataMetadataParser.ATTRIBUTE_SRID:
      case ODataMetadataParser.ATTRIBUTE_DEFAULT_VALUE:
      case ODataMetadataParser.ATTRIBUTE_PARTNER:
      case ODataMetadataParser.ATTRIBUTE_PROPERTY:
      case ODataMetadataParser.ATTRIBUTE_REFERENCED_PROPERTY:
      case ODataMetadataParser.ATTRIBUTE_BASE_TYPE:
      case ODataMetadataParser.ATTRIBUTE_ENTITY_SET_PATH:
      case ODataMetadataParser.ATTRIBUTE_ENTITY_TYPE:
      case ODataMetadataParser.ATTRIBUTE_PATH:
      case ODataMetadataParser.ATTRIBUTE_TARGET:
      case ODataMetadataParser.ATTRIBUTE_FUNCTION:
      case ODataMetadataParser.ATTRIBUTE_ACTION:
      case ODataMetadataParser.ATTRIBUTE_ENTITY_SET:
      case ODataMetadataParser.ATTRIBUTE_UNDERLYING_TYPE:
      case ODataMetadataParser.ATTRIBUTE_EXTENDS:
      case ODataMetadataParser.ATTRIBUTE_BASE_TERM:
      case ODataMetadataParser.ATTRIBUTE_APPLIES_TO:
        return this.getAttributeValue(attributes, field.name);
      case ODataMetadataParser.ATTRIBUTE_NULLABLE:
      case ODataMetadataParser.ATTRIBUTE_UNICODE:
      case ODataMetadataParser.ATTRIBUTE_OPEN_TYPE:
      case ODataMetadataParser.ATTRIBUTE_HAS_STREAM:
      case ODataMetadataParser.ATTRIBUTE_IS_BOUND:
      case ODataMetadataParser.ATTRIBUTE_IS_COMPOSABLE:
      case ODataMetadataParser.ATTRIBUTE_CONTAINS_TARGET:
      case ODataMetadataParser.ATTRIBUTE_INCLUDE_IN_SERVICE_DOCUMENT:
      case ODataMetadataParser.ATTRIBUTE_ABSTRACT:
      case ODataMetadataParser.ATTRIBUTE_IS_FLAGS:
        return this.propertyValueToBoolean(this.getAttributeValue(attributes, field.name));
      case ODataMetadataParser.ATTRIBUTE_VALUE:
      case ODataMetadataParser.ATTRIBUTE_MAX_LENGTH:
      case ODataMetadataParser.ATTRIBUTE_PRECISION:
      case ODataMetadataParser.ATTRIBUTE_SCALE:
        return this.propertyValueToNumber(this.getAttributeValue(attributes, field.name));
      case ODataMetadataParser.ATTRIBUTE_DATE:
        return this.propertyValueToDate(this.getAttributeValue(attributes, field.name));
      default:
        throw new Error('Unknwon attribute:' + field.name);
    }
  }

  protected getFieldValueByTag(field: Field, element: Element): any[] {
    switch (field.name) {
      case ODataMetadataParser.TAG_INCLUDE:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAMESPACE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_ALIAS, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadataParser.TAG_INCLUDE_ANNOTATIONS:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_TERM_NAMESPACE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_QUALIFIER, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_TARGET_NAMESPACE, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadataParser.TAG_TERM:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_BASE_TERM, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_DEFAULT_VALUE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_APPLIES_TO, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_NULLABLE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_MAX_LENGTH, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_PRECISION, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_SCALE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_SRID, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_STRING, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_BOOL, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_INT, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadataParser.TAG_ANNOTATIONS:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_TARGET, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_ANNOTATION, FieldType.TAG),
          new Field(ODataMetadataParser.ATTRIBUTE_QUALIFIER, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadataParser.TAG_ANNOTATION:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_TERM, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_STRING, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_BOOL, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_INT, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_COLLECTION, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_RECORD, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_ENUM_MEMBER, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_COLLECTION:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.TAG_STRING, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_RECORD, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_PROPERTY_PATH, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_NAVIGATION_PROPERTY_PATH, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_RECORD:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.TAG_PROPERTY_VALUE, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_STRING:
        return this.getObjects(element, field.name, []);
      case ODataMetadataParser.TAG_ENUM_MEMBER:
        return this.getObjects(element, field.name, []);
      case ODataMetadataParser.TAG_PROPERTY_VALUE:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_PROPERTY, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_STRING, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_DATE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_ENUM_MEMBER, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_PROPERTY_PATH:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.TAG_PROPERTY_VALUE, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_NAVIGATION_PROPERTY_PATH:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.TAG_PROPERTY_VALUE, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_ENUM_TYPE:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_MEMBER, FieldType.TAG),
          new Field(ODataMetadataParser.ATTRIBUTE_UNDERLYING_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_IS_FLAGS, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_COMPLEX_TYPE:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_PROPERTY, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_NAVIGATION_PROPERTY, FieldType.TAG),
          new Field(ODataMetadataParser.ATTRIBUTE_BASE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_OPEN_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_ABSTRACT, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_ENTITY_TYPE:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_KEY, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_PROPERTY, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_NAVIGATION_PROPERTY, FieldType.TAG),
          new Field(ODataMetadataParser.ATTRIBUTE_BASE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_OPEN_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_ABSTRACT, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_HAS_STREAM, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_FUNCTION:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_RETURN_TYPE, FieldType.TAG),
          new Field(ODataMetadataParser.ATTRIBUTE_IS_BOUND, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_ENTITY_SET_PATH, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_IS_COMPOSABLE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_PARAMETER, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_MEMBER:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_VALUE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_PROPERTY:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_NULLABLE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_MAX_LENGTH, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_PRECISION, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_SCALE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_UNICODE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_SRID, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_DEFAULT_VALUE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_KEY:
        return this.getObject(element, field.name, [
          new Field(ODataMetadataParser.TAG_PROPERTY_REF, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_PROPERTY_REF:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_ALIAS, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadataParser.TAG_NAVIGATION_PROPERTY:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_NULLABLE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_PARTNER, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_CONTAINS_TARGET, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_REFERENTIAL_CONSTRAINT, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_ON_DELETE, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_REFERENTIAL_CONSTRAINT:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_PROPERTY, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_REFERENCED_PROPERTY, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadataParser.TAG_ON_DELETE:
        return this.getObject(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_ACTION, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadataParser.TAG_PARAMETER:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_NULLABLE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_MAX_LENGTH, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_PRECISION, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_SCALE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_SRID, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_RETURN_TYPE:
        return this.getObject(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_NULLABLE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_MAX_LENGTH, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_PRECISION, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_SCALE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_SRID, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadataParser.TAG_ACTION:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_RETURN_TYPE, FieldType.TAG),
          new Field(ODataMetadataParser.ATTRIBUTE_IS_BOUND, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_ENTITY_SET_PATH, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_PARAMETER, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_ENTITY_CONTAINER:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_EXTENDS, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_ENTITY_SET, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_SINGLETON, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_FUNCTION_IMPORT, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_ACTION_IMPORT, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_ENTITY_SET:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_ENTITY_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_NAVIGATION_PROPERTY_BINDING, FieldType.TAG),
          new Field(ODataMetadataParser.ATTRIBUTE_INCLUDE_IN_SERVICE_DOCUMENT, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_SINGLETON:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_NAVIGATION_PROPERTY_BINDING, FieldType.TAG),
          new Field(ODataMetadataParser.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadataParser.TAG_FUNCTION_IMPORT:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_FUNCTION, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_ENTITY_SET, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_INCLUDE_IN_SERVICE_DOCUMENT, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadataParser.TAG_ACTION_IMPORT:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_ACTION, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_ENTITY_SET, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadataParser.TAG_NAVIGATION_PROPERTY_BINDING:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_PATH, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_TARGET, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadataParser.TAG_TYPE_DEFINITION:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadataParser.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_UNDERLYING_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_MAX_LENGTH, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_PRECISION, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_SCALE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_UNICODE, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.ATTRIBUTE_SRID, FieldType.ATTRIBUTE),
          new Field(ODataMetadataParser.TAG_ANNOTATION, FieldType.TAG),
        ]);
      default:
        throw new Error('Unknwon tag:' + field.name);
    }
  }

  protected getAttributeValue(attributes: NamedNodeMap, attributeName: string) {
    const attribute: Attr | null = attributes.getNamedItem(attributeName);
    return attribute !== null && attribute.nodeValue ? attribute.nodeValue : undefined;
  }

  protected propertyValueToNumber(attributeValue?: string) {
    return attributeValue !== undefined ? Number(attributeValue) : undefined;
  }

  protected propertyValueToBoolean(attributeValue?: string) {
    return attributeValue !== undefined ? attributeValue === 'true' : false;
  }

  protected propertyValueToDate(attributeValue?: string) {
    return attributeValue !== undefined ? new Date(attributeValue) : undefined;
  }
}
