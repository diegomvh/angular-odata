
export class Utils {
    static isNull(value: any): boolean {
        return value === null;
    }

    static isUndefined(value: any): boolean {
        return value === undefined;
    }

    static isNullOrUndefined(value: any): boolean {
        return Utils.isNull(value) || Utils.isUndefined(value);
    }

    static isNotNullNorUndefined(value: any): boolean {
        return !Utils.isNull(value) && !Utils.isUndefined(value);
    }

    static isObject(value: any): boolean {
        return typeof value === 'object' && !Utils.isNull(value);
    }

    static isArray(value: any): boolean {
        return Array.isArray(value);
    }

    static isEmpty(value: any): boolean {
        if (Utils.isNullOrUndefined(value)
            || typeof (value) === 'string' && !value.length
            || value instanceof Array && !value.length
            || typeof (value.isEmpty) === 'function' && value.isEmpty()) {
            return true;
        }
        if (value instanceof Array && value) {
            for (const v of value) {
                if (!Utils.isEmpty(v)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    static requireNull(fieldValue: any, fieldName: string) {
        if (fieldValue !== null) {
            throw new Error(fieldName + ' must be null');
        }
    }

    static requireUndefined(fieldValue: any, fieldName: string) {
        if (fieldValue !== undefined) {
            throw new Error(fieldName + ' must be undefined');
        }
    }

    static requireNotNull(fieldValue: any, fieldName: string) {
        if (fieldValue === null) {
            throw new Error(fieldName + ' cannot be null');
        }
    }

    static requireNotUndefined(fieldValue: any, fieldName: string) {
        if (fieldValue === undefined) {
            throw new Error(fieldName + ' cannot be undefined');
        }
    }

    static requireNotNullNorUndefined(fieldValue: any, fieldName: string) {
        Utils.requireNotNull(fieldValue, fieldName);
        Utils.requireNotUndefined(fieldValue, fieldName);
    }

    static requireNullOrUndefined(fieldValue: any, fieldName: string) {
        if (!Utils.isNull(fieldValue) && !Utils.isUndefined(fieldValue)) {
            throw new Error(fieldName + ' must be null or undefined');
        }
    }

    static requireNotEmpty(fieldValue: any, fieldName: string) {
        if (Utils.isEmpty(fieldValue)) {
            throw new Error(fieldName + ' cannot be empty');
        }
    }

    static requireNotNegative(fieldValue: number, fieldName: string) {
        if (fieldValue < 0) {
            throw new Error(fieldName + ' cannot be negative');
        }
    }
}
