import { Utils } from '../../utils/utils';
import { Filter } from './filter';
import { FilterHasProperty } from './filter-has-property';
import { QuotedString } from '../../odata-query/quoted-string';

export class FilterFunction extends FilterHasProperty implements Filter {
    private functionName: string;
    private value: boolean | number | string | QuotedString;

    constructor(functionName: string, property: string, value?: boolean | number | string | QuotedString) {
        super(property);
        Utils.requireNotNullNorUndefined(functionName, 'functionName');
        Utils.requireNotEmpty(functionName, 'functionName');
        Utils.requireNotNullNorUndefined(property, 'property');
        Utils.requireNotEmpty(property, 'property');
        this.functionName = functionName;
        this.property = property;
        this.value = value;
    }

    toString(): string {
        if (Utils.isNotNullNorUndefined(this.property) && Utils.isNotNullNorUndefined(this.value)) {
            return `${this.functionName}(${this.property},${Utils.getValueURI(this.value, false)})`;
        } else if (Utils.isNotNullNorUndefined(this.property)) {
            return `${this.functionName}(${this.property})`;
        } else if (Utils.isNotNullNorUndefined(this.value)) {
            return `${this.functionName}(${Utils.getValueURI(this.value, false)})`;
        } else {
            return `${this.functionName}()`;
        }
    }

    isEmpty(): boolean {
        if (Utils.isNullOrUndefined(this.property)
            && Utils.isNullOrUndefined(this.value)) {
            return true;
        }
        if (Utils.isNullOrUndefined(this.property)
            && Utils.isNotNullNorUndefined(this.value) && Utils.isEmpty(this.value)) {
            return true;
        }
        if (Utils.isNullOrUndefined(this.value)
            && Utils.isNotNullNorUndefined(this.property) && !this.property.length) {
            return true;
        }
        return false;
    }
}

export class FilterFunctionString extends FilterFunction {
    constructor(functionName: string, property?: string, value?: number | string | FilterFunctionString) {
        super(functionName, property, typeof (value) === 'string'
            ? new QuotedString(value)
            : value instanceof FilterFunctionString ? value.toString() : value);
    }
}

export class FilterContains extends FilterFunctionString {
    constructor(property: string, value: string | FilterFunctionString) {
        super('contains', property, value);
        Utils.requireNotNullNorUndefined(value, 'value');
        Utils.requireNotEmpty(value, 'value');
    }
}

export class FilterEndswith extends FilterFunctionString {
    constructor(property: string, value: string | FilterFunctionString) {
        super('endswith', property, value);
        Utils.requireNotNullNorUndefined(value, 'value');
        Utils.requireNotEmpty(value, 'value');
    }
}

export class FilterStartswith extends FilterFunctionString {
    constructor(property: string, value: string | FilterFunctionString) {
        super('startswith', property, value);
        Utils.requireNotNullNorUndefined(value, 'value');
        Utils.requireNotEmpty(value, 'value');
    }
}

export class FilterLength extends FilterFunctionString {
    constructor(property: string) {
        super('length', property);
    }
}

export class FilterIndexof extends FilterFunctionString {
    constructor(property: string, value: string | FilterFunctionString) {
        super('indexof', property, value);
        Utils.requireNotNullNorUndefined(value, 'value');
        Utils.requireNotEmpty(value, 'value');
    }
}

export class FilterSubstring extends FilterFunctionString {
    constructor(property: string, value: number) {
        super('substring', property, value);
        Utils.requireNotNullNorUndefined(value, 'value');
        Utils.requireNotEmpty(value, 'value');
    }
}

export class FilterTolower extends FilterFunctionString {
    constructor(property: string) {
        super('tolower', property);
    }
}

export class FilterToupper extends FilterFunctionString {
    constructor(property: string) {
        super('toupper', property);
    }
}

export class FilterTrim extends FilterFunctionString {
    constructor(property: string) {
        super('trim', property);
    }
}

export class FilterConcat extends FilterFunctionString {
    constructor(property: string, value: string | FilterFunctionString) {
        super('concat', property, value);
        Utils.requireNotNullNorUndefined(value, 'value');
        Utils.requireNotEmpty(value, 'value');
    }
}
