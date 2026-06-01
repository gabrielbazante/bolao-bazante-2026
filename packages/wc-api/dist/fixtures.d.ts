import type { ApiFixture } from "./types";
export declare function normalizeFixture(raw: any): ApiFixture;
export declare function fetchFixtures(apiKey: string, params?: {
    ids?: number[];
}): Promise<ApiFixture[]>;
