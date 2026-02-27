@description('Domain name for the DNS zone (e.g. allianceops.io)')
param domainName string

@description('Environment name (dev, prod, or test)')
@allowed(['dev', 'prod', 'test'])
param environmentName string

@description('Default hostname of the current environment\'s SWA (e.g. random-name.azurestaticapps.net)')
param swaDefaultHostname string

@description('Resource ID of the prod SWA (required for prod apex alias record, ignored for dev)')
param swaResourceId string = ''

resource dnsZone 'Microsoft.Network/dnsZones@2018-05-01' = {
  name: domainName
  location: 'global'
}

// Dev environment: CNAME dev.allianceops.io → dev SWA default hostname
resource devCname 'Microsoft.Network/dnsZones/CNAME@2018-05-01' = if (environmentName == 'dev') {
  parent: dnsZone
  name: 'dev'
  properties: {
    TTL: 3600
    CNAMERecord: {
      cname: swaDefaultHostname
    }
  }
}

// Prod environment: CNAME www.allianceops.io → prod SWA default hostname
resource wwwCname 'Microsoft.Network/dnsZones/CNAME@2018-05-01' = if (environmentName == 'prod') {
  parent: dnsZone
  name: 'www'
  properties: {
    TTL: 3600
    CNAMERecord: {
      cname: swaDefaultHostname
    }
  }
}

// Prod environment: Alias A record allianceops.io (apex) → prod SWA resource
resource apexAlias 'Microsoft.Network/dnsZones/A@2018-05-01' = if (environmentName == 'prod') {
  parent: dnsZone
  name: '@'
  properties: {
    TTL: 3600
    targetResource: {
      id: swaResourceId
    }
  }
}

output nameServers array = dnsZone.properties.nameServers
output zoneId string = dnsZone.id
