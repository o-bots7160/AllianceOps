@description('Name of the Static Web App (e.g. stapp-aops-dev)')
param name string

@description('Azure region')
param location string

@description('SWA SKU name')
@allowed(['Free', 'Standard'])
param skuName string = 'Standard'

@description('SWA SKU tier')
@allowed(['Free', 'Standard'])
param skuTier string = 'Standard'

@description('Resource ID of the linked Function App backend')
param functionAppResourceId string = ''

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {}
}

// Link Function App as backend for API proxying
resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = if (!empty(functionAppResourceId)) {
  parent: staticWebApp
  name: 'backend'
  properties: {
    backendResourceId: functionAppResourceId
    region: location
  }
}

output defaultHostname string = staticWebApp.properties.defaultHostname
output resourceId string = staticWebApp.id
