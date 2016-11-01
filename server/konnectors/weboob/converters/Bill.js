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
    'subscriptions': function (data, moduleName, downloaded_documents={}) {  // Weboob type: Subscription
        // Do nothing for subscriptions
        return {
            cozyModel: undefined,
            parsedData: undefined,
        };
    },
    'documents': function (data, moduleName, downloaded_documents={}) {  // Weboob type: Document
        // Do nothing for subscriptions
        return {
            cozyModel: undefined,
            parsedData: undefined,
        };
    },
    'bills': function (data, moduleName, downloaded_documents={}) {  // Weboob type: Bill
        var parsedBills = [];
        Object.keys(data).forEach(function (subscriptionID) {
            data[subscriptionID].forEach(function (bill) {
                // TODO: Label not mapped
                let pdfUrl = null;
                if (downloaded_documents[bill.id]) {
                    pdfUrl = downloaded_documents[bill.id];
                }
                parsedBills.push({
                    type: '',  // TODO: What is it?
                    subtype: '',  // TODO: What is it?
                    date: bill.date ? moment(bill.date) : null,
                    vendor: moduleName,
                    amount: bill.price ? parseFloat(bill.price) : null,
                    vat: bill.vat ? parseFloat(bill.vat) : null,
                    currency: bill.currency,
                    plan: '',  // TODO: What is it?
                    pdfurl: pdfUrl,  // Do not fill in pdfurl at this point, fill with downloaded
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
    'history_bills': function (data, moduleName, downloaded_documents={}) {  // Weboob type: Details
        var parsedHistoryBills = [];
        Object.keys(data).forEach(function (subscriptionID) {
            data[subscriptionID].forEach(function (historyBill) {
                // TODO: Infos / label / quantity / unit not mapped
                let pdfUrl = null;
                if (downloaded_documents[historyBill.id]) {
                    pdfUrl = downloaded_documents[historyBill.id];
                }
                parsedHistoryBills.push({
                    type: '',  // TODO: What is it?
                    subtype: '',  // TODO: What is it?
                    date: historyBill.datetime ? moment(historyBill.datetime) : null,
                    vendor: moduleName,
                    amount: historyBill.price ? parseFloat(historyBill.price) : null,
                    vat: historyBill.vat ? parseFloat(historyBill.vat) : null,
                    currency: historyBill.currency,
                    plan: '',  // TODO: What is it?
                    pdfurl: pdfUrl,  // Do not fill in pdfurl at this point, fill with downloaded
                    content: '',  // TODO: What is it?
                });
            });
        });
        return {
            cozyModel: Bill,
            parsedData: parsedHistoryBills
        };
    },
    'detailed_bills': function (data, moduleName, downloaded_documents={}) {  // Weboob type: Details
        var parsedDetailedBills = [];
        Object.keys(data).forEach(function (subscriptionID) {
            data[subscriptionID].forEach(function (detailedBill) {
                let pdfUrl = null;
                if (downloaded_documents[detailedBill.id]) {
                    pdfUrl = downloaded_documents[detailedBill.id];
                }
                parsedDetailedBills.push({
                    // TODO: Infos / label / quantity / unit not mapped
                    type: '',  // TODO: What is it?
                    subtype: '',  // TODO: What is it?
                    date: detailedBill.datetime ? moment(detailedBill.datetime) : null,
                    vendor: moduleName,
                    amount: detailedBill.price ? parseFloat(detailedBill.price) : null,
                    vat: detailedBill.vat ? parseFloat(detailedBill.vat) : null,
                    currency: detailedBill.currency,
                    plan: '',  // TODO: What is it?
                    pdfurl: pdfUrl,  // Do not fill in pdfurl at this point, fill with downloaded
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
