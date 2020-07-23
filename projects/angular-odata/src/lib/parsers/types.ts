//https://en.wikipedia.org/wiki/ISO_8601#Durations

export type Duration = {
  sign?: 1 | -1;
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}