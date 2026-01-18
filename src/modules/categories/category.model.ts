export interface Category {
    code: string;
    name: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreateCategoryDTO {
    code: string;
    name: string;
    description?: string;
}

export interface UpdateCategoryDTO {
    name?: string;
    description?: string;
}
