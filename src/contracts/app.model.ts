export interface User {
    username: string;
    email: string;
    password: string;
}

export interface EnvObject {
    DATABASE_URL: string;
    JWT_SECRET: string;
    MY_API_KEY: string;
    API_BASE_URL: string;
}

export enum ApiEndpoints {
    CURRENT_WEATHER = '/current.json'
}