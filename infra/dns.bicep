targetScope = 'resourceGroup'

@description('Domain name for the DNS zone')
param domainName string = 'allianceops.io'

@description('Default hostname of the dev SWA')
param devSwaDefaultHostname string

@description('Default hostname of the prod SWA')
param prodSwaDefaultHostname string

@description('Resource ID of the prod SWA (for apex alias record)')
param prodSwaResourceId string

module dnsZone 'modules/dnsZone.bicep' = {
  name: 'dnsZone'
  params: {
    domainName: domainName
    devSwaDefaultHostname: devSwaDefaultHostname
    prodSwaDefaultHostname: prodSwaDefaultHostname
    prodSwaResourceId: prodSwaResourceId
  }
}

output nameServers array = dnsZone.outputs.nameServers
