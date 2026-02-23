targetScope = 'resourceGroup'

@description('Environment name (dev or prod)')
param environmentName string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Name prefix for all resources')
param namePrefix string = 'allianceops'

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string

@description('TBA API key')
@secure()
param tbaApiKey string = ''

var resourceSuffix = '${namePrefix}-${environmentName}'

module appInsights 'modules/appInsights.bicep' = {
  name: 'appInsights'
  params: {
    name: 'ai-${resourceSuffix}'
    location: location
  }
}

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    name: 'pg-${resourceSuffix}'
    location: location
    adminPassword: postgresAdminPassword
  }
}

module functionApp 'modules/functionApp.bicep' = {
  name: 'functionApp'
  params: {
    name: 'func-${resourceSuffix}'
    location: location
    appInsightsConnectionString: appInsights.outputs.connectionString
    keyVaultName: 'kv-${resourceSuffix}'
  }
}

module keyVault 'modules/keyVault.bicep' = {
  name: 'keyVault'
  params: {
    name: 'kv-${resourceSuffix}'
    location: location
    functionAppPrincipalId: functionApp.outputs.principalId
    tbaApiKey: tbaApiKey
    databaseUrl: 'postgresql://${postgres.outputs.serverFqdn}:5432/allianceops'
  }
}

module staticWebApp 'modules/staticWebApp.bicep' = {
  name: 'staticWebApp'
  params: {
    name: 'swa-${resourceSuffix}'
    location: location
  }
}

output staticWebAppUrl string = staticWebApp.outputs.defaultHostname
output functionAppUrl string = functionApp.outputs.defaultHostName
output keyVaultName string = keyVault.outputs.vaultName
output appInsightsConnectionString string = appInsights.outputs.connectionString
