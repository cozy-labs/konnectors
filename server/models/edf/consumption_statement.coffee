cozydb = require 'cozydb'

module.exports = EDFConsumptionStatement = cozydb.getModel 'ConsumptionStatement',
    contractNumber: String # Contract linked to this consumption
    billNumber: String # bill linked to this consumption.
    start: String # start date of the statement period.
    end: String # end date of the statement period.
    value: Number # Consumption value.
    statementType: String # Readed, estimated, ...
    statementCategory: String # Statemet subcategory
    statementReason: String # Statemet subcategory
    period: String # Simple designation of the temporal period of statement.
    cost: Number # Cost
    costsByCategory: Object # Details on costs
    valuesByCatergory: Object # Details on values
    similarHomes: Object # Similar home consumption comparisons.
    statements: [Object] # List of statement occured in this period.
    docTypeVersion: String
