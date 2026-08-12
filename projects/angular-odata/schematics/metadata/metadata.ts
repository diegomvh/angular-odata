import { CsdlEntityContainer } from './parser/csdl/csdl-entity-container';
import { CsdlEntitySet } from './parser/csdl/csdl-entity-set';
import { CsdlEnumType } from './parser/csdl/csdl-enum-type';
import { CsdlAction, CsdlFunction } from './parser/csdl/csdl-function-action';
import { CsdlReference } from './parser/csdl/csdl-reference';
import { CsdlSchema } from './parser/csdl/csdl-schema';
import { CsdlComplexType, CsdlEntityType } from './parser/csdl/csdl-structured-type';

export class ODataMetadata {
  Version: string;
  References: CsdlReference[];
  Schemas: CsdlSchema[];
  constructor(Version: string, References: any[], Schemas: any[]) {
    this.Version = Version;
    this.References = References?.map((r) => new CsdlReference(r));
    this.Schemas = Schemas?.map((s) => new CsdlSchema(s));
  }

  toJson() {
    return {
      Version: this.Version,
      References: this.References.map((r) => r.toJson()),
      Schemas: this.Schemas.map((s) => s.toJson()),
    };
  }

  static fromJson(json: any): ODataMetadata {
    return new ODataMetadata(json.Version, json.References, json.Schemas);
  }

  functions() {
    return this.Schemas.reduce((acc, s) => {
      return [...acc, ...(s.Function ?? [])];
    }, [] as CsdlFunction[]);
  }

  actions() {
    return this.Schemas.reduce((acc, s) => {
      return [...acc, ...(s.Action ?? [])];
    }, [] as CsdlAction[]);
  }

  enumTypes(): CsdlEnumType[] {
    return this.Schemas.reduce((acc, s) => {
      return [...acc, ...(s.EnumType ?? [])];
    }, [] as CsdlEnumType[]);
  }

  entityTypes(): CsdlEntityType[] {
    return this.Schemas.reduce((acc, s) => {
      return [...acc, ...(s.EntityType ?? [])];
    }, [] as CsdlEntityType[]);
  }

  complexTypes(): CsdlComplexType[] {
    return this.Schemas.reduce((acc, s) => {
      return [...acc, ...(s.ComplexType ?? [])];
    }, [] as CsdlComplexType[]);
  }

  entitySets(): CsdlEntitySet[] {
    return this.Schemas.reduce((acc, s) => {
      return [...acc, ...(s.EntityContainer ?? [])];
    }, [] as CsdlEntityContainer[]).reduce((acc, ec) => {
      return [...acc, ...(ec.EntitySet ?? [])];
    }, [] as CsdlEntitySet[]);
  }

  findEnumType(fullName: string): CsdlEnumType | undefined {
    return this.enumTypes().find((et) => et.fullName() === fullName);
  }

  findEntityType(fullName: string): CsdlEntityType | undefined {
    return this.entityTypes()?.find((et) => et.fullName() === fullName);
  }

  findComplexType(fullName: string): CsdlComplexType | undefined {
    return this.complexTypes()?.find((ct) => ct.fullName() === fullName);
  }

  findEntitySet(fullName: string): CsdlEntitySet | undefined {
    return this.entitySets()?.find((ct) => ct.EntityType === fullName);
  }
}
