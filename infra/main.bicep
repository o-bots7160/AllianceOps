targetScope = 'resourceGroup'

@description('Environment name (dev or prod)')
param environmentName string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Name prefix for all resources')
param namePrefix string = 'allianceops'

var resourceSuffix = '${namePrefix}-${environmentName}'

module staticWebApp 'modules/staticWebApp.bicep' = {
  name: 'staticWebApp'
  params: {
    name: 'swa-${resourceSuffix}'
    location: location
  }
}

module functionApp 'modules/functionApp.bicep' = {
  name: 'functionApp'
  params: {
    name: 'func-${resourceSuffix}'
    location: location
  }
}

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    name: 'pg-${resourceSuffix}'
    location: location
  }
}

output staticWebAppUrl string = staticWebApp.outputs.defaultHostname
output functionAppUrl string = functionApp.outputs.defaultHostname
