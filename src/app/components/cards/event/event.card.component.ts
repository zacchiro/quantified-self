import {
  Component,
  OnChanges,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {combineLatest, EMPTY, Observable, of, Subscription} from 'rxjs';
import {ActivatedRoute, Params, Router} from '@angular/router';
import {AppEventColorService} from '../../../services/color/app.event.color.service';
import {EventService} from '../../../services/app.event.service';
import {ActivityInterface} from 'quantified-self-lib/lib/activities/activity.interface';
import {EventInterface} from 'quantified-self-lib/lib/events/event.interface';
import {UserSettingsService} from '../../../services/app.user.settings.service';
import {DataLatitudeDegrees} from 'quantified-self-lib/lib/data/data.latitude-degrees';
import {DataLongitudeDegrees} from 'quantified-self-lib/lib/data/data.longitude-degrees';
import {map, mergeMap, switchMap} from 'rxjs/operators';
import {StreamInterface} from 'quantified-self-lib/lib/streams/stream.interface';
import {MatSnackBar} from '@angular/material';


@Component({
  selector: 'app-event-card',
  templateUrl: './event.card.component.html',
  styleUrls: ['./event.card.component.css'],
})

export class EventCardComponent implements OnInit, OnDestroy, OnChanges {
  public event: EventInterface;
  public selectedTabIndex;
  public streams: StreamInterface[] = [];
  public selectedActivities: ActivityInterface[] = [];

  public showMapAutoLaps: boolean;
  public showMapManualLaps: boolean;
  public showMapDataWarnings: boolean;
  public showData: boolean;
  public showAdvancedStats: boolean;

  public useDistanceAxis: boolean;

  private parametersSubscription: Subscription;

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private eventService: EventService,
    private userSettingsService: UserSettingsService,
    private snackBar: MatSnackBar,
    public eventColorService: AppEventColorService) {
  }

  ngOnChanges() {
    // debugger;
  }

  async ngOnInit() {
    this.userSettingsService.getShowAutoLaps().then(value => this.showMapAutoLaps = value);
    this.userSettingsService.getShowManualLaps().then(value => this.showMapManualLaps = value);
    this.userSettingsService.getShowData().then(value => this.showData = value);
    this.userSettingsService.showDataWarnings().then(value => this.showMapDataWarnings = value);
    this.userSettingsService.useDistanceAxis().then(value => this.useDistanceAxis = value);
    this.userSettingsService.showAdvancedStats().then(value => this.showAdvancedStats = value);

    // @todo test maps , switchmap etc with delete and order firing etc
    this.parametersSubscription = this.route.queryParams.pipe(map((params) => {
      this.selectedTabIndex = +params['tabIndex'];
      return params
    })).pipe(mergeMap((params) => {
      // debugger;
      // If the current event is the same then return empty
      if (this.event && this.event.getID() === params['eventID']) {
        return EMPTY
      }
      // debugger;
      return this.eventService.getEvent(params['eventID']);
    })).pipe(map((event) => {
      if (!event) {
        this.router.navigate(['/dashboard']);
        this.snackBar.open('Not found', null, {
          duration: 5000,
        });
        return
      }
      this.event = event;
      this.selectedActivities = event.getActivities();
    })).subscribe()
  }

  ngOnDestroy(): void {
    this.parametersSubscription.unsubscribe();
  }

  hasLaps(event: EventInterface): boolean {
    return !!this.event.getActivities().reduce((lapsArray, activity) => lapsArray.concat(activity.getLaps()), []).length
  }
}
