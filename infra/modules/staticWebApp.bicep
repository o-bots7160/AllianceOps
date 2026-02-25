@description('Name of the Static Web App (e.g. stapp-aops-dev)')
param name string

@description('Azure region')
param location string

@description('SWA SKU name')
@allowed(['Free', 'Standard'])
param skuName string = 'Standard'

@description('SWA SKU tier')
@allowed(['Free', 'Standard'])
param skuTier string = 'Standard'

@description('Resource ID of the linked Function App backend')
param functionAppResourceId string = ''

@description('Google OAuth client ID')
@secure()
param googleClientId string = ''

@description('Google OAuth client secret')
@secure()
param googleClientSecret string = ''

@description('GitHub OAuth client ID')
@secure()
param githubOAuthClientId string = ''

@description('GitHub OAuth client secret')
@secure()
param githubOAuthClientSecret string = ''

@description('Custom domains to register on the SWA. Array of objects: { name: string, validationMethod: string }')
param customDomains array = []

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {}
}

// Configure app settings for identity provider credentials
resource appSettings 'Microsoft.Web/staticSites/config@2023-12-01' = if (!empty(googleClientId)) {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    GOOGLE_CLIENT_ID: googleClientId
    GOOGLE_CLIENT_SECRET: googleClientSecret
    GITHUB_OAUTH_CLIENT_ID: githubOAuthClientId
    GITHUB_OAUTH_CLIENT_SECRET: githubOAuthClientSecret
  }
}

// Link Function App as backend for API proxying
resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = if (!empty(functionAppResourceId)) {
  parent: staticWebApp
  name: 'backend'
  properties: {
    backendResourceId: functionAppResourceId
    region: location
  }
}

output defaultHostname string = staticWebApp.properties.defaultHostname
output resourceId string = staticWebApp.id

// Register custom domains with auto-managed SSL certificates
// NOTE: Only CNAME-validated domains (subdomains) go here. Apex domains
// require dns-txt-token validation which blocks the ARM deployment until
// a TXT record exists, creating a chicken-and-egg deadlock. Apex domain
// registration is handled via CLI in the deploy workflow instead.
resource customDomain 'Microsoft.Web/staticSites/customDomains@2023-12-01' = [
  for domain in customDomains: {
    parent: staticWebApp
    name: domain.name
    properties: {
      validationMethod: domain.validationMethod
    }
  }
]
