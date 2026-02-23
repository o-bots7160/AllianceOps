@description('Name of the Function App (e.g. func-aops-dev)')
@minLength(3)
param name string

@description('Name of the App Service Plan (e.g. asp-aops-dev)')
param planName string

@description('Name of the Storage Account (e.g. staopsdev)')
param storageAccountName string

@description('Azure region')
param location string

@description('App Service Plan SKU: Y1 (Consumption) or FC1 (Flex Consumption)')
@allowed(['Y1', 'FC1'])
param planSku string = 'Y1'

@description('Application Insights connection string')
param appInsightsConnectionString string = ''

@description('Key Vault name for secret references')
param keyVaultName string = ''

// Flex Consumption uses FlexConsumption tier; Consumption uses Dynamic
var isFlexConsumption = planSku == 'FC1'
var planSkuConfig = isFlexConsumption
  ? { name: 'FC1', tier: 'FlexConsumption' }
  : { name: 'Y1', tier: 'Dynamic' }

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
  }
}

// Blob service (required parent for containers)
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

// Deployment container for Flex Consumption package deployment
resource deploymentContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = if (isFlexConsumption) {
  parent: blobService
  name: 'app-package'
  properties: {
    publicAccess: 'None'
  }
}

resource hostingPlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: planName
  location: location
  sku: planSkuConfig
  kind: isFlexConsumption ? 'functionapp,linux' : 'functionapp'
  properties: {
    reserved: true
  }
}

// Storage connection string for Consumption plan
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value}'

// Base app settings shared by both SKUs
var sharedAppSettings = [
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
  {
    name: 'NODE_ENV'
    value: 'production'
  }
]

// Storage settings differ by plan type
var storageAppSettings = isFlexConsumption
  ? [
      {
        name: 'AzureWebJobsStorage__accountName'
        value: storageAccount.name
      }
    ]
  : [
      {
        name: 'AzureWebJobsStorage'
        value: storageConnectionString
      }
    ]

var kvAppSettings = !empty(keyVaultName)
  ? [
      {
        name: 'TBA_API_KEY'
        value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=TbaApiKey)'
      }
      {
        name: 'DATABASE_URL'
        value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=DatabaseUrl)'
      }
    ]
  : []

var aiAppSettings = !empty(appInsightsConnectionString)
  ? [
      {
        name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
        value: appInsightsConnectionString
      }
    ]
  : []

resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  name: name
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20'
      appSettings: concat(sharedAppSettings, storageAppSettings, kvAppSettings, aiAppSettings)
    }
    functionAppConfig: isFlexConsumption
      ? {
          deployment: {
            storage: {
              type: 'blobContainer'
              value: '${storageAccount.properties.primaryEndpoints.blob}app-package'
              authentication: {
                type: 'SystemAssignedIdentity'
              }
            }
          }
          scaleAndConcurrency: {
            instanceMemoryMB: 2048
            maximumInstanceCount: 100
          }
          runtime: {
            name: 'node'
            version: '20'
          }
        }
      : null
  }
}

// Storage Blob Data Owner role for Flex Consumption managed identity storage access
var storageBlobDataOwnerRoleId = 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'

resource storageBlobRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (isFlexConsumption) {
  name: guid(storageAccount.id, functionApp.id, storageBlobDataOwnerRoleId)
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      storageBlobDataOwnerRoleId
    )
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output defaultHostName string = functionApp.properties.defaultHostName
output resourceId string = functionApp.id
output principalId string = functionApp.identity.principalId
