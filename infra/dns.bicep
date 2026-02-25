targetScope = 'resourceGroup'

@description('Domain name for the DNS zone')
param domainName string = 'allianceops.io'

@description('Environment name (dev or prod)')
@allowed(['dev', 'prod'])
param environmentName string

@description('Default hostname of the current environment\'s SWA')
param swaDefaultHostname string

@description('Resource ID of the prod SWA (required for prod apex alias, ignored for dev)')
param swaResourceId string = ''

module dnsZone 'modules/dnsZone.bicep' = {
  name: 'dnsZone'
  params: {
    domainName: domainName
    environmentName: environmentName
    swaDefaultHostname: swaDefaultHostname
    swaResourceId: swaResourceId
  }
}

output nameServers array = dnsZone.outputs.nameServers
