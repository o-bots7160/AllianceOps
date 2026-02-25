targetScope = 'resourceGroup'

@description('Environment name (dev or prod)')
@allowed(['dev', 'prod'])
param environmentName string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Name prefix for all resources')
param namePrefix string = 'aops'

@description('Static Web App SKU name')
@allowed(['Free', 'Standard'])
param swaSkuName string = 'Standard'

@description('Static Web App SKU tier')
@allowed(['Free', 'Standard'])
param swaSkuTier string = 'Standard'

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string

@description('TBA API key')
@secure()
param tbaApiKey string = ''

@description('Monthly budget amount in USD')
param budgetAmount int = 20

@description('Contact email addresses for budget alerts')
param budgetContactEmails array = []

@description('Custom domains for the SWA. Array of objects: { name: string, validationMethod: string }')
param customDomains array = []

@description('Budget start date (YYYY-MM-01 format, defaults to current month)')
param budgetStartDate string = '${utcNow('yyyy')}-${utcNow('MM')}-01'

// Resource naming: {abbreviation}-{prefix}-{env}
var suffix = '${namePrefix}-${environmentName}'
// Storage accounts cannot have hyphens
var storageAccountName = 'st${namePrefix}${environmentName}'
// Sub-deployment names inherit the parent deployment name for traceability
var deployPrefix = deployment().name

module appInsights 'modules/appInsights.bicep' = {
  name: '${deployPrefix}-appInsights'
  params: {
    appInsightsName: 'appi-${suffix}'
    logAnalyticsName: 'log-${suffix}'
    location: location
  }
}

module postgres 'modules/postgres.bicep' = {
  name: '${deployPrefix}-postgres'
  params: {
    name: 'psql-${suffix}'
    location: location
    adminPassword: postgresAdminPassword
    logAnalyticsWorkspaceId: appInsights.outputs.logAnalyticsWorkspaceId
  }
}

module functionApp 'modules/functionApp.bicep' = {
  name: '${deployPrefix}-functionApp'
  params: {
    name: 'func-${suffix}'
    planName: 'asp-${suffix}'
    storageAccountName: storageAccountName
    location: location
    appInsightsConnectionString: appInsights.outputs.connectionString
    keyVaultName: 'kv-${suffix}'
    logAnalyticsWorkspaceId: appInsights.outputs.logAnalyticsWorkspaceId
  }
}

module keyVault 'modules/keyVault.bicep' = {
  name: '${deployPrefix}-keyVault'
  params: {
    name: 'kv-${suffix}'
    location: location
    functionAppPrincipalId: functionApp.outputs.principalId
    tbaApiKey: tbaApiKey
    databaseUrl: 'postgresql://${postgres.outputs.adminLogin}:${postgresAdminPassword}@${postgres.outputs.serverFqdn}:5432/allianceops?sslmode=require'
    postgresAdminPassword: postgresAdminPassword
    logAnalyticsWorkspaceId: appInsights.outputs.logAnalyticsWorkspaceId
  }
}

module staticWebApp 'modules/staticWebApp.bicep' = {
  name: '${deployPrefix}-staticWebApp'
  params: {
    name: 'stapp-${suffix}'
    location: location
    skuName: swaSkuName
    skuTier: swaSkuTier
    functionAppResourceId: functionApp.outputs.resourceId
    customDomains: customDomains
  }
}

module budget 'modules/budget.bicep' = if (!empty(budgetContactEmails)) {
  name: '${deployPrefix}-budget'
  params: {
    name: 'budget-${suffix}'
    amount: budgetAmount
    contactEmails: budgetContactEmails
    startDate: budgetStartDate
  }
}

output staticWebAppUrl string = staticWebApp.outputs.defaultHostname
output functionAppUrl string = functionApp.outputs.defaultHostName
output keyVaultName string = keyVault.outputs.vaultName
output appInsightsConnectionString string = appInsights.outputs.connectionString
