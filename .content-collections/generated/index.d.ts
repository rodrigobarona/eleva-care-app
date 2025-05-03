import configuration from "../../content-collections.ts";
import { GetTypeByName } from "@content-collections/core";

export type About = GetTypeByName<typeof configuration, "about">;
export declare const allAbouts: Array<About>;

export {};
