import { PoolClient, QueryResultRow } from 'pg';
import 'dotenv/config';
export declare const query: <T extends QueryResultRow>(text: string, params?: readonly unknown[]) => Promise<T[]>;
export declare const getClient: () => Promise<PoolClient>;
export declare const closePool: () => Promise<void>;
declare const _default: {
    query: <T extends QueryResultRow>(text: string, params?: readonly unknown[]) => Promise<T[]>;
    getClient: () => Promise<PoolClient>;
    closePool: () => Promise<void>;
};
export default _default;
