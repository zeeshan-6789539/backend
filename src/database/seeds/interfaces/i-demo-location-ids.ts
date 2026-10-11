export interface IDemoLocationIds {
  // City name -> id
  cityIds: ReadonlyMap<string, string>;
  // "City/Area" -> id, since area names repeat across cities
  areaIds: ReadonlyMap<string, string>;
}
