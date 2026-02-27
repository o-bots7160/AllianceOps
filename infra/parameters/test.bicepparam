using '../main.bicep'

param environmentName = 'test'
param location = 'centralus'
param swaSkuName = 'Standard'
param swaSkuTier = 'Standard'
param postgresSkuName = 'Standard_B2s'
param postgresSkuTier = 'Burstable'
param budgetAmount = 10
param budgetContactEmails = []
param customDomains = []
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD')
param tbaApiKey = readEnvironmentVariable('TBA_API_KEY', '')
