import { StructuredTypeConfig } from '../../types';
import { CsdlAnnotable, CsdlAnnotation } from './csdl-annotation';
import {
  CsdlProperty,
  CsdlNavigationProperty,
} from './csdl-structural-property';

export class CsdlStructuredType extends CsdlAnnotable {
  constructor(
    public name: string,
    public properties?: CsdlProperty[],
    public navigationProperties?: CsdlNavigationProperty[],
    public baseType?: string,
    public openType?: boolean,
    public abstract?: boolean,
    annotations?: CsdlAnnotation[],
  ) {
    super(annotations);
  }
}

export class CsdlComplexType extends CsdlStructuredType {
  constructor(
    name: string,
    properties?: CsdlProperty[],
    navigationProperties?: CsdlNavigationProperty[],
    baseType?: string,
    openType?: boolean,
    abstract?: boolean,
    annotations?: CsdlAnnotation[],
  ) {
    super(name, properties, navigationProperties, baseType, openType, abstract, annotations);
  }

  toConfig(): StructuredTypeConfig<any> {
    const fields = {};
    return {
      name: this.name,
      base: this.baseType,
      open: this.openType,
      annotations: this.annotations?.map(t => t.toConfig()),
      fields: [...(this.properties ?? []).map(t => t.toConfig()), ...(this.navigationProperties ?? []).map(t => t.toConfig())].reduce((acc, p) => Object.assign(acc, {[p.name]: p}), {}),
    } as StructuredTypeConfig<any>;
  }
}

export class CsdlEntityType extends CsdlStructuredType {
  constructor(
    name: string,
    public key?: CsdlKey,
    properties?: CsdlProperty[],
    navigationProperties?: CsdlNavigationProperty[],
    baseType?: string,
    openType?: boolean,
    abstract?: boolean,
    public hasStream?: boolean,
    annotations?: CsdlAnnotation[],
  ) {
    super(name, properties, navigationProperties, baseType, openType, abstract, annotations);
  }

  toConfig(): StructuredTypeConfig<any> {
    const fields = {};
    return {
      name: this.name,
      base: this.baseType,
      open: this.openType,
      annotations: this.annotations?.map(t => t.toConfig()),
      keys: this.key?.toConfig(),
      fields: [...(this.properties ?? []).map(t => t.toConfig()), ...(this.navigationProperties ?? []).map(t => t.toConfig())].reduce((acc, p) => Object.assign(acc, {[p.name]: p}), {}),
    } as StructuredTypeConfig<any>;
  }
}

export class CsdlKey {
  constructor(public propertyRefs: CsdlPropertyRef[]) {}

  toConfig() {
    return this.propertyRefs.map(t => t.toConfig());
  }
}

export class CsdlPropertyRef {
  constructor(
    public name: string,
    public alias?: string,
  ) {}

  toConfig(): { name: string; alias?: string } {
    return {
      name: this.name,
      alias: this.alias
    }
  }
}
