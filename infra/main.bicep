targetScope = 'resourceGroup'

@description('Environment name (dev, prod, or test)')
@allowed(['dev', 'prod', 'test'])
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

@description('PostgreSQL SKU name')
param postgresSkuName string = 'Standard_B1ms'

@description('PostgreSQL SKU tier')
param postgresSkuTier string = 'Burstable'

@description('Monthly budget amount in USD')
param budgetAmount int = 20

@description('Contact email addresses for budget alerts')
param budgetContactEmails array = []

@description('Custom domains for the SWA. Array of objects: { name: string, validationMethod: string }')
param customDomains array = []

@description('Number of always-ready Function App HTTP instances (0 = none)')
param functionAlwaysReadyCount int = 0

@description('Link the Function App as a SWA backend (enables EasyAuth; disable for direct FA testing)')
param linkFunctionAppBackend bool = true

@description('Budget start date (YYYY-MM-01 format, defaults to current month)')
param budgetStartDate string = '${utcNow('yyyy')}-${utcNow('MM')}-01'

@description('SignalR Service SKU (Free_F1 or Standard_S1)')
@allowed(['Free_F1', 'Standard_S1'])
param signalRSkuName string = 'Free_F1'

@description('Diagnostic verbosity level: full = all diagnostics, essential = only critical diagnostics')
@allowed(['full', 'essential'])
param diagnosticLevel string = 'full'

@description('Log Analytics data retention in days (minimum 30 for PerGB2018 SKU)')
@minValue(30)
@maxValue(730)
param logRetentionDays int = 30

@description('Log Analytics daily ingestion cap in GB (string to support decimal values like "0.5")')
param logDailyCapGb string = '1'

@description('Application Insights sampling percentage (1-100). Lower values reduce telemetry volume and cost.')
@minValue(1)
@maxValue(100)
param appInsightsSamplingPercentage int = 100

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
    retentionInDays: logRetentionDays
    dailyQuotaGb: logDailyCapGb
  }
}

module postgres 'modules/postgres.bicep' = {
  name: '${deployPrefix}-postgres'
  params: {
    name: 'psql-${suffix}'
    location: location
    adminPassword: postgresAdminPassword
    skuName: postgresSkuName
    skuTier: postgresSkuTier
    logAnalyticsWorkspaceId: appInsights.outputs.logAnalyticsWorkspaceId
    diagnosticLevel: diagnosticLevel
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
    alwaysReadyCount: functionAlwaysReadyCount
    diagnosticLevel: diagnosticLevel
    appInsightsSamplingPercentage: appInsightsSamplingPercentage
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
    signalRConnectionString: signalR.outputs.connectionString
    logAnalyticsWorkspaceId: appInsights.outputs.logAnalyticsWorkspaceId
    diagnosticLevel: diagnosticLevel
  }
}

module staticWebApp 'modules/staticWebApp.bicep' = {
  name: '${deployPrefix}-staticWebApp'
  params: {
    name: 'stapp-${suffix}'
    location: location
    skuName: swaSkuName
    skuTier: swaSkuTier
    functionAppResourceId: linkFunctionAppBackend ? functionApp.outputs.resourceId : ''
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

module signalR 'modules/signalR.bicep' = {
  name: '${deployPrefix}-signalR'
  params: {
    name: 'sigr-${suffix}'
    location: location
    skuName: signalRSkuName
    corsAllowedOrigins: [
      'https://${staticWebApp.outputs.defaultHostname}'
      'http://localhost:4280'
    ]
    logAnalyticsWorkspaceId: appInsights.outputs.logAnalyticsWorkspaceId
    diagnosticLevel: diagnosticLevel
  }
}

output staticWebAppUrl string = staticWebApp.outputs.defaultHostname
output functionAppUrl string = functionApp.outputs.defaultHostName
output keyVaultName string = keyVault.outputs.vaultName
output appInsightsConnectionString string = appInsights.outputs.connectionString
output signalRHostname string = signalR.outputs.hostname
