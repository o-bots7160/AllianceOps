using '../main.bicep'

param environmentName = 'dev'
param location = 'centralus'
param swaSkuName = 'Standard'
param swaSkuTier = 'Standard'
param budgetAmount = 20
param customDomains = [
  { name: 'dev.allianceops.io', validationMethod: 'cname-delegation' }
]
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD')
param tbaApiKey = readEnvironmentVariable('TBA_API_KEY', '')
