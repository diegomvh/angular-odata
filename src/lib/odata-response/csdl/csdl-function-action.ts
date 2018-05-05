export class CsdlFunction {
    constructor(
        public name: string,
        public returnType: CsdlReturnType,
        public isBound?: boolean,
        public entitySetPath?: string,
        public isComposable?: boolean,
        public parameters?: CsdlParameter[]
    ) { }
}

export class CsdlAction {
    constructor(
        public name: string,
        public returnType?: CsdlReturnType,
        public isBound?: boolean,
        public entitySetPath?: string,
        public parameters?: CsdlParameter[]
    ) { }
}

export class CsdlFunctionImport {
    constructor(
        public name: string,
        public functionName: string,
        public entitySet?: string,
        public IncludeInServiceDocument?: boolean
    ) { }
}

export class CsdlActionImport {
    constructor(
        public name: string,
        public action: string,
        public entitySet?: string
    ) { }
}

export class CsdlParameter {
    constructor(
        public name: string,
        public type: string,
        public nullable?: boolean,
        public maxLength?: number,
        public precision?: number,
        public scale?: number,
        public srid?: string
    ) { }
}

export class CsdlReturnType {
    constructor(
        public type: string,
        public nullable?: boolean,
        public maxLength?: number,
        public precision?: number,
        public scale?: number,
        public srid?: string
    ) { }
}
