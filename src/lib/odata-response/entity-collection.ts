import { Utils } from '../utils/utils';
export class EntitySet<T> {
    private entities: T[];
    private count: number;

    constructor(entities: T[], count: number) {
        Utils.requireNotNullNorUndefined(entities, 'entities');
        this.entities = entities;
        this.count = count;
    }

    getEntities(): T[] {
        return this.entities;
    }

    getCount(): number {
        return this.count;
    }
}
