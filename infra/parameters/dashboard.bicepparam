using '../dashboard.bicep'

param subscriptionId = readEnvironmentVariable('AZURE_SUBSCRIPTION_ID')
param namePrefix = 'aops'
param location = 'centralus'
