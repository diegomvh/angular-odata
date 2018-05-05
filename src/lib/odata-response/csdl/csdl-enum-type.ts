export class CsdlEnumType {
    constructor(
        public name: string,
        public members: CsdlEnumMember[],
        public underlyingType?: string,
        public isFlags?: boolean
    ) { }
}

export class CsdlEnumMember {
    constructor(
        public name: string,
        public value?: number
    ) { }
}
