import "server-only";
import { parseEnvironment } from "./environment";

export const environment = parseEnvironment(process.env);
