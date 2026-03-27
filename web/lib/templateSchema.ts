export type SchemaFieldType = "text" | "textarea" | "radio" | "date" | "group" | "checkbox";

export interface SchemaField {
    id: string;
    label?: string;
    title?: string;
    type?: SchemaFieldType;
    options?: string[];
    fields?: SchemaField[];
    entityType?: "natural" | "organization";
    required?: boolean;
    placeholder?: string;
}

export interface SchemaSection {
    id: string;
    title: string;
    type?: "builtin_parties" | "builtin_preservation" | "builtin_mediation" | "builtin_signature";
    hasFreeText?: boolean;
    fields: SchemaField[];
}

export interface TemplateSchema {
    id: string;
    name: string;
    subtitle: string;
    templateFile: string;
    pageCount: number;
    partyType: string;
    hasThirdParty: boolean;
    sections: SchemaSection[];
}
