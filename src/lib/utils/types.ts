export const Types = {
    isNull(value: any): boolean {
        return value === null;
    },

    isUndefined(value: any): boolean {
        return value === undefined;
    },

    isNullOrUndefined(value: any): boolean {
        return Types.isNull(value) || Types.isUndefined(value);
    },

    isNotNullNorUndefined(value: any): boolean {
        return !Types.isNull(value) && !Types.isUndefined(value);
    },

    isObject(value: any): boolean {
        return typeof value === 'object' && !Types.isNull(value);
    },

    isArray(value: any): boolean {
        return Array.isArray(value);
    },

    isEmpty(value: any): boolean {
        if (Types.isNullOrUndefined(value)
            || typeof (value) === 'string' && !value.length
            || value instanceof Array && !value.length
            || typeof (value.isEmpty) === 'function' && value.isEmpty()) {
            return true;
        }
        if (value instanceof Array && value) {
            for (const v of value) {
                if (!Types.isEmpty(v)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    },

    requireNull(fieldValue: any, fieldName: string) {
        if (fieldValue !== null) {
            throw new Error(fieldName + ' must be null');
        }
    },

    requireUndefined(fieldValue: any, fieldName: string) {
        if (fieldValue !== undefined) {
            throw new Error(fieldName + ' must be undefined');
        }
    },

    requireNotNull(fieldValue: any, fieldName: string) {
        if (fieldValue === null) {
            throw new Error(fieldName + ' cannot be null');
        }
    },

    requireNotUndefined(fieldValue: any, fieldName: string) {
        if (fieldValue === undefined) {
            throw new Error(fieldName + ' cannot be undefined');
        }
    },

    requireNotNullNorUndefined(fieldValue: any, fieldName: string) {
        Types.requireNotNull(fieldValue, fieldName);
        Types.requireNotUndefined(fieldValue, fieldName);
    },

    requireNullOrUndefined(fieldValue: any, fieldName: string) {
        if (!Types.isNull(fieldValue) && !Types.isUndefined(fieldValue)) {
            throw new Error(fieldName + ' must be null or undefined');
        }
    },

    requireNotEmpty(fieldValue: any, fieldName: string) {
        if (Types.isEmpty(fieldValue)) {
            throw new Error(fieldName + ' cannot be empty');
        }
    },

    requireNotNegative(fieldValue: number, fieldName: string) {
        if (fieldValue < 0) {
            throw new Error(fieldName + ' cannot be negative');
        }
    }
}
