import { Utils } from '../../utils/utils';
import { OperatorLogical } from '../operator';
import { Search } from './search';

export class SearchLogical extends Search {
    constructor(private values: Search[], private operator: OperatorLogical) {
        super();
        Utils.requireNotNullNorUndefined(values, 'values');
        Utils.requireNotNullNorUndefined(operator, 'operator');
        Utils.requireNotEmpty(values, 'values');

        if (operator === OperatorLogical.NOT && values.length !== 1) {
            throw new Error('operator ' + OperatorLogical[operator] + ' requires a single value');
        }
    }

    toString(): string {
        return Utils.toString(this.values, this.operator, true);
    }

    isEmpty(): boolean {
        if (Utils.isNullOrUndefined(this.values)) {
            return true;
        }
        for (const value of this.values) {
            if (value.isEmpty()) {
                return true;
            }
        }
        return false;
    }
}
