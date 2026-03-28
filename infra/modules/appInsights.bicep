@description('Name of the Application Insights resource (e.g. appi-aops-dev)')
param appInsightsName string

@description('Name of the Log Analytics Workspace (e.g. log-aops-dev)')
param logAnalyticsName string

@description('Azure region')
param location string

@description('Log Analytics data retention in days (minimum 30 for PerGB2018 SKU)')
@minValue(30)
@maxValue(730)
param retentionInDays int = 30

@description('Log Analytics daily ingestion cap in GB (string to support decimal values like "0.5")')
param dailyQuotaGb string = '1'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: retentionInDays
    workspaceCapping: {
      dailyQuotaGb: json(dailyQuotaGb)
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

output instrumentationKey string = appInsights.properties.InstrumentationKey
output connectionString string = appInsights.properties.ConnectionString
output resourceId string = appInsights.id
output logAnalyticsWorkspaceId string = logAnalytics.id
