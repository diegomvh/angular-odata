import { CsdlProperty, CsdlNavigationProperty } from './csdl-structural-property';

export class CsdlStructuredType {
    constructor(
        public name: string,
        public properties?: CsdlProperty[],
        public navigationProperties?: CsdlNavigationProperty[],
        public baseType?: string,
        public openType?: boolean,
        public abstract?: boolean
    ) { }
}

export class CsdlComplexType extends CsdlStructuredType {
    constructor(
        name: string,
        properties?: CsdlProperty[],
        navigationProperties?: CsdlNavigationProperty[],
        baseType?: string,
        openType?: boolean,
        abstract?: boolean
    ) {
        super(name, properties, navigationProperties, baseType, openType, abstract);
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
        public hasStream?: boolean
    ) {
        super(name, properties, navigationProperties, baseType, openType, abstract);
    }
}

export class CsdlKey {
    constructor(
        public propertyRefs: CsdlPropertyRef[],
    ) { }
}

export class CsdlPropertyRef {
    constructor(
        public name: string,
        public alias?: string
    ) { }
}
