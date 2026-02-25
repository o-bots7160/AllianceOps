@description('Name of the budget (e.g. budget-aops-dev)')
param name string

@description('Monthly budget amount in USD')
param amount int = 20

@description('Contact email addresses for budget alerts')
param contactEmails array

@description('Budget start date (YYYY-MM-01 format)')
param startDate string

resource budget 'Microsoft.Consumption/budgets@2024-08-01' = {
  name: name
  properties: {
    timeGrain: 'Monthly'
    amount: amount
    category: 'Cost'
    timePeriod: {
      startDate: startDate
    }
    notifications: {
      actual80Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 80
        thresholdType: 'Actual'
        contactEmails: contactEmails
      }
      actual90Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 90
        thresholdType: 'Actual'
        contactEmails: contactEmails
      }
      actual100Percent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        thresholdType: 'Actual'
        contactEmails: contactEmails
      }
    }
  }
}

output budgetName string = budget.name
