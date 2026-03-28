@description('Name of the SignalR Service resource (e.g. sigr-aops-dev)')
param name string

@description('Azure region')
param location string

@description('SignalR Service SKU name')
@allowed(['Free_F1', 'Standard_S1'])
param skuName string = 'Free_F1'

@description('Number of SignalR units (only applies to Standard tier)')
@minValue(1)
param unitCount int = 1

@description('Allowed origins for CORS (e.g. SWA custom domains + localhost)')
param corsAllowedOrigins array = []

@description('Log Analytics Workspace resource ID for diagnostic settings')
param logAnalyticsWorkspaceId string = ''

@description('Diagnostic verbosity level: full = all diagnostics, essential = only critical diagnostics')
@allowed(['full', 'essential'])
param diagnosticLevel string = 'full'

resource signalR 'Microsoft.SignalRService/signalR@2024-03-01' = {
  name: name
  location: location
  sku: {
    name: skuName
    capacity: skuName == 'Free_F1' ? 1 : unitCount
  }
  kind: 'SignalR'
  properties: {
    features: [
      {
        flag: 'ServiceMode'
        value: 'Serverless'
      }
      {
        flag: 'EnableConnectivityLogs'
        value: 'True'
      }
      {
        flag: 'EnableMessagingLogs'
        value: 'True'
      }
    ]
    cors: {
      allowedOrigins: corsAllowedOrigins
    }
    tls: {
      clientCertEnabled: false
    }
  }
}

@secure()
output connectionString string = signalR.listKeys().primaryConnectionString
output hostname string = signalR.properties.hostName
output resourceId string = signalR.id

// Diagnostic settings: SignalR logs → Log Analytics (full diagnostics only)
resource signalRDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (!empty(logAnalyticsWorkspaceId) && diagnosticLevel == 'full') {
  name: 'diag-${name}'
  scope: signalR
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'AllLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}
