@description('Name of the Key Vault (e.g. kv-aops-dev)')
param name string

@description('Azure region')
param location string

@description('Tenant ID for access policies')
param tenantId string = subscription().tenantId

@description('Principal ID of the Function App managed identity')
param functionAppPrincipalId string

@description('TBA API key')
@secure()
param tbaApiKey string = ''

@description('PostgreSQL connection string')
@secure()
param databaseUrl string = ''

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string = ''

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enabledForTemplateDeployment: true
  }
}

// Key Vault Secrets User role ID
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

// Grant Function App's managed identity Key Vault Secrets User role
resource kvSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, functionAppPrincipalId, kvSecretsUserRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId: functionAppPrincipalId
    principalType: 'ServicePrincipal'
  }
}

resource secretTbaApiKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (!empty(tbaApiKey)) {
  parent: keyVault
  name: 'TbaApiKey'
  properties: {
    value: tbaApiKey
  }
}

resource secretDatabaseUrl 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (!empty(databaseUrl)) {
  parent: keyVault
  name: 'DatabaseUrl'
  properties: {
    value: databaseUrl
  }
}

resource secretPostgresPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (!empty(postgresAdminPassword)) {
  parent: keyVault
  name: 'PostgresAdminPassword'
  properties: {
    value: postgresAdminPassword
  }
}

output vaultUri string = keyVault.properties.vaultUri
output vaultName string = keyVault.name
output resourceId string = keyVault.id
