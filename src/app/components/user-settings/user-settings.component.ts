import {Component, Inject, Input, OnChanges, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {User} from 'quantified-self-lib/lib/users/user';
import {AppAuthService} from '../../authentication/app.auth.service';
import {UserService} from '../../services/app.user.service';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import * as Sentry from '@sentry/browser';
import {UserSettingsInterface} from 'quantified-self-lib/lib/users/user.settings.interface';
import {
  ChartThemes,
  UserChartSettingsInterface, XAxisTypes,
} from 'quantified-self-lib/lib/users/user.chart.settings.interface';
import {Log} from 'ng2-logger/browser';
import {AppThemes, UserAppSettingsInterface} from 'quantified-self-lib/lib/users/user.app.settings.interface';
import {DynamicDataLoader} from 'quantified-self-lib/lib/data/data.store';
import {
  DaysOfTheWeek,
  PaceUnits,
  SpeedUnits, SwimPaceUnits,
  UserUnitSettingsInterface, VerticalSpeedUnits
} from 'quantified-self-lib/lib/users/user.unit.settings.interface';
import {UserDashboardSettingsInterface} from "quantified-self-lib/lib/users/user.dashboard.settings.interface";
import {MapThemes, UserMapSettingsInterface} from "quantified-self-lib/lib/users/user.map.settings.interface";
import {LapTypes} from 'quantified-self-lib/lib/laps/lap.types';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.css'],
})
export class UserSettingsComponent implements OnChanges {

  @Input() user: User;
  public currentUser: User;
  public isSaving: boolean;
  public errorSaving;
  public xAxisTypes = XAxisTypes;

  private logger = Log.create('UserSettingsComponent');

  public dataGroups = [
    {
      name: 'Basic Data',
      data: DynamicDataLoader.basicDataTypes
    },
    {
      name: 'Advanced Data',
      data: DynamicDataLoader.advancedDataTypes
    },
  ];

  public appThemes = AppThemes;
  public chartThemes = ChartThemes;
  public mapThemes = MapThemes;
  public lapTypes = {
    'AutoLap': LapTypes.AutoLap,
    'Distance': LapTypes.Distance,
    'Manual': LapTypes.Manual,
    'Interval': LapTypes.Interval,
    'Fitness Equipment': LapTypes.FitnessEquipment,
  };

  public speedUnits = SpeedUnits;
  public verticalSpeedUnits = VerticalSpeedUnits;
  public paceUnits = PaceUnits;
  public swimPaceUnits = SwimPaceUnits;
  public userSettingsFormGroup: FormGroup;

  constructor(private authService: AppAuthService, private route: ActivatedRoute, private userService: UserService, private router: Router, private snackBar: MatSnackBar, private dialog: MatDialog) {
  }

  ngOnChanges(): void {
    // Initialize the user settings and get the enabled ones
    const dataTypesToUse = Object.keys(this.user.settings.chartSettings.dataTypeSettings).filter((dataTypeSettingKey) => {
      return this.user.settings.chartSettings.dataTypeSettings[dataTypeSettingKey].enabled === true;
    });

    this.userSettingsFormGroup = new FormGroup({
      dataTypesToUse: new FormControl(dataTypesToUse, [
        Validators.required,
        // Validators.minLength(1),
      ]),

      appTheme: new FormControl(this.user.settings.appSettings.theme, [
        Validators.required,
        // Validators.minLength(1),
      ]),

      chartTheme: new FormControl(this.user.settings.chartSettings.theme, [
        Validators.required,
        // Validators.minLength(1),
      ]),

      xAxisType: new FormControl(this.user.settings.chartSettings.xAxisType, [
        Validators.required,
        // Validators.minLength(1),
      ]),

      useAnimations: new FormControl(this.user.settings.chartSettings.useAnimations, [
        // Validators.required,
        // Validators.minLength(1),
      ]),

      showAllData: new FormControl(this.user.settings.chartSettings.showAllData, [
        // Validators.required,
        // Validators.minLength(1),
      ]),

      startOfTheWeek: new FormControl(this.user.settings.unitSettings.startOfTheWeek, [
        Validators.required,
        // Validators.minLength(1),
      ]),

      speedUnitsToUse: new FormControl(this.user.settings.unitSettings.speedUnits, [
        Validators.required,
        // Validators.minLength(1),
      ]),

      paceUnitsToUse: new FormControl(this.user.settings.unitSettings.paceUnits, [
        Validators.required,
        // Validators.minLength(1),
      ]),

      swimPaceUnitsToUse: new FormControl(this.user.settings.unitSettings.swimPaceUnits, [
        Validators.required,
        // Validators.minLength(1),
      ]),

      verticalSpeedUnitsToUse: new FormControl(this.user.settings.unitSettings.verticalSpeedUnits, [
        Validators.required,
        // Validators.minLength(1),
      ]),

      showSummaries: new FormControl(this.user.settings.dashboardSettings.showSummaries, [
        // Validators.required,
        // Validators.minLength(1),
      ]),

      pinUploadSection: new FormControl(this.user.settings.dashboardSettings.pinUploadSection, [
        // Validators.required,
        // Validators.minLength(1),
      ]),

      mapTheme: new FormControl(this.user.settings.mapSettings.theme, [
        // Validators.required,
        // Validators.minLength(1),
      ]),

      showMapLaps: new FormControl(this.user.settings.mapSettings.showLaps, [
        // Validators.required,
        // Validators.minLength(1),
      ]),

      showMapArrows: new FormControl(this.user.settings.mapSettings.showArrows, [
        // Validators.required,
        // Validators.minLength(1),
      ]),

      mapLapTypes: new FormControl(this.user.settings.mapSettings.lapTypes, [
        // Validators.required,
        // Validators.minLength(1),
      ]),

    });
  }

  hasError(field?: string) {
    if (!field) {
      return !this.userSettingsFormGroup.valid;
    }
    return !(this.userSettingsFormGroup.get(field).valid && this.userSettingsFormGroup.get(field).touched);
  }

  async onSubmit(event) {
    event.preventDefault();
    if (!this.userSettingsFormGroup.valid) {
      this.validateAllFormFields(this.userSettingsFormGroup);
      return;
    }

    this.isSaving = true;
    try {
      const userChartSettings = Array.from(this.userSettingsFormGroup.get('dataTypesToUse').value).reduce((userChartSettings: UserChartSettingsInterface, dataTypeToUse: string) => {
        userChartSettings.dataTypeSettings[dataTypeToUse] = {enabled: true};
        return userChartSettings
      }, {
        dataTypeSettings: {},
        theme: this.userSettingsFormGroup.get('chartTheme').value,
        useAnimations: this.userSettingsFormGroup.get('useAnimations').value,
        xAxisType: this.userSettingsFormGroup.get('xAxisType').value,
        showAllData: this.userSettingsFormGroup.get('showAllData').value
      });

      await this.userService.updateUserProperties(this.user, {
        settings: <UserSettingsInterface>{
          chartSettings: userChartSettings,
          appSettings: <UserAppSettingsInterface>{theme: this.userSettingsFormGroup.get('appTheme').value},
          mapSettings: <UserMapSettingsInterface>{
            theme: this.userSettingsFormGroup.get('mapTheme').value,
            showLaps: this.userSettingsFormGroup.get('showMapLaps').value,
            showArrows: this.userSettingsFormGroup.get('showMapArrows').value,
            lapTypes: this.userSettingsFormGroup.get('mapLapTypes').value
          },
          unitSettings: <UserUnitSettingsInterface>{
            speedUnits: this.userSettingsFormGroup.get('speedUnitsToUse').value,
            paceUnits: this.userSettingsFormGroup.get('paceUnitsToUse').value,
            swimPaceUnits: this.userSettingsFormGroup.get('swimPaceUnitsToUse').value,
            verticalSpeedUnits: this.userSettingsFormGroup.get('verticalSpeedUnitsToUse').value,
            startOfTheWeek: this.userSettingsFormGroup.get('startOfTheWeek').value,
          },
          dashboardSettings: <UserDashboardSettingsInterface>{
            chartsSettings: this.user.settings.dashboardSettings.chartsSettings,
            showSummaries: this.userSettingsFormGroup.get('showSummaries').value,
            pinUploadSection: this.userSettingsFormGroup.get('pinUploadSection').value,
            startDate: this.user.settings.dashboardSettings.startDate,
            endDate: this.user.settings.dashboardSettings.endDate,
            dateRange: this.user.settings.dashboardSettings.dateRange,
          }
        }
      });
      this.snackBar.open('User updated', null, {
        duration: 2000,
      });
    } catch (e) {
      this.logger.error(e);
      this.snackBar.open('Could not update user', null, {
        duration: 2000,
      });
      Sentry.captureException(e);
      // @todo add logging
    } finally {
      this.isSaving = false;
    }
  }

  validateAllFormFields(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormControl) {
        control.markAsTouched({onlySelf: true});
      } else if (control instanceof FormGroup) {
        this.validateAllFormFields(control);
      }
    });
  }
}
