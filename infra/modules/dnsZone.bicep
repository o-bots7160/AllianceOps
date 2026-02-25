@description('Domain name for the DNS zone (e.g. allianceops.io)')
param domainName string

@description('Default hostname of the dev SWA (e.g. random-name.azurestaticapps.net)')
param devSwaDefaultHostname string

@description('Default hostname of the prod SWA (e.g. random-name.azurestaticapps.net)')
param prodSwaDefaultHostname string

@description('Resource ID of the prod SWA (for apex alias record)')
param prodSwaResourceId string

resource dnsZone 'Microsoft.Network/dnsZones@2018-05-01' = {
  name: domainName
  location: 'global'
}

// CNAME: www.allianceops.io → prod SWA default hostname
resource wwwCname 'Microsoft.Network/dnsZones/CNAME@2018-05-01' = {
  parent: dnsZone
  name: 'www'
  properties: {
    TTL: 3600
    CNAMERecord: {
      cname: prodSwaDefaultHostname
    }
  }
}

// CNAME: dev.allianceops.io → dev SWA default hostname
resource devCname 'Microsoft.Network/dnsZones/CNAME@2018-05-01' = {
  parent: dnsZone
  name: 'dev'
  properties: {
    TTL: 3600
    CNAMERecord: {
      cname: devSwaDefaultHostname
    }
  }
}

// Alias A record: allianceops.io (apex) → prod SWA resource
resource apexAlias 'Microsoft.Network/dnsZones/A@2018-05-01' = {
  parent: dnsZone
  name: '@'
  properties: {
    TTL: 3600
    targetResource: {
      id: prodSwaResourceId
    }
  }
}

output nameServers array = dnsZone.properties.nameServers
output zoneId string = dnsZone.id
