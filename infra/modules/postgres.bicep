@description('Name of the PostgreSQL Flexible Server (e.g. psql-aops-dev)')
param name string

@description('Azure region')
param location string

@description('Administrator login')
param adminLogin string = 'aopsadmin'

@secure()
@description('Administrator password')
param adminPassword string

@description('Azure AD tenant ID for Entra ID authentication')
param tenantId string = subscription().tenantId

@description('Log Analytics Workspace resource ID for diagnostic settings')
param logAnalyticsWorkspaceId string = ''

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: name
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    authConfig: {
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Enabled'
      tenantId: tenantId
    }
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgresServer
  name: 'allianceops'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Allow Azure services to connect
resource firewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  dependsOn: [database]
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

output serverFqdn string = postgresServer.properties.fullyQualifiedDomainName
output adminLogin string = adminLogin
output databaseName string = database.name

// Server parameter: enable logging of connections
resource logConnections 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: postgresServer
  name: 'log_connections'
  dependsOn: [firewallRule]
  properties: {
    value: 'on'
    source: 'user-override'
  }
}

// Server parameter: enable logging of disconnections
resource logDisconnections 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: postgresServer
  name: 'log_disconnections'
  dependsOn: [logConnections]
  properties: {
    value: 'on'
    source: 'user-override'
  }
}

// Server parameter: log checkpoints
resource logCheckpoints 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: postgresServer
  name: 'log_checkpoints'
  dependsOn: [logDisconnections]
  properties: {
    value: 'on'
    source: 'user-override'
  }
}

// Server parameter: log slow queries (>1s)
resource logMinDurationStatement 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: postgresServer
  name: 'log_min_duration_statement'
  dependsOn: [logCheckpoints]
  properties: {
    value: '1000'
    source: 'user-override'
  }
}

// Diagnostic settings: PostgreSQL logs → Log Analytics
resource postgresDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (!empty(logAnalyticsWorkspaceId)) {
  name: 'diag-${name}'
  scope: postgresServer
  dependsOn: [logMinDurationStatement]
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'PostgreSQLLogs'
        enabled: true
      }
      {
        category: 'PostgreSQLFlexSessions'
        enabled: true
      }
      {
        category: 'PostgreSQLFlexQueryStoreRuntime'
        enabled: true
      }
      {
        category: 'PostgreSQLFlexQueryStoreWaitStats'
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
