import { QueryOptions } from './query-options';
import { Utils } from '../utils/utils';
import { Filter } from './filter/filter';
import { Orderby } from './orderby';
import { Search } from './search/search';

export class Expand {
    static readonly SEPARATOR = ';';
    private entitySet: string;
    private queryOptions: QueryOptions;

    constructor(entitySet: string) {
        Utils.requireNotNullNorUndefined(entitySet, 'entitySet');
        Utils.requireNotEmpty(entitySet, 'entitySet');
        this.entitySet = entitySet;
        this.queryOptions = new QueryOptions(Expand.SEPARATOR);
    }

    // QUERY OPTIONS

    select(select: string | string[]): Expand {
        this.queryOptions.select(select);
        return this;
    }

    filter(filter: string | Filter): Expand {
        this.queryOptions.filter(filter);
        return this;
    }

    expand(expand: string | Expand | Expand[]): Expand {
        this.queryOptions.expand(expand);
        return this;
    }

    orderby(orderby: string | Orderby[]): Expand {
        this.queryOptions.orderby(orderby);
        return this;
    }

    search(search: string | Search): Expand {
        this.queryOptions.search(search);
        return this;
    }

    skip(skip: number): Expand {
        this.queryOptions.skip(skip);
        return this;
    }

    top(top: number): Expand {
        this.queryOptions.top(top);
        return this;
    }

    customOption(key: string, value: string) {
        this.queryOptions.customOption(key, value);
        return this;
    }

    toString(): string {
        let res: string = this.entitySet;
        if (!Utils.isEmpty(this.queryOptions)) {
            res += '(' + this.queryOptions + ')';
        }
        return res;
    }

    isEmpty(): boolean {
        return Utils.isEmpty(this.entitySet);
    }
}
