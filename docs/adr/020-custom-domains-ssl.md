# ADR 020: Custom Domains and SSL with Azure DNS

## Status

Accepted

## Context

The domain `allianceops.io` has been purchased and needs to be configured for the AllianceOps application. The application runs on Azure Static Web Apps (Standard SKU) in two environments:

- **Dev**: `stapp-aops-dev` in `rg-aops-dev`
- **Prod**: `stapp-aops-prod` in `rg-aops-prod`

We need custom domain mapping, SSL/TLS certificates, and DNS management as infrastructure-as-code.

### Requirements

- `dev.allianceops.io` → dev environment
- `www.allianceops.io` → production environment
- `allianceops.io` (apex) → production environment
- SSL/TLS for all domains
- Fully automated via Bicep IaC

## Decision

### DNS Hosting: Azure DNS

DNS for `allianceops.io` is managed via an Azure DNS zone, deployed as a Bicep module (`infra/modules/dnsZone.bicep`) and orchestrated by a standalone template (`infra/dns.bicep`). The DNS zone is deployed into the **prod resource group** (`rg-aops-prod`) since it is most closely associated with the production domain.

DNS records:

| Record | Type | Target |
|--------|------|--------|
| `www` | CNAME | prod SWA default hostname |
| `dev` | CNAME | dev SWA default hostname |
| `@` (apex) | Alias A | prod SWA resource ID |

### SSL Certificates: Azure SWA Managed

Azure Static Web Apps Standard SKU automatically provisions and renews free managed SSL/TLS certificates for all registered custom domains. No external certificate authority (Let's Encrypt, etc.) or manual certificate management is required.

### Custom Domain Registration

Custom domains are registered on each SWA via `Microsoft.Web/staticSites/customDomains` Bicep resources, added conditionally to the existing `staticWebApp.bicep` module via a `customDomains` parameter.

- Subdomains (`www`, `dev`): validated via `cname-delegation`
- Apex domain (`allianceops.io`): validated via `dns-txt-token`

### Apex Domain Behavior

Both `allianceops.io` and `www.allianceops.io` are registered as custom domains on the prod SWA. Both serve the same content directly — there is no HTTP redirect from apex to `www`. Azure SWA does not support host-based routing rules for redirects without Azure Front Door.

### Phased Deployment

Custom domain setup is inherently a multi-step process:

1. **Deploy DNS zone** — creates the zone and DNS records (automated via prod workflow)
2. **Update domain registrar** — point nameservers to Azure DNS (manual, one-time)
3. **Enable custom domains** — populate `customDomains` parameter values and redeploy (automated)

The `customDomains` parameter defaults to an empty array, allowing the initial deployment to succeed without DNS configuration. Once DNS propagates, the parameter files are updated with domain values and the next deployment registers the custom domains.

### Function App

The Function App (`func-aops-{env}`) does not need a custom domain. It is accessed exclusively through the SWA linked backend proxy — all `/api/*` requests are routed through SWA to the Function App.

## Alternatives Considered

### Let's Encrypt for SSL

Rejected. Azure SWA Standard provides free managed certificates with automatic renewal. Adding Let's Encrypt would introduce unnecessary complexity (ACME challenges, renewal automation) with no benefit.

### External DNS Provider

Rejected. Azure DNS enables full infrastructure-as-code management of DNS records via Bicep. An external provider would require manual record management outside the IaC pipeline.

### Azure Front Door for Apex Redirect

Considered but deferred. Azure Front Door could provide a proper 301 redirect from `allianceops.io` to `www.allianceops.io`, but adds cost and complexity. Having both domains serve the same content is sufficient for the current use case.

### Separate Shared Resource Group for DNS

Considered placing the DNS zone in a dedicated `rg-aops-shared` resource group. Rejected in favor of placing it in the prod resource group for simplicity — the zone is logically tied to the production domain and doesn't warrant a separate resource group.

## Consequences

### Positive

- **Zero certificate management** — SSL is fully automatic and free
- **Infrastructure-as-code** — DNS zone and records are managed via Bicep
- **Minimal cost** — Azure DNS costs ~$0.50/month + $0.40/million queries
- **Automatic renewal** — certificates renew without intervention

### Negative

- **One-time manual step** — domain registrar nameservers must be updated manually
- **No apex → www redirect** — both domains serve content independently (acceptable trade-off)
- **Cross-environment coupling** — the DNS zone in the prod resource group references the dev SWA hostname; if the dev SWA is recreated, the DNS record must be updated
