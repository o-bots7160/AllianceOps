targetScope = 'resourceGroup'

@description('Azure subscription ID — used to construct cross-environment resource IDs')
param subscriptionId string

@description('Resource name prefix (e.g. aops)')
param namePrefix string = 'aops'

@description('Azure region used for resource references (default: centralus)')
param location string = 'centralus'

var deployPrefix = deployment().name

module dashboard 'modules/dashboard.bicep' = {
  name: '${deployPrefix}-dashboard'
  params: {
    dashboardName: 'dash-${namePrefix}'
    subscriptionId: subscriptionId
    namePrefix: namePrefix
    location: location
  }
}

output dashboardId string = dashboard.outputs.dashboardId
