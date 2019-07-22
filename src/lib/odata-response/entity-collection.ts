import { Utils } from '../utils/utils';
export class EntitySet<T> {
    private entities: T[];
    private count: number;
    private skip: number;

    constructor(entities: T[], count: number, skip: number) {
        Utils.requireNotNullNorUndefined(entities, 'entities');
        this.entities = entities;
        this.count = count;
        this.skip = skip;
    }

    getEntities(): T[] {
        return this.entities;
    }

    getCount(): number {
        return this.count;
    }

    getSkip(): number {
        return this.skip;
    }
}
