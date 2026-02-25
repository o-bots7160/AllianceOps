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

DNS for `allianceops.io` is managed via an Azure DNS zone, deployed as a Bicep module (`infra/modules/dnsZone.bicep`) and orchestrated by `infra/dns.bicep`. The DNS zone is deployed into a **global resource group** (`rg-aops-global`) since it is a shared resource used by both environments.

Both deploy workflows (`deploy-dev.yml` and `deploy-prod.yml`) deploy DNS records independently:

- **Dev workflow**: Creates the DNS zone (idempotent) and the `dev` CNAME record
- **Prod workflow**: Creates the DNS zone (idempotent) and the `www` CNAME record + apex alias A record

This eliminates cross-environment coupling — each environment manages only its own DNS records. Bicep incremental deployment mode ensures one environment's records are not affected by the other's deployment.

DNS records:

| Record | Type | Deployed By | Target |
|--------|------|-------------|--------|
| `dev` | CNAME | dev workflow | dev SWA default hostname |
| `www` | CNAME | prod workflow | prod SWA default hostname |
| `@` (apex) | Alias A | prod workflow | prod SWA resource ID |

### SSL Certificates: Azure SWA Managed

Azure Static Web Apps Standard SKU automatically provisions and renews free managed SSL/TLS certificates for all registered custom domains. No external certificate authority (Let's Encrypt, etc.) or manual certificate management is required.

### Custom Domain Registration

Custom domains are registered on each SWA via `Microsoft.Web/staticSites/customDomains` Bicep resources in the `staticWebApp.bicep` module, configured through the `customDomains` parameter in each environment's parameter file.

- **Dev** (`dev.parameters.json`): `dev.allianceops.io` validated via `cname-delegation`
- **Prod** (`prod.parameters.json`): `www.allianceops.io` validated via `cname-delegation`, `allianceops.io` validated via `dns-txt-token`

### Apex Domain Behavior

Both `allianceops.io` and `www.allianceops.io` are registered as custom domains on the prod SWA. Both serve the same content directly — there is no HTTP redirect from apex to `www`. Azure SWA does not support host-based routing rules for redirects without Azure Front Door.

### Initial Setup

Custom domain registration on SWA requires DNS records to be in place and propagated. For a brand-new deployment:

1. **Deploy infrastructure** — creates SWA resources
2. **Deploy DNS zone** — creates the zone and DNS records (automated via both workflows)
3. **Update domain registrar** — point nameservers to Azure DNS (manual, one-time)
4. **Subsequent deployments** automatically register custom domains on the SWAs once DNS has propagated

### Function App

The Function App (`func-aops-{env}`) does not need a custom domain. It is accessed exclusively through the SWA linked backend proxy — all `/api/*` requests are routed through SWA to the Function App.

## Alternatives Considered

### Let's Encrypt for SSL

Rejected. Azure SWA Standard provides free managed certificates with automatic renewal. Adding Let's Encrypt would introduce unnecessary complexity (ACME challenges, renewal automation) with no benefit.

### External DNS Provider

Rejected. Azure DNS enables full infrastructure-as-code management of DNS records via Bicep. An external provider would require manual record management outside the IaC pipeline.

### Azure Front Door for Apex Redirect

Considered but deferred. Azure Front Door could provide a proper 301 redirect from `allianceops.io` to `www.allianceops.io`, but adds cost and complexity. Having both domains serve the same content is sufficient for the current use case.

### DNS Zone in Prod Resource Group

Originally, the DNS zone was deployed into `rg-aops-prod` and only from the prod workflow. This created cross-environment coupling — the dev CNAME was managed by the prod deployment, and changes to the dev SWA required a prod redeployment. Moving to `rg-aops-global` with per-environment deployments eliminates this coupling.

### DNS Zone in main.bicep

Considered merging `dns.bicep` into `main.bicep`. Rejected because `main.bicep` is scoped to per-environment resource groups (`rg-aops-dev`/`rg-aops-prod`), while the DNS zone is a shared resource in `rg-aops-global`. Keeping DNS as a separate deployment step in the workflows allows targeting the correct resource group without changing `main.bicep` to subscription scope.

## Consequences

### Positive

- **Zero certificate management** — SSL is fully automatic and free
- **Infrastructure-as-code** — DNS zone and records are managed via Bicep
- **Minimal cost** — Azure DNS costs ~$0.50/month + $0.40/million queries
- **Automatic renewal** — certificates renew without intervention
- **No cross-environment coupling** — each environment manages its own DNS records independently
- **Custom domains registered on SWAs** — SWAs accept traffic on custom hostnames

### Negative

- **One-time manual step** — domain registrar nameservers must be updated manually
- **No apex → www redirect** — both domains serve content independently (acceptable trade-off)
- **Separate deployment step** — DNS deployment cannot be consolidated into `main.bicep` due to resource group scoping
