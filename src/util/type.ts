export interface Timestamp {
    seconds: string;
    nanos?: number;
}

export type JsonSchemaType = 'string'|'number'|'object'|'integer'|'array'|'null';

export interface JsonSchema<T extends JsonSchemaType=JsonSchemaType> {
    type: T;
    title?: string;
    examples?: any[];
    default?: any;
    properties?: {
        [id: string]: JsonSchema;
    };
    enum?: any[];
    items?: JsonSchema;
    required?: string[];
}


export const StringProperty = (label: string, required?, placeholder?: string, extra?: any): JsonSchema<'string'> => {
    const result: any = {
        type: 'string',
        title: label,
    };
    if (placeholder) {
        result.examples = [placeholder];
    }
    if (required) {
        result.minLength = 2;
    }
    return {
        ...result,
        ...extra,
    };
};


export const IntegerProperty = (label: string, required?, placeholder?: string, extra?: any): JsonSchema<'integer'> => {
    const result: any = {
        type: 'integer',
        title: label,
    };
    if (placeholder) {
        result.examples = [placeholder];
    }
    return {
        ...result,
        ...extra,
    };
};

export const ArrayProperty = (label: string, required?, placeholder?: string, itemType?: JsonSchemaType, extra?: any): JsonSchema<'array'> => {
    const result: any = {
        type: 'array',
        title: label,
    };
    if (placeholder) {
        result.examples = [placeholder];
    }
    if (required) {
        result.minLength = 2;
    }
    if (itemType) {
        result.items = {
            type: itemType,
        };
    }
    return {
        ...result,
        ...extra,
    };
};

export class JsonSchemaObjectType implements JsonSchema<'object'> {
    type: 'object'='object';

    constructor(
        public properties: any = {},
        public required: string[] = [],
    ) { }

    addStringProperty(name: string, label: string, required?: boolean, placeHolder?: string, extra?: any) {
        this.properties[name] = StringProperty(label, required, placeHolder, extra);
        if (required) {
            this.required.push(name);
        }
    }

    addEnumProperty(name: string, label: string, enumData: any[], required?: boolean, extra?: any) {
        this.properties[name] = StringProperty(label, required, undefined, {
            ...extra,
            enum: enumData,
        });
        if (required) {
            this.required.push(name);
        }
    }

    addArrayProperty(name: string, label: string, required?: boolean, itemType?: JsonSchemaType, extra?: any) {
        this.properties[name] = ArrayProperty(label, required, undefined, itemType, {
            ...extra,
        });
        if (required) {
            this.required.push(name);
        }
    }

    addIntegerProperty(name: string, label: string, required?: boolean, placeHolder?: string, extra?: any) {
        this.properties[name] = IntegerProperty(label, required, placeHolder, extra);
        if (required) {
            this.required.push(name);
        }
    }
}
