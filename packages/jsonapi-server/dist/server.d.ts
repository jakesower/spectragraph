import { Schema } from "data-prism";
type Options = {
    port?: number;
};
type Server = {
    getAllHandler: (type: string) => (req: any, res: any) => Promise<void>;
    getOneHandler: (type: string) => (req: any, res: any) => Promise<void>;
    createHandler: (type: string) => (req: any, res: any) => Promise<void>;
    updateHandler: (type: string) => (req: any, res: any) => Promise<void>;
    deleteHandler: (type: string) => (req: any, res: any) => Promise<void>;
};
export declare function createJSONAPIHandlers(schema: Schema, store: any): Server;
export declare function applySchemaRoutes(schema: Schema, store: any, app: any): void;
export declare function createServer(schema: any, store: any, options?: Options): void;
export {};
//# sourceMappingURL=server.d.ts.map