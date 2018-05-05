import { Utils } from '../../utils/utils';
import { QuotedString } from '../../odata-query/quoted-string';
import { OperatorComparison } from '../operator';
import { Filter } from './filter';
import { FilterHasProperty } from './filter-has-property';

export class FilterComparison extends FilterHasProperty implements Filter {
    private operator: OperatorComparison;
    private value: any;

    constructor(property: string, operator: OperatorComparison, value: boolean | number | string | QuotedString) {
        super(property);
        Utils.requireNotNullNorUndefined(property, 'property');
        Utils.requireNotNullNorUndefined(operator, 'operator');
        Utils.requireNotUndefined(value, 'value');
        this.operator = operator;
        this.value = value;
    }

    toString(): string {
        return `${this.property} ${OperatorComparison[this.operator].toLowerCase()} ${Utils.getValueURI(this.value, false)}`;
    }

    isEmpty(): boolean {
        return (Utils.isNullOrUndefined(this.property) || !this.property.length)
            && Utils.isNullOrUndefined(this.operator)
            && Utils.isNullOrUndefined(this.value) || (this.value instanceof Filter && !this.value.isEmpty() || this.value instanceof Array && !this.value.length);
    }
}
