/**
 * Converters between exported data and Bill model in Cozy Konnectors.
 *
 * Maps all the available weboob types in the exported JSON to function
 * exporting a matching Cozy Model.
 */

// NPM imports
import moment from 'moment';

// Local imports
import Bill from '../../../models/bill';


const BillConverters = {
    // Conversion functions for CapDocument items to Bill
    'subscriptions': function (data, moduleName) {  // Weboob type: Subscription
        // Do nothing for subscriptions
        return {
            cozyModel: undefined,
            parsedData: undefined,
        };
    },
    'bills': function (data, moduleName) {  // Weboob type: Bill
        var parsedBills = [];
        Object.keys(data).forEach(function (subscriptionID) {
            data[subscriptionID].forEach(function (bill) {
                // TODO: Label not mapped
                parsedBills.push({
                    type: '',  // TODO: What is it?
                    subtype: '',  // TODO: What is it?
                    date: moment(bill.date),
                    vendor: moduleName,
                    amount: parseFloat(bill.price),
                    vat: parseFloat(bill.vat),
                    currency: bill.currency,
                    plan: '',  // TODO: What is it?
                    pdfurl: bill.url,
                    content: '',  // TODO: What is it?
                    duedate: bill.duedate ? moment(bill.duedate) : null,
                    startdate: bill.startdate ? moment(bill.startdate) : null,
                    finishdate: bill.finishdate ? moment(bill.finishdate) : null,
                });
            });
        });
        return {
            cozyModel: Bill,
            parsedData: parsedBills,
        };
    },
    'history_bills': function (data, moduleName) {  // Weboob type: Details
        var parsedHistoryBills = [];
        Object.keys(data).forEach(function (subscriptionID) {
            data[subscriptionID].forEach(function (historyBill) {
                // TODO: Infos / label / quantity / unit not mapped
                parsedHistoryBills.push({
                    type: '',  // TODO: What is it?
                    subtype: '',  // TODO: What is it?
                    date: moment(historyBill.datetime),
                    vendor: moduleName,
                    amount: parseFloat(historyBill.price),
                    vat: parseFloat(historyBill.vat),
                    currency: historyBill.currency,
                    plan: '',  // TODO: What is it?
                    pdfurl: historyBill.url,
                    content: '',  // TODO: What is it?
                });
            });
        });
        return {
            cozyModel: Bill,
            parsedData: parsedHistoryBills
        };
    },
    'detailed_bills': function (data, moduleName) {  // Weboob type: Details
        var parsedDetailedBills = [];
        Object.keys(data).forEach(function (subscriptionID) {
            data[subscriptionID].forEach(function (detailedBill) {
                parsedDetailedBills.push({
                    // TODO: Infos / label / quantity / unit not mapped
                    type: '',  // TODO: What is it?
                    subtype: '',  // TODO: What is it?
                    date: moment(detailedBill.datetime),
                    vendor: moduleName,
                    amount: parseFloat(detailedBill.price),
                    vat: parseFloat(detailedBill.vat),
                    currency: detailedBill.currency,
                    plan: '',  // TODO: What is it?
                    pdfurl: detailedBill.url,
                    content: '',  // TODO: What is it?
                });
            });
        });
        return {
            cozyModel: Bill,
            parsedData: parsedDetailedBills
        };
    },
};
export default BillConverters;
