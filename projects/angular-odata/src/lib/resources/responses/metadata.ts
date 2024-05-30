import {
  CsdlAction,
  CsdlActionImport,
  CsdlFunction,
  CsdlFunctionImport,
  CsdlParameter,
  CsdlReturnType,
} from './csdl/csdl-function-action';
import {
  CsdlAnnotation,
  CsdlAnnotations,
  CsdlTerm,
} from './csdl/csdl-annotation';
import {
  CsdlComplexType,
  CsdlEntityType,
  CsdlKey,
  CsdlPropertyRef,
} from './csdl/csdl-structured-type';
import { CsdlEnumMember, CsdlEnumType } from './csdl/csdl-enum-type';
import {
  CsdlInclude,
  CsdlIncludeAnnotations,
  CsdlReference,
} from './csdl/csdl-reference';
import {
  CsdlNavigationProperty,
  CsdlOnDelete,
  CsdlProperty,
  CsdlReferentialConstraint,
} from './csdl/csdl-structural-property';

import { CsdlEntityContainer } from './csdl/csdl-entity-container';
import { CsdlEntitySet } from './csdl/csdl-entity-set';
import { CsdlNavigationPropertyBinding } from './csdl/csdl-navigation-property-binding';
import { CsdlSchema } from './csdl/csdl-schema';
import { CsdlSingleton } from './csdl/csdl-singleton';
import { CsdlTypeDefinition } from './csdl/csdl-type-definition';
import { VERSION_4_0 } from '../../constants';
import { ApiConfig, ODataVersion } from '../../types';

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

export class ODataMetadata {
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
  private static readonly TAG_NAVIGATION_PROPERTY_BINDING =
    'NavigationPropertyBinding';
  private static readonly TAG_TYPE_DEFINITION = 'TypeDefinition';

  // ATTRIBUTES
  private static readonly ATTRIBUTE_VERSION = 'Version';
  private static readonly ATTRIBUTE_URI = 'Uri';
  private static readonly ATTRIBUTE_ALIAS = 'Alias';
  private static readonly ATTRIBUTE_NAMESPACE = 'Namespace';
  private static readonly ATTRIBUTE_TERM_NAMESPACE = 'TermNamespace';
  private static readonly ATTRIBUTE_QUALIFIER = 'Qualifier';
  private static readonly ATTRIBUTE_STRING = 'String';
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
  private static readonly ATTRIBUTE_INCLUDE_IN_SERVICE_DOCUMENT =
    'IncludeInServiceDocument';
  private static readonly ATTRIBUTE_ABSTRACT = 'Abstract';
  private static readonly ATTRIBUTE_UNDERLYING_TYPE = 'UnderlyingType';
  private static readonly ATTRIBUTE_IS_FLAGS = 'IsFlags';
  private static readonly ATTRIBUTE_EXTENDS = 'Extends';
  private static readonly ATTRIBUTE_BASE_TERM = 'BaseTerm';
  private static readonly ATTRIBUTE_APPLIES_TO = 'AppliesTo';

  public readonly version: string;
  public readonly references: CsdlReference[];
  public readonly schemas: CsdlSchema[];

  constructor(xml: string) {
    try {
      const parser: DOMParser = new DOMParser();
      const document: Document = parser.parseFromString(xml, 'text/xml');

      this.checkVersion(document);

      this.version = this.getFieldValueByAttribute(
        new Field(ODataMetadata.ATTRIBUTE_VERSION, FieldType.ATTRIBUTE),
        document.documentElement.attributes,
      );

      this.references = this.getObjects(
        document.documentElement,
        ODataMetadata.TAG_REFERENCE,
        [
          new Field(ODataMetadata.ATTRIBUTE_URI, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_INCLUDE, FieldType.TAG),
          new Field(ODataMetadata.TAG_INCLUDE_ANNOTATIONS, FieldType.TAG),
          new Field(ODataMetadata.TAG_ANNOTATION, FieldType.TAG),
        ],
      );

      const dataServices: Element =
        document.documentElement.getElementsByTagName(
          ODataMetadata.TAG_DATA_SERVICES,
        )[0];
      this.schemas = this.getObjects(dataServices, ODataMetadata.TAG_SCHEMA, [
        new Field(ODataMetadata.ATTRIBUTE_NAMESPACE, FieldType.ATTRIBUTE),
        new Field(ODataMetadata.ATTRIBUTE_ALIAS, FieldType.ATTRIBUTE),
        new Field(ODataMetadata.TAG_ENUM_TYPE, FieldType.TAG),
        new Field(ODataMetadata.TAG_COMPLEX_TYPE, FieldType.TAG),
        new Field(ODataMetadata.TAG_ENTITY_TYPE, FieldType.TAG),
        new Field(ODataMetadata.TAG_FUNCTION, FieldType.TAG),
        new Field(ODataMetadata.TAG_ACTION, FieldType.TAG),
        new Field(ODataMetadata.TAG_ENTITY_CONTAINER, FieldType.TAG),
        new Field(ODataMetadata.TAG_TYPE_DEFINITION, FieldType.TAG),
        new Field(ODataMetadata.TAG_TERM, FieldType.TAG),
        new Field(ODataMetadata.TAG_ANNOTATIONS, FieldType.TAG),
      ]);
    } catch (error) {
      throw new Error('Unable to parse metadata, ' + error);
    }
  }

  toConfig(): ApiConfig {
    return {
      version: this.version as ODataVersion,
      schemas: this.schemas.map(s => s.toConfig())
    } as ApiConfig;
  }

  protected checkVersion(document: Document) {
    // check version
    const attributes: NamedNodeMap = document.documentElement.attributes;
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

  protected getObjects(
    parentElement: Element,
    tag: string,
    fieldNames: Field[],
  ): any[] {
    let objects: any[] = [];

    const children: HTMLCollection = parentElement.children;
    for (let index = 0; index < children.length; index++) {
      const element = children.item(index);

      if (!element || element.nodeName !== tag) {
        continue;
      }

      const attributes: NamedNodeMap = element.attributes;
      const fieldValues: any[] = this.getFieldValues(
        fieldNames,
        attributes,
        element,
      );
      switch (tag) {
        case ODataMetadata.TAG_REFERENCE:
          objects.push(
            new CsdlReference(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
            ),
          );
          break;
        case ODataMetadata.TAG_INCLUDE:
          objects.push(new CsdlInclude(fieldValues[0], fieldValues[1]));
          break;
        case ODataMetadata.TAG_INCLUDE_ANNOTATIONS:
          objects.push(
            new CsdlIncludeAnnotations(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
            ),
          );
          break;
        case ODataMetadata.TAG_TERM:
          objects.push(
            new CsdlTerm(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
              fieldValues[4],
              fieldValues[5],
              fieldValues[6],
              fieldValues[7],
              fieldValues[8],
              fieldValues[9],
              fieldValues[10],
              fieldValues[11],
              fieldValues[12],
            ),
          );
          break;
        case ODataMetadata.TAG_ANNOTATIONS:
          objects.push(
            new CsdlAnnotations(fieldValues[0], fieldValues[1], fieldValues[2]),
          );
          break;
        case ODataMetadata.TAG_COLLECTION:
          objects.push(fieldValues);
          break;
        case ODataMetadata.TAG_RECORD:
          objects.push(fieldValues);
          break;
        case ODataMetadata.TAG_STRING:
          objects.push(fieldValues);
          break;
        case ODataMetadata.TAG_ENUM_MEMBER:
          objects.push(
            new CsdlEnumMember(fieldValues[0], fieldValues[1], fieldValues[2]),
          );
          break;
        case ODataMetadata.TAG_PROPERTY_VALUE:
          objects.push(fieldValues);
          break;
        case ODataMetadata.TAG_PROPERTY_PATH:
          objects.push(fieldValues);
          break;
        case ODataMetadata.TAG_NAVIGATION_PROPERTY_PATH:
          objects.push(fieldValues);
          break;
        case ODataMetadata.TAG_ANNOTATION:
          objects.push(new CsdlAnnotation(
            fieldValues[0], 
            fieldValues[1], 
            fieldValues[2], 
            fieldValues[3],
            fieldValues[4],
            fieldValues[5],
            fieldValues[6],
          ));
          break;
        case ODataMetadata.TAG_SCHEMA:
          objects.push(
            new CsdlSchema(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
              fieldValues[4],
              fieldValues[5],
              fieldValues[6],
              fieldValues[7],
              fieldValues[8],
              fieldValues[9],
              fieldValues[10],
            ),
          );
          break;
        case ODataMetadata.TAG_ENUM_TYPE:
          objects.push(
            new CsdlEnumType(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
              fieldValues[4],
            ),
          );
          break;
        case ODataMetadata.TAG_COMPLEX_TYPE:
          objects.push(
            new CsdlComplexType(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
              fieldValues[4],
              fieldValues[5],
              fieldValues[6],
            ),
          );
          break;
        case ODataMetadata.TAG_ENTITY_TYPE:
          objects.push(
            new CsdlEntityType(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
              fieldValues[4],
              fieldValues[5],
              fieldValues[6],
              fieldValues[7],
              fieldValues[8],
            ),
          );
          break;
        case ODataMetadata.TAG_FUNCTION:
          objects.push(
            new CsdlFunction(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
              fieldValues[4],
              fieldValues[5],
            ),
          );
          break;
        case ODataMetadata.TAG_MEMBER:
          objects.push(new CsdlEnumMember(fieldValues[0], fieldValues[1], fieldValues[2]));
          break;
        case ODataMetadata.TAG_PROPERTY:
          objects.push(
            new CsdlProperty(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
              fieldValues[4],
              fieldValues[5],
              fieldValues[6],
              fieldValues[7],
              fieldValues[8],
              fieldValues[9],
            ),
          );
          break;
        case ODataMetadata.TAG_PROPERTY_REF:
          objects.push(new CsdlPropertyRef(fieldValues[0], fieldValues[1]));
          break;
        case ODataMetadata.TAG_NAVIGATION_PROPERTY:
          objects.push(
            new CsdlNavigationProperty(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
              fieldValues[4],
              fieldValues[5],
              fieldValues[6],
              fieldValues[7],
            ),
          );
          break;
        case ODataMetadata.TAG_REFERENTIAL_CONSTRAINT:
          objects.push(
            new CsdlReferentialConstraint(fieldValues[0], fieldValues[1]),
          );
          break;
        case ODataMetadata.TAG_PARAMETER:
          objects.push(
            new CsdlParameter(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
              fieldValues[4],
              fieldValues[5],
              fieldValues[6],
              fieldValues[7],
            ),
          );
          break;
        case ODataMetadata.TAG_ACTION:
          objects.push(
            new CsdlAction(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
              fieldValues[4],
            ),
          );
          break;
        case ODataMetadata.TAG_ENTITY_SET:
          objects.push(
            new CsdlEntitySet(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
              fieldValues[4],
            ),
          );
          break;
        case ODataMetadata.TAG_SINGLETON:
          objects.push(
            new CsdlSingleton(fieldValues[0], fieldValues[1], fieldValues[2], fieldValues[3]),
          );
          break;
        case ODataMetadata.TAG_FUNCTION_IMPORT:
          objects.push(
            new CsdlFunctionImport(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
            ),
          );
          break;
        case ODataMetadata.TAG_ACTION_IMPORT:
          objects.push(
            new CsdlActionImport(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
            ),
          );
          break;
        case ODataMetadata.TAG_NAVIGATION_PROPERTY_BINDING:
          objects.push(
            new CsdlNavigationPropertyBinding(fieldValues[0], fieldValues[1]),
          );
          break;
        case ODataMetadata.TAG_TYPE_DEFINITION:
          objects.push(
            new CsdlTypeDefinition(
              fieldValues[0],
              fieldValues[1],
              fieldValues[2],
              fieldValues[3],
              fieldValues[4],
              fieldValues[5],
              fieldValues[6],
              fieldValues[7],
            ),
          );
          break;
        case ODataMetadata.TAG_ENTITY_CONTAINER:
          objects.push(new CsdlEntityContainer(
            fieldValues[0],
            fieldValues[1],
            fieldValues[2],
            fieldValues[3],
            fieldValues[4],
            fieldValues[5],
            fieldValues[6],
          ));
          break;
        default:
          throw new Error('Unknwon tag:' + tag);
      }
    }

    return objects;
  }

  protected getObject(
    parentElement: Element,
    tag: string,
    fieldNames: Field[],
  ): any {
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
      const fieldValues: any[] = this.getFieldValues(
        fieldNames,
        attributes,
        element,
      );
      switch (tag) {
        case ODataMetadata.TAG_KEY:
          object = new CsdlKey(fieldValues[0]);
          break;
        case ODataMetadata.TAG_RETURN_TYPE:
          object = new CsdlReturnType(
            fieldValues[0],
            fieldValues[1],
            fieldValues[2],
            fieldValues[3],
            fieldValues[4],
            fieldValues[5],
          );
          break;
        case ODataMetadata.TAG_ON_DELETE:
          object = new CsdlOnDelete(fieldValues[0]);
          break;
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
  ): any[] {
    const fieldValues: any[] = [];

    for (const field of fields) {
      if (field.fieldType === FieldType.TAG) {
        fieldValues.push(this.getFieldValueByTag(field, element));
      } else if (field.fieldType === FieldType.ATTRIBUTE) {
        fieldValues.push(this.getFieldValueByAttribute(field, attributes));
      } else {
        throw new Error('Unknown field type: ' + field.fieldType);
      }
    }

    return fieldValues;
  }

  protected getFieldValueByAttribute(
    field: Field,
    attributes: NamedNodeMap,
  ): any {
    switch (field.name) {
      case ODataMetadata.ATTRIBUTE_VERSION:
      case ODataMetadata.ATTRIBUTE_URI:
      case ODataMetadata.ATTRIBUTE_NAMESPACE:
      case ODataMetadata.ATTRIBUTE_ALIAS:
      case ODataMetadata.ATTRIBUTE_TERM_NAMESPACE:
      case ODataMetadata.ATTRIBUTE_TERM:
      case ODataMetadata.ATTRIBUTE_QUALIFIER:
      case ODataMetadata.ATTRIBUTE_STRING:
      case ODataMetadata.ATTRIBUTE_BOOL:
      case ODataMetadata.ATTRIBUTE_INT:
      case ODataMetadata.ATTRIBUTE_TARGET_NAMESPACE:
      case ODataMetadata.ATTRIBUTE_NAME:
      case ODataMetadata.ATTRIBUTE_TYPE:
      case ODataMetadata.ATTRIBUTE_SRID:
      case ODataMetadata.ATTRIBUTE_DEFAULT_VALUE:
      case ODataMetadata.ATTRIBUTE_PARTNER:
      case ODataMetadata.ATTRIBUTE_PROPERTY:
      case ODataMetadata.ATTRIBUTE_REFERENCED_PROPERTY:
      case ODataMetadata.ATTRIBUTE_BASE_TYPE:
      case ODataMetadata.ATTRIBUTE_ENTITY_SET_PATH:
      case ODataMetadata.ATTRIBUTE_ENTITY_TYPE:
      case ODataMetadata.ATTRIBUTE_PATH:
      case ODataMetadata.ATTRIBUTE_TARGET:
      case ODataMetadata.ATTRIBUTE_FUNCTION:
      case ODataMetadata.ATTRIBUTE_ACTION:
      case ODataMetadata.ATTRIBUTE_ENTITY_SET:
      case ODataMetadata.ATTRIBUTE_UNDERLYING_TYPE:
      case ODataMetadata.ATTRIBUTE_EXTENDS:
      case ODataMetadata.ATTRIBUTE_BASE_TERM:
      case ODataMetadata.ATTRIBUTE_APPLIES_TO:
        return this.getAttributeValue(attributes, field.name);
      case ODataMetadata.ATTRIBUTE_NULLABLE:
      case ODataMetadata.ATTRIBUTE_UNICODE:
      case ODataMetadata.ATTRIBUTE_OPEN_TYPE:
      case ODataMetadata.ATTRIBUTE_HAS_STREAM:
      case ODataMetadata.ATTRIBUTE_IS_BOUND:
      case ODataMetadata.ATTRIBUTE_IS_COMPOSABLE:
      case ODataMetadata.ATTRIBUTE_CONTAINS_TARGET:
      case ODataMetadata.ATTRIBUTE_INCLUDE_IN_SERVICE_DOCUMENT:
      case ODataMetadata.ATTRIBUTE_ABSTRACT:
      case ODataMetadata.ATTRIBUTE_IS_FLAGS:
        return this.propertyValueToBoolean(
          this.getAttributeValue(attributes, field.name),
        );
      case ODataMetadata.ATTRIBUTE_VALUE:
      case ODataMetadata.ATTRIBUTE_MAX_LENGTH:
      case ODataMetadata.ATTRIBUTE_PRECISION:
      case ODataMetadata.ATTRIBUTE_SCALE:
        return this.propertyValueToNumber(
          this.getAttributeValue(attributes, field.name),
        );
      default:
        throw new Error('Unknwon attribute:' + field.name);
    }
  }

  protected getFieldValueByTag(field: Field, element: Element): any[] {
    switch (field.name) {
      case ODataMetadata.TAG_INCLUDE:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAMESPACE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_ALIAS, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadata.TAG_INCLUDE_ANNOTATIONS:
        return this.getObjects(element, field.name, [
          new Field(
            ODataMetadata.ATTRIBUTE_TERM_NAMESPACE,
            FieldType.ATTRIBUTE,
          ),
          new Field(ODataMetadata.ATTRIBUTE_QUALIFIER, FieldType.ATTRIBUTE),
          new Field(
            ODataMetadata.ATTRIBUTE_TARGET_NAMESPACE,
            FieldType.ATTRIBUTE,
          ),
        ]);
      case ODataMetadata.TAG_TERM:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_BASE_TERM, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_DEFAULT_VALUE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_APPLIES_TO, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_NULLABLE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_MAX_LENGTH, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_PRECISION, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_SCALE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_SRID, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_STRING, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_BOOL, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_INT, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadata.TAG_ANNOTATIONS:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_TARGET, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_ANNOTATION, FieldType.TAG),
          new Field(ODataMetadata.ATTRIBUTE_QUALIFIER, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadata.TAG_ANNOTATION:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_TERM, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_STRING, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_BOOL, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_INT, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_COLLECTION, FieldType.TAG),
          new Field(ODataMetadata.TAG_RECORD, FieldType.TAG),
          new Field(ODataMetadata.TAG_ENUM_MEMBER, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_COLLECTION:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.TAG_STRING, FieldType.TAG),
          new Field(ODataMetadata.TAG_RECORD, FieldType.TAG),
          new Field(ODataMetadata.TAG_PROPERTY_PATH, FieldType.TAG),
          new Field(ODataMetadata.TAG_NAVIGATION_PROPERTY_PATH, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_RECORD:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.TAG_PROPERTY_VALUE, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_STRING:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.TAG_PROPERTY_VALUE, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_ENUM_MEMBER:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.TAG_PROPERTY_VALUE, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_PROPERTY_VALUE:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.TAG_PROPERTY_VALUE, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_PROPERTY_PATH:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.TAG_PROPERTY_VALUE, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_NAVIGATION_PROPERTY_PATH:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.TAG_PROPERTY_VALUE, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_ENUM_TYPE:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_MEMBER, FieldType.TAG),
          new Field(
            ODataMetadata.ATTRIBUTE_UNDERLYING_TYPE,
            FieldType.ATTRIBUTE,
          ),
          new Field(ODataMetadata.ATTRIBUTE_IS_FLAGS, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_COMPLEX_TYPE:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_PROPERTY, FieldType.TAG),
          new Field(ODataMetadata.TAG_NAVIGATION_PROPERTY, FieldType.TAG),
          new Field(ODataMetadata.ATTRIBUTE_BASE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_OPEN_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_ABSTRACT, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_ENTITY_TYPE:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_KEY, FieldType.TAG),
          new Field(ODataMetadata.TAG_PROPERTY, FieldType.TAG),
          new Field(ODataMetadata.TAG_NAVIGATION_PROPERTY, FieldType.TAG),
          new Field(ODataMetadata.ATTRIBUTE_BASE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_OPEN_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_ABSTRACT, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_HAS_STREAM, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_FUNCTION:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_RETURN_TYPE, FieldType.TAG),
          new Field(ODataMetadata.ATTRIBUTE_IS_BOUND, FieldType.ATTRIBUTE),
          new Field(
            ODataMetadata.ATTRIBUTE_ENTITY_SET_PATH,
            FieldType.ATTRIBUTE,
          ),
          new Field(ODataMetadata.ATTRIBUTE_IS_COMPOSABLE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_PARAMETER, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_MEMBER:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_VALUE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_PROPERTY:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_NULLABLE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_MAX_LENGTH, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_PRECISION, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_SCALE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_UNICODE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_SRID, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_DEFAULT_VALUE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_KEY:
        return this.getObject(element, field.name, [
          new Field(ODataMetadata.TAG_PROPERTY_REF, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_PROPERTY_REF:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_ALIAS, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadata.TAG_NAVIGATION_PROPERTY:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_NULLABLE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_PARTNER, FieldType.ATTRIBUTE),
          new Field(
            ODataMetadata.ATTRIBUTE_CONTAINS_TARGET,
            FieldType.ATTRIBUTE,
          ),
          new Field(ODataMetadata.TAG_REFERENTIAL_CONSTRAINT, FieldType.TAG),
          new Field(ODataMetadata.TAG_ON_DELETE, FieldType.TAG),
          new Field(ODataMetadata.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_REFERENTIAL_CONSTRAINT:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_PROPERTY, FieldType.ATTRIBUTE),
          new Field(
            ODataMetadata.ATTRIBUTE_REFERENCED_PROPERTY,
            FieldType.ATTRIBUTE,
          ),
        ]);
      case ODataMetadata.TAG_ON_DELETE:
        return this.getObject(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_ACTION, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadata.TAG_PARAMETER:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_NULLABLE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_MAX_LENGTH, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_PRECISION, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_SCALE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_SRID, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_RETURN_TYPE:
        return this.getObject(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_TYPE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_NULLABLE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_MAX_LENGTH, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_PRECISION, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_SCALE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_SRID, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadata.TAG_ACTION:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_RETURN_TYPE, FieldType.TAG),
          new Field(ODataMetadata.ATTRIBUTE_IS_BOUND, FieldType.ATTRIBUTE),
          new Field(
            ODataMetadata.ATTRIBUTE_ENTITY_SET_PATH,
            FieldType.ATTRIBUTE,
          ),
          new Field(ODataMetadata.TAG_PARAMETER, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_ENTITY_CONTAINER:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_EXTENDS, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_ENTITY_SET, FieldType.TAG),
          new Field(ODataMetadata.TAG_SINGLETON, FieldType.TAG),
          new Field(ODataMetadata.TAG_FUNCTION_IMPORT, FieldType.TAG),
          new Field(ODataMetadata.TAG_ACTION_IMPORT, FieldType.TAG),
          new Field(ODataMetadata.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_ENTITY_SET:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_ENTITY_TYPE, FieldType.ATTRIBUTE),
          new Field(
            ODataMetadata.TAG_NAVIGATION_PROPERTY_BINDING,
            FieldType.TAG,
          ),
          new Field(
            ODataMetadata.ATTRIBUTE_INCLUDE_IN_SERVICE_DOCUMENT,
            FieldType.ATTRIBUTE,
          ),
          new Field(ODataMetadata.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_SINGLETON:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_TYPE, FieldType.ATTRIBUTE),
          new Field(
            ODataMetadata.TAG_NAVIGATION_PROPERTY_BINDING,
            FieldType.TAG,
          ),
          new Field(ODataMetadata.TAG_ANNOTATION, FieldType.TAG),
        ]);
      case ODataMetadata.TAG_FUNCTION_IMPORT:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_FUNCTION, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_ENTITY_SET, FieldType.ATTRIBUTE),
          new Field(
            ODataMetadata.ATTRIBUTE_INCLUDE_IN_SERVICE_DOCUMENT,
            FieldType.ATTRIBUTE,
          ),
        ]);
      case ODataMetadata.TAG_ACTION_IMPORT:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_ACTION, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_ENTITY_SET, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadata.TAG_NAVIGATION_PROPERTY_BINDING:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_PATH, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_TARGET, FieldType.ATTRIBUTE),
        ]);
      case ODataMetadata.TAG_TYPE_DEFINITION:
        return this.getObjects(element, field.name, [
          new Field(ODataMetadata.ATTRIBUTE_NAME, FieldType.ATTRIBUTE),
          new Field(
            ODataMetadata.ATTRIBUTE_UNDERLYING_TYPE,
            FieldType.ATTRIBUTE,
          ),
          new Field(ODataMetadata.ATTRIBUTE_MAX_LENGTH, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_PRECISION, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_SCALE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_UNICODE, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.ATTRIBUTE_SRID, FieldType.ATTRIBUTE),
          new Field(ODataMetadata.TAG_ANNOTATION, FieldType.TAG),
        ]);
      default:
        throw new Error('Unknwon tag:' + field.name);
    }
  }

  protected getAttributeValue(attributes: NamedNodeMap, attributeName: string) {
    const attribute: Attr | null = attributes.getNamedItem(attributeName);
    return attribute !== null && attribute.nodeValue
      ? attribute.nodeValue
      : undefined;
  }

  protected propertyValueToNumber(attributeValue?: string) {
    return attributeValue !== undefined ? Number(attributeValue) : undefined;
  }

  protected propertyValueToBoolean(attributeValue?: string) {
    return attributeValue !== undefined ? attributeValue === 'true' : false;
  }
}
