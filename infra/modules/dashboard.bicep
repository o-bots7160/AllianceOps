@description('Dashboard resource name (e.g. dash-aops)')
param dashboardName string

@description('Azure subscription ID — used to construct cross-environment resource IDs')
param subscriptionId string

@description('Resource name prefix (e.g. aops)')
param namePrefix string = 'aops'

@description('Azure region used for resource group references')
param location string = 'centralus'

// --- Deterministic resource IDs for both environments -----------------------
// All IDs follow the established naming convention: {abbrev}-{prefix}-{env}

var devRg = 'rg-${namePrefix}-dev'
var prodRg = 'rg-${namePrefix}-prod'
var globalRg = 'rg-${namePrefix}-global'

var devAppInsightsId = '/subscriptions/${subscriptionId}/resourceGroups/${devRg}/providers/Microsoft.Insights/components/appi-${namePrefix}-dev'
var prodAppInsightsId = '/subscriptions/${subscriptionId}/resourceGroups/${prodRg}/providers/Microsoft.Insights/components/appi-${namePrefix}-prod'

var devFuncAppId = '/subscriptions/${subscriptionId}/resourceGroups/${devRg}/providers/Microsoft.Web/sites/func-${namePrefix}-dev'
var prodFuncAppId = '/subscriptions/${subscriptionId}/resourceGroups/${prodRg}/providers/Microsoft.Web/sites/func-${namePrefix}-prod'

var devPostgresId = '/subscriptions/${subscriptionId}/resourceGroups/${devRg}/providers/Microsoft.DBforPostgreSQL/flexibleServers/psql-${namePrefix}-dev'
var prodPostgresId = '/subscriptions/${subscriptionId}/resourceGroups/${prodRg}/providers/Microsoft.DBforPostgreSQL/flexibleServers/psql-${namePrefix}-prod'

var devSwaId = '/subscriptions/${subscriptionId}/resourceGroups/${devRg}/providers/Microsoft.Web/staticSites/stapp-${namePrefix}-dev'
var prodSwaId = '/subscriptions/${subscriptionId}/resourceGroups/${prodRg}/providers/Microsoft.Web/staticSites/stapp-${namePrefix}-prod'

var devRgId = '/subscriptions/${subscriptionId}/resourceGroups/${devRg}'
var prodRgId = '/subscriptions/${subscriptionId}/resourceGroups/${prodRg}'
var globalRgId = '/subscriptions/${subscriptionId}/resourceGroups/${globalRg}'

// --- Dashboard layout constants ---------------------------------------------
// Grid: 24 columns wide. Each tile uses colSpan/rowSpan.
// Layout: full-width headers, then Dev (left 12 cols) / Prod (right 12 cols)

var tileWidth = 6
var tileHeight = 4
var halfWidth = 12
var fullWidth = 24

resource dashboard 'Microsoft.Portal/dashboards@2020-09-01-preview' = {
  name: dashboardName
  location: location
  tags: {
    'hidden-title': 'AllianceOps Operations'
  }
  // The Azure Portal dashboard schema in Bicep doesn't have type definitions for
  // MonitorChartPart tiles — only MarkdownPart is modeled. Wrapping lenses in any()
  // is the standard workaround for this known schema gap.
  properties: {
    lenses: any([
      {
        order: 0
        parts: [
          // =====================================================================
          // ROW 0: Resource Groups
          // =====================================================================
          {
            position: { x: 0, y: 0, colSpan: fullWidth, rowSpan: 2 }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MarkdownPart'
              inputs: []
              settings: {
                content: {
                  settings: {
                    title: 'Resource Groups'
                    subtitle: 'AllianceOps — All Environments'
                    content: '### [rg-${namePrefix}-dev](https://portal.azure.com/#@/resource${devRgId}/overview) &nbsp;|&nbsp; [rg-${namePrefix}-prod](https://portal.azure.com/#@/resource${prodRgId}/overview) &nbsp;|&nbsp; [rg-${namePrefix}-global](https://portal.azure.com/#@/resource${globalRgId}/overview)'
                  }
                }
              }
            }
          }

          // =====================================================================
          // ROW 2: Application Insights header
          // =====================================================================
          {
            position: { x: 0, y: 2, colSpan: fullWidth, rowSpan: 1 }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MarkdownPart'
              inputs: []
              settings: {
                content: {
                  settings: {
                    title: ''
                    subtitle: ''
                    content: '## Application Insights'
                  }
                }
              }
            }
          }

          // --- App Insights: Dev (left) ---
          // Server Requests
          {
            position: { x: 0, y: 3, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Dev — Server Requests'
                      metrics: [
                        {
                          resourceMetadata: { id: devAppInsightsId }
                          name: 'requests/count'
                          aggregationType: 7 // Count
                          namespace: 'microsoft.insights/components'
                          metricVisualization: { displayName: 'Server requests' }
                        }
                      ]
                      visualization: { chartType: 2 } // Line
                    }
                  }
                }
              }
            }
          }
          // Failed Requests
          {
            position: { x: tileWidth, y: 3, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Dev — Failed Requests'
                      metrics: [
                        {
                          resourceMetadata: { id: devAppInsightsId }
                          name: 'requests/failed'
                          aggregationType: 7
                          namespace: 'microsoft.insights/components'
                          metricVisualization: { displayName: 'Failed requests' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }

          // --- App Insights: Prod (right) ---
          // Server Requests
          {
            position: { x: halfWidth, y: 3, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Prod — Server Requests'
                      metrics: [
                        {
                          resourceMetadata: { id: prodAppInsightsId }
                          name: 'requests/count'
                          aggregationType: 7
                          namespace: 'microsoft.insights/components'
                          metricVisualization: { displayName: 'Server requests' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }
          // Failed Requests
          {
            position: { x: halfWidth + tileWidth, y: 3, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Prod — Failed Requests'
                      metrics: [
                        {
                          resourceMetadata: { id: prodAppInsightsId }
                          name: 'requests/failed'
                          aggregationType: 7
                          namespace: 'microsoft.insights/components'
                          metricVisualization: { displayName: 'Failed requests' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }

          // --- App Insights row 2: Response Time ---
          // Dev
          {
            position: { x: 0, y: 7, colSpan: halfWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Dev — Server Response Time'
                      metrics: [
                        {
                          resourceMetadata: { id: devAppInsightsId }
                          name: 'requests/duration'
                          aggregationType: 4 // Average
                          namespace: 'microsoft.insights/components'
                          metricVisualization: { displayName: 'Server response time' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }
          // Prod
          {
            position: { x: halfWidth, y: 7, colSpan: halfWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Prod — Server Response Time'
                      metrics: [
                        {
                          resourceMetadata: { id: prodAppInsightsId }
                          name: 'requests/duration'
                          aggregationType: 4
                          namespace: 'microsoft.insights/components'
                          metricVisualization: { displayName: 'Server response time' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }

          // =====================================================================
          // ROW 11: Function App header
          // =====================================================================
          {
            position: { x: 0, y: 11, colSpan: fullWidth, rowSpan: 1 }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MarkdownPart'
              inputs: []
              settings: {
                content: {
                  settings: {
                    title: ''
                    subtitle: ''
                    content: '## Function App'
                  }
                }
              }
            }
          }

          // --- Function App: Dev (left) ---
          // Execution Count
          {
            position: { x: 0, y: 12, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Dev — Function Executions'
                      metrics: [
                        {
                          resourceMetadata: { id: devFuncAppId }
                          name: 'FunctionExecutionCount'
                          aggregationType: 7
                          namespace: 'Microsoft.Web/sites'
                          metricVisualization: { displayName: 'Execution count' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }
          // Execution Duration
          {
            position: { x: tileWidth, y: 12, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Dev — Execution Duration'
                      metrics: [
                        {
                          resourceMetadata: { id: devFuncAppId }
                          name: 'FunctionExecutionUnits'
                          aggregationType: 7
                          namespace: 'Microsoft.Web/sites'
                          metricVisualization: { displayName: 'Execution units' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }

          // --- Function App: Prod (right) ---
          // Execution Count
          {
            position: { x: halfWidth, y: 12, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Prod — Function Executions'
                      metrics: [
                        {
                          resourceMetadata: { id: prodFuncAppId }
                          name: 'FunctionExecutionCount'
                          aggregationType: 7
                          namespace: 'Microsoft.Web/sites'
                          metricVisualization: { displayName: 'Execution count' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }
          // Execution Duration
          {
            position: { x: halfWidth + tileWidth, y: 12, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Prod — Execution Duration'
                      metrics: [
                        {
                          resourceMetadata: { id: prodFuncAppId }
                          name: 'FunctionExecutionUnits'
                          aggregationType: 7
                          namespace: 'Microsoft.Web/sites'
                          metricVisualization: { displayName: 'Execution units' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }

          // --- Function App row 2: HTTP 5xx ---
          // Dev
          {
            position: { x: 0, y: 16, colSpan: halfWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Dev — HTTP 5xx Errors'
                      metrics: [
                        {
                          resourceMetadata: { id: devFuncAppId }
                          name: 'Http5xx'
                          aggregationType: 7
                          namespace: 'Microsoft.Web/sites'
                          metricVisualization: { displayName: 'HTTP 5xx' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }
          // Prod
          {
            position: { x: halfWidth, y: 16, colSpan: halfWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Prod — HTTP 5xx Errors'
                      metrics: [
                        {
                          resourceMetadata: { id: prodFuncAppId }
                          name: 'Http5xx'
                          aggregationType: 7
                          namespace: 'Microsoft.Web/sites'
                          metricVisualization: { displayName: 'HTTP 5xx' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }

          // =====================================================================
          // ROW 20: PostgreSQL header
          // =====================================================================
          {
            position: { x: 0, y: 20, colSpan: fullWidth, rowSpan: 1 }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MarkdownPart'
              inputs: []
              settings: {
                content: {
                  settings: {
                    title: ''
                    subtitle: ''
                    content: '## PostgreSQL'
                  }
                }
              }
            }
          }

          // --- PostgreSQL: Dev (left) ---
          // CPU %
          {
            position: { x: 0, y: 21, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Dev — CPU %'
                      metrics: [
                        {
                          resourceMetadata: { id: devPostgresId }
                          name: 'cpu_percent'
                          aggregationType: 4
                          namespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
                          metricVisualization: { displayName: 'CPU percent' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }
          // Memory %
          {
            position: { x: tileWidth, y: 21, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Dev — Memory %'
                      metrics: [
                        {
                          resourceMetadata: { id: devPostgresId }
                          name: 'memory_percent'
                          aggregationType: 4
                          namespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
                          metricVisualization: { displayName: 'Memory percent' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }

          // --- PostgreSQL: Prod (right) ---
          // CPU %
          {
            position: { x: halfWidth, y: 21, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Prod — CPU %'
                      metrics: [
                        {
                          resourceMetadata: { id: prodPostgresId }
                          name: 'cpu_percent'
                          aggregationType: 4
                          namespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
                          metricVisualization: { displayName: 'CPU percent' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }
          // Memory %
          {
            position: { x: halfWidth + tileWidth, y: 21, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Prod — Memory %'
                      metrics: [
                        {
                          resourceMetadata: { id: prodPostgresId }
                          name: 'memory_percent'
                          aggregationType: 4
                          namespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
                          metricVisualization: { displayName: 'Memory percent' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }

          // --- PostgreSQL row 2: Connections + Storage ---
          // Dev — Active Connections
          {
            position: { x: 0, y: 25, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Dev — Active Connections'
                      metrics: [
                        {
                          resourceMetadata: { id: devPostgresId }
                          name: 'active_connections'
                          aggregationType: 4
                          namespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
                          metricVisualization: { displayName: 'Active connections' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }
          // Dev — Storage %
          {
            position: { x: tileWidth, y: 25, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Dev — Storage %'
                      metrics: [
                        {
                          resourceMetadata: { id: devPostgresId }
                          name: 'storage_percent'
                          aggregationType: 4
                          namespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
                          metricVisualization: { displayName: 'Storage percent' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }
          // Prod — Active Connections
          {
            position: { x: halfWidth, y: 25, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Prod — Active Connections'
                      metrics: [
                        {
                          resourceMetadata: { id: prodPostgresId }
                          name: 'active_connections'
                          aggregationType: 4
                          namespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
                          metricVisualization: { displayName: 'Active connections' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }
          // Prod — Storage %
          {
            position: { x: halfWidth + tileWidth, y: 25, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Prod — Storage %'
                      metrics: [
                        {
                          resourceMetadata: { id: prodPostgresId }
                          name: 'storage_percent'
                          aggregationType: 4
                          namespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
                          metricVisualization: { displayName: 'Storage percent' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }

          // =====================================================================
          // ROW 29: Static Web App header
          // =====================================================================
          {
            position: { x: 0, y: 29, colSpan: fullWidth, rowSpan: 1 }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MarkdownPart'
              inputs: []
              settings: {
                content: {
                  settings: {
                    title: ''
                    subtitle: ''
                    content: '## Static Web App'
                  }
                }
              }
            }
          }

          // --- SWA: Dev (left) ---
          // Request Count
          {
            position: { x: 0, y: 30, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Dev — SWA Requests'
                      metrics: [
                        {
                          resourceMetadata: { id: devSwaId }
                          name: 'RequestCount'
                          aggregationType: 7
                          namespace: 'Microsoft.Web/staticSites'
                          metricVisualization: { displayName: 'Request count' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }
          // Data Out
          {
            position: { x: tileWidth, y: 30, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Dev — Data Out'
                      metrics: [
                        {
                          resourceMetadata: { id: devSwaId }
                          name: 'DataOut'
                          aggregationType: 1 // Total
                          namespace: 'Microsoft.Web/staticSites'
                          metricVisualization: { displayName: 'Data out' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }

          // --- SWA: Prod (right) ---
          // Request Count
          {
            position: { x: halfWidth, y: 30, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Prod — SWA Requests'
                      metrics: [
                        {
                          resourceMetadata: { id: prodSwaId }
                          name: 'RequestCount'
                          aggregationType: 7
                          namespace: 'Microsoft.Web/staticSites'
                          metricVisualization: { displayName: 'Request count' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }
          // Data Out
          {
            position: { x: halfWidth + tileWidth, y: 30, colSpan: tileWidth, rowSpan: tileHeight }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MonitorChartPart'
              inputs: [
                {
                  name: 'sharedTimeRange'
                  isOptional: true
                }
              ]
              settings: {
                content: {
                  options: {
                    chart: {
                      title: 'Prod — Data Out'
                      metrics: [
                        {
                          resourceMetadata: { id: prodSwaId }
                          name: 'DataOut'
                          aggregationType: 1
                          namespace: 'Microsoft.Web/staticSites'
                          metricVisualization: { displayName: 'Data out' }
                        }
                      ]
                      visualization: { chartType: 2 }
                    }
                  }
                }
              }
            }
          }

          // =====================================================================
          // ROW 34: Budget / Cost header
          // =====================================================================
          {
            position: { x: 0, y: 34, colSpan: fullWidth, rowSpan: 1 }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MarkdownPart'
              inputs: []
              settings: {
                content: {
                  settings: {
                    title: ''
                    subtitle: ''
                    content: '## Budget & Cost'
                  }
                }
              }
            }
          }

          // Budget info tiles (Markdown with links to Cost Management)
          // Dev
          {
            position: { x: 0, y: 35, colSpan: halfWidth, rowSpan: 3 }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MarkdownPart'
              inputs: []
              settings: {
                content: {
                  settings: {
                    title: 'Dev Budget'
                    subtitle: '$20/month'
                    content: '**Budget:** $20/month\n\n[View Cost Analysis](https://portal.azure.com/#@/resource${devRgId}/costanalysis) &nbsp;|&nbsp; [View Budget](https://portal.azure.com/#@/resource${devRgId}/budgets)'
                  }
                }
              }
            }
          }
          // Prod
          {
            position: { x: halfWidth, y: 35, colSpan: halfWidth, rowSpan: 3 }
            metadata: {
              type: 'Extension/HubsExtension/PartType/MarkdownPart'
              inputs: []
              settings: {
                content: {
                  settings: {
                    title: 'Prod Budget'
                    subtitle: '$50/month'
                    content: '**Budget:** $50/month\n\n[View Cost Analysis](https://portal.azure.com/#@/resource${prodRgId}/costanalysis) &nbsp;|&nbsp; [View Budget](https://portal.azure.com/#@/resource${prodRgId}/budgets)'
                  }
                }
              }
            }
          }
        ]
      }
    ])
    metadata: {
      model: {
        timeRange: {
          value: {
            relative: {
              duration: 24
              timeUnit: 1 // Hours
            }
          }
          type: 'MsPortalFx.Composition.Configuration.ValueTypes.TimeRange'
        }
      }
    }
  }
}

output dashboardId string = dashboard.id
