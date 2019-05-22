import _ from 'lodash';
import gpmfExtract from 'gpmf-extract';
import goproTelemetry from 'gopro-telemetry';
import { promises as fs } from 'fs';
import path from 'path';
import geolib from 'geolib';
import moment from 'moment';

const outputDir = 'output/';
const flySightHeaders = 'time,lat,lon,hMSL,velN,velE,velD,hAcc,vAcc,sAcc,gpsFix,numSV';

const getVelocities = (p1, p2) => {
  const res = { velN: 0, velE: 0, velD: 0 };
  if (!p1) {
    return res;
  }

  const timeElapsed = moment(p2.date).diff(p1.date, 'milliseconds');

  res.velD = ((p1.height - p2.height) / timeElapsed) * 1000;
  res.velN = (getLatDiff(p1, p2) / timeElapsed) * 1000;
  res.velE = (getLongDiff(p1, p2) / timeElapsed) * 1000;

  return res;
};

const getLatDiff = (p1, p2) => {
  return geolib.getDistance(
    { latitude: p1.LL.latitude, longitude: p1.LL.longitude },
    { latitude: p2.LL.latitude, longitude: p1.LL.longitude },
    0,
    10,
  );
};

const getLongDiff = (p1, p2) => {
  return geolib.getDistance(
    { latitude: p1.LL.latitude, longitude: p1.LL.longitude },
    { latitude: p1.LL.latitude, longitude: p2.LL.longitude },
    0,
    10,
  );
};

const mp4ToJSON = async file => {
  const data = await fs.readFile(`${file}`);
  const raw = await gpmfExtract(data);
  const telemetry = goproTelemetry(raw, { stream: ['GPS5'] });

  return _.get(telemetry, '1.streams.GPS5.samples');
};

const JSONToCsv = json => {
  let sticked = {};
  let prevPoint;

  return [
    flySightHeaders,
    ...json.map(curPoint => {
      const { date, value, sticky } = curPoint;

      curPoint.LL = { latitude: value[0], longitude: value[1] };
      curPoint.height = value[2];

      if (sticky) {
        sticked = _.merge(sticked, sticky);
      }

      const bearing = !!prevPoint ? geolib.getRhumbLineBearing(prevPoint.LL, curPoint.LL) : 0;
      const { velN, velE, velD } = getVelocities(prevPoint, curPoint);

      prevPoint = curPoint;

      return [
        !!date.toISOString ? date.toISOString() : date,
        curPoint.LL.latitude,
        curPoint.LL.longitude,
        curPoint.height,
        velN,
        velE,
        velD,
        1,
        1,
        1,
        sticked.fix || 0,
        sticked.precision || 9999,
      ].join(',');
    }),
  ].join('\n');
};

(async () => {
  const file = process.argv[2];
  const outputFileBase = `${outputDir}${path.basename(file)}`;

  if (!file) {
    throw new Error('No input file to parse, see documentation for usage.');
  }

  let json;

  if (!!path.extname(file).match(/json/gi)) {
    json = JSON.parse(await fs.readFile(`${file}`));
  } else {
    json = await mp4ToJSON(file);
    await fs.writeFile(`${outputFileBase}.json`, JSON.stringify(json));
  }

  const csv = JSONToCsv(json);
  await fs.writeFile(`${outputFileBase}.csv`, csv);
})();
