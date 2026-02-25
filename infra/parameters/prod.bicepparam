using '../main.bicep'

param environmentName = 'prod'
param location = 'centralus'
param swaSkuName = 'Standard'
param swaSkuTier = 'Standard'
param budgetAmount = 50
param customDomains = [
  { name: 'www.allianceops.io', validationMethod: 'cname-delegation' }
]
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD')
param tbaApiKey = readEnvironmentVariable('TBA_API_KEY', '')
