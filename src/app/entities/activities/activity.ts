import {ActivityInterface} from './activity.interface';
import {CreatorInterface} from '../creators/creatorInterface';
import {PointInterface} from '../points/point.interface';
import {IDClass} from '../id/id.abstract.class';
import {DataInterface} from '../data/data.interface';
import {Log} from 'ng2-logger';
import {SummaryInterface} from '../summary/summary.interface';
import {LapInterface} from '../laps/lap.interface';
import {IBIData} from '../data/ibi/data.ibi';
import {Point} from '../points/point';

export class Activity extends IDClass implements ActivityInterface {
  public startDate;
  public endDate;
  public type: string;
  public creator: CreatorInterface;
  public summary: SummaryInterface;

  private points: Map<number, PointInterface> = new Map<number, PointInterface>();
  private ibiData: IBIData;
  private laps: LapInterface[] = [];


  constructor() {
    super();
  }

  // @todo should do short or somehow
  addPoint(point: PointInterface, detectCollision: boolean = true) {
    // @todo should do dateguard check
    const existingPoint = this.points.get(point.getDate().getTime());
    if (existingPoint && detectCollision) {
      existingPoint.getData().forEach((data: DataInterface, key: string, map) => {
        if (!point.getDataByType(key)) {
          point.addData(data);
        }
      });
    }
    this.points.set(point.getDate().getTime(), point);
  }

  removePoint(point: PointInterface) {
    this.points.delete(point.getDate().getTime());
  }

  getPoints(startDate?: Date, endDate?: Date, step?: number, sanitizeToSecond?: boolean): PointInterface[] {
    const points: Map<number, PointInterface> = new Map();
    let index = -1;
    this.points.forEach((point: PointInterface, date: number, map) => {
      index++;
      let canBeAdded = true;
      // @todo check inclusions
      if (step && index % step !== 0) {
        canBeAdded = false;
      }
      if (startDate && startDate > point.getDate()) {
        canBeAdded = false;
      }
      if (endDate && endDate < point.getDate()) {
        canBeAdded = false;
      }
      if (canBeAdded) {
        // Set the current loop point on the map
        points.set(point.getDate().getTime(), point);
      }
    });
    return Array.from(points.values());
  }

  getPointsInterpolated(startDate?: Date, endDate?: Date, step?: number): PointInterface[] {
    return Array.from(this.getPoints(startDate, endDate, step).reduce((pointsMap: Map<number, PointInterface>, point: PointInterface) => {
      // copy the point and set it's date to 0 ms so 1s interpolation
      const interpolatedDateTimePoint = new Point(new Date(new Date(point.getDate().getTime()).setMilliseconds(0)));
      point.getData().forEach((data: DataInterface, key, map) => {
        interpolatedDateTimePoint.addData(data);
      });

      // Check if we already have an existing point in our local map for that time
      const existingPoint = pointsMap.get(interpolatedDateTimePoint.getDate().getTime());
      if (existingPoint) {
        // If it exists go over it's data and add them to the current iteration point
        existingPoint.getData().forEach((data: DataInterface, key) => {
          interpolatedDateTimePoint.addData(data);
        });
      }
      pointsMap.set(interpolatedDateTimePoint.getDate().getTime(), interpolatedDateTimePoint);
      return pointsMap;
    }, new Map<number, PointInterface>()).values());
  }

  getStartPoint(): PointInterface {
    return this.getPoints()[0];
  }

  getEndPoint(): PointInterface {
    return this.getPoints()[this.getPoints().length - 1];
  }

  setIBIData(ibiData: IBIData) {
    this.ibiData = ibiData;
  }

  getIBIData(): IBIData {
    return this.ibiData;
  }

  addLap(lap: LapInterface) {
    this.laps.push(lap);
  }

  getLaps(activity?: ActivityInterface): LapInterface[] {
    return this.laps;
  }

  sortPointsByDate(): void {
    this.getPoints().sort((pointA: PointInterface, pointB: PointInterface) => {
      return pointA.getDate().getTime() - pointB.getDate().getTime();
    });
  }

  toJSON(): any {
    return {
      id: this.getID(),
      startDate: this.startDate,
      endDate: this.endDate,
      type: this.type,
      creator: this.creator.toJSON(),
      points: this.getPoints().reduce((jsonPointsArray: any[], point: PointInterface) => {
        jsonPointsArray.push(point.toJSON());
        return jsonPointsArray;
      }, []),
      summary: this.summary.toJSON(),
      ibiData: this.getIBIData() ? this.getIBIData().toJSON() : [],
      laps: this.getLaps().reduce((jsonLapsArray: any[], lap: LapInterface) => {
        jsonLapsArray.push(lap.toJSON());
        return jsonLapsArray;
      }, []),
    };
  }
}
