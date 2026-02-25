using '../dns.bicep'

param domainName = 'allianceops.io'
param environmentName = readEnvironmentVariable('ENVIRONMENT_NAME')
param swaDefaultHostname = readEnvironmentVariable('SWA_DEFAULT_HOSTNAME')
param swaResourceId = readEnvironmentVariable('SWA_RESOURCE_ID', '')
