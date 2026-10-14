export type DefaultExport<T> = T extends { default: infer D } ? D : T;
