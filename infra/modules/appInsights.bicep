@description('Name of the Application Insights resource')
param name string

@description('Azure region')
param location string

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'law-${name}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: name
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource availabilityTest 'Microsoft.Insights/webtests@2022-06-15' = {
  name: 'health-${name}'
  location: location
  kind: 'standard'
  tags: {
    'hidden-link:${appInsights.id}': 'Resource'
  }
  properties: {
    SyntheticMonitorId: 'health-${name}'
    Name: 'Health Check'
    Enabled: true
    Frequency: 300
    Timeout: 30
    Kind: 'standard'
    RetryEnabled: true
    Locations: [
      { Id: 'us-va-ash-azr' }
      { Id: 'us-il-ch1-azr' }
    ]
    Request: {
      RequestUrl: 'https://placeholder.azurewebsites.net/api/health'
      HttpVerb: 'GET'
      ParseDependentRequests: false
    }
    ValidationRules: {
      ExpectedHttpStatusCode: 200
      SSLCheck: true
      SSLCertRemainingLifetimeCheck: 7
    }
  }
}

output instrumentationKey string = appInsights.properties.InstrumentationKey
output connectionString string = appInsights.properties.ConnectionString
output resourceId string = appInsights.id
