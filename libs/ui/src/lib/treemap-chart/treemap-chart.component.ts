import { getLocale } from '@ghostfolio/common/helper';
import { PortfolioPosition, UniqueAsset } from '@ghostfolio/common/interfaces';

import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { DataSource } from '@prisma/client';
import { ChartConfiguration } from 'chart.js';
import { LinearScale } from 'chart.js';
import { Chart } from 'chart.js';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';
import { orderBy } from 'lodash';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

const { gray, green, red } = require('open-color');

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgxSkeletonLoaderModule],
  selector: 'gf-treemap-chart',
  standalone: true,
  styleUrls: ['./treemap-chart.component.scss'],
  templateUrl: './treemap-chart.component.html'
})
export class GfTreemapChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() cursor: string;
  @Input() holdings: PortfolioPosition[];

  @Output() treemapChartClicked = new EventEmitter<UniqueAsset>();

  @ViewChild('chartCanvas') chartCanvas: ElementRef<HTMLCanvasElement>;

  public chart: Chart<'treemap'>;
  public isLoading = true;

  public constructor() {
    Chart.register(LinearScale, TreemapController, TreemapElement);
  }

  public ngAfterViewInit() {
    if (this.holdings) {
      this.initialize();
    }
  }

  public ngOnChanges() {
    if (this.holdings) {
      this.initialize();
    }
  }

  public ngOnDestroy() {
    this.chart?.destroy();
  }

  private initialize() {
    this.isLoading = true;

    const data: ChartConfiguration['data'] = <any>{
      datasets: [
        {
          backgroundColor(ctx) {
            const netPerformancePercentWithCurrencyEffect =
              ctx.raw._data.netPerformancePercentWithCurrencyEffect;

            if (netPerformancePercentWithCurrencyEffect > 0.03) {
              return green[9];
            } else if (netPerformancePercentWithCurrencyEffect > 0.02) {
              return green[7];
            } else if (netPerformancePercentWithCurrencyEffect > 0.01) {
              return green[5];
            } else if (netPerformancePercentWithCurrencyEffect > 0) {
              return green[3];
            } else if (netPerformancePercentWithCurrencyEffect === 0) {
              return gray[3];
            } else if (netPerformancePercentWithCurrencyEffect > -0.01) {
              return red[3];
            } else if (netPerformancePercentWithCurrencyEffect > -0.02) {
              return red[5];
            } else if (netPerformancePercentWithCurrencyEffect > -0.03) {
              return red[7];
            } else {
              return red[9];
            }
          },
          key: 'allocationInPercentage',
          labels: {
            align: 'left',
            color: ['white'],
            display: true,
            font: [{ size: 14 }, { size: 11 }, { lineHeight: 2, size: 14 }],
            formatter(ctx) {
              const netPerformancePercentWithCurrencyEffect =
                ctx.raw._data.netPerformancePercentWithCurrencyEffect;

              return [
                ctx.raw._data.name,
                ctx.raw._data.symbol,
                `${netPerformancePercentWithCurrencyEffect > 0 ? '+' : ''}${(ctx.raw._data.netPerformancePercentWithCurrencyEffect * 100).toFixed(2)}%`
              ];
            },
            position: 'top'
          },
          spacing: 1,
          tree: this.holdings
        }
      ]
    };

    if (this.chartCanvas) {
      if (this.chart) {
        this.chart.data = data;
        this.chart.update();
      } else {
        this.chart = new Chart(this.chartCanvas.nativeElement, {
          data,
          options: <unknown>{
            animation: false,
            onClick: (event, activeElements) => {
              try {
                const dataIndex = activeElements[0].index;
                const datasetIndex = activeElements[0].datasetIndex;

                const dataset = orderBy(
                  event.chart.data.datasets[datasetIndex].tree,
                  ['allocationInPercentage'],
                  ['desc']
                );

                const dataSource: DataSource = dataset[dataIndex].dataSource;
                const symbol: string = dataset[dataIndex].symbol;

                this.treemapChartClicked.emit({ dataSource, symbol });
              } catch {}
            },
            onHover: (event, chartElement) => {
              if (this.cursor) {
                event.native.target.style.cursor = chartElement[0]
                  ? this.cursor
                  : 'default';
              }
            },
            plugins: {
              tooltip: {
                enabled: false
              }
            }
          },
          type: 'treemap'
        });
      }
    }

    this.isLoading = false;
  }
}
