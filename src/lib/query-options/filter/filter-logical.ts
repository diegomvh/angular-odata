import { Utils } from '../../utils/utils';
import { OperatorLogical } from '../operator';
import { Filter } from './filter';
import { FilterHasFilter } from './filter-has-filter';

export class FilterLogical extends FilterHasFilter implements Filter {
    private operator: OperatorLogical;

    constructor(filters: Filter[], operator: OperatorLogical) {
        super(filters);
        Utils.requireNotNullNorUndefined(filters, 'filters');
        Utils.requireNotEmpty(filters, 'filters');
        Utils.requireNotNullNorUndefined(operator, 'operator');
        this.operator = operator;
    }

    toString(): string {
        if (this.filter instanceof Array) {
            return Utils.toString(this.filter, this.operator);
        }
        return this.filter.toString();
    }

    isEmpty(): boolean {
        if (Utils.isNullOrUndefined(this.filter)) {
            return true;
        }
        for (const filter of this.filter as Filter[]) {
            if (filter.isEmpty()) {
                return true;
            }
        }
        return false;
    }
}
