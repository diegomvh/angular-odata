const DURATION_REGEX =
  /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

//https://en.wikipedia.org/wiki/ISO_8601#Durations
export type Duration = {
  sign?: 1 | -1;
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
};

export const Durations = {
  toDuration(v: string): Duration {
    const matches = DURATION_REGEX.exec(v);
    if (!matches || v.length < 3) {
      throw new TypeError(
        `duration invalid: "${v}". Must be a ISO 8601 duration. See https://en.wikipedia.org/wiki/ISO_8601#Durations`,
      );
    }
    let duration: Duration = {};
    duration.sign = matches[1] === '-' ? -1 : 1;
    return [
      'years',
      'months',
      'weeks',
      'days',
      'hours',
      'minutes',
      'seconds',
    ].reduce((acc: any, name, index) => {
      const v = parseFloat(matches[index + 2]);
      if (!Number.isNaN(v)) acc[name] = v;
      return acc;
    }, duration) as Duration;
  },
  toString(v: Duration): string {
    return [
      v.sign === -1 ? '-' : '',
      'P',
      v.years ? v.years + 'Y' : '',
      v.months ? v.months + 'M' : '',
      v.weeks ? v.weeks + 'W' : '',
      v.days ? v.days + 'D' : '',
      'T',
      v.hours ? v.hours + 'H' : '',
      v.minutes ? v.minutes + 'M' : '',
      v.seconds ? v.seconds + 'S' : '',
    ].join('');
  },
};
