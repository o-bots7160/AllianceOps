@description('Name of the Function App')
@minLength(3)
param name string

@description('Azure region')
param location string

@description('Application Insights connection string')
param appInsightsConnectionString string = ''

@description('Key Vault name for secret references')
param keyVaultName string = ''

var storageAccountName = take(replace('st${replace(name, '-', '')}', '_', ''), 24)

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'plan-${name}'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true
  }
}

var baseAppSettings = [
  {
    name: 'AzureWebJobsStorage'
    value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value}'
  }
  {
    name: 'FUNCTIONS_EXTENSION_VERSION'
    value: '~4'
  }
  {
    name: 'FUNCTIONS_WORKER_RUNTIME'
    value: 'node'
  }
  {
    name: 'WEBSITE_NODE_DEFAULT_VERSION'
    value: '~20'
  }
]

var kvAppSettings = !empty(keyVaultName) ? [
  {
    name: 'TBA_API_KEY'
    value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=TbaApiKey)'
  }
  {
    name: 'DATABASE_URL'
    value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=DatabaseUrl)'
  }
] : []

var aiAppSettings = !empty(appInsightsConnectionString) ? [
  {
    name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
    value: appInsightsConnectionString
  }
] : []

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: name
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20'
      appSettings: concat(baseAppSettings, kvAppSettings, aiAppSettings)
    }
  }
}

output defaultHostName string = functionApp.properties.defaultHostName
output resourceId string = functionApp.id
output principalId string = functionApp.identity.principalId
