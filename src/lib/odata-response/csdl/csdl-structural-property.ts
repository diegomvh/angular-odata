export abstract class CsdlStructuralProperty {
    constructor(
        public name: string,
        public type: string,
        public nullable?: boolean
    ) { }
}

export class CsdlProperty extends CsdlStructuralProperty {
    constructor(
        name: string,
        type: string,
        nullable?: boolean,
        public maxLength?: number,
        public precision?: number,
        public scale?: number,
        public unicode?: boolean,
        public srid?: string,
        public defaultValue?: string
    ) {
        super(name, type, nullable);
    }
}

export class CsdlNavigationProperty extends CsdlStructuralProperty {
    constructor(
        name: string,
        type: string,
        nullable?: boolean,
        public partner?: string,
        public containsTarget?: boolean,
        public referentialConstraints?: CsdlReferentialConstraint[],
        public onDelete?: CsdlOnDelete,
    ) {
        super(name, type, nullable);
    }
}

export class CsdlReferentialConstraint {
    constructor(
        public property: string,
        public referencedProperty: string
    ) { }
}

export class CsdlOnDelete {
    constructor(
        public action: string
    ) { }
}
