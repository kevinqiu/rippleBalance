/*jslint indent: 4, nomen: true, sloppy: true */
/*global require */

var Remote = require('ripple-lib').Remote;
var Promise = require('promise');
var _ = require('lodash');

var requestAccountInfo = Promise.denodeify(Remote.requestAccountInfo);
var requestLines = Promise.denodeify(Remote.requestAccountLines());

//String -> Promise[AccountData]
function getAccountInfo(address) {
    var req = {
        command: "account_info",
        account: address,
        ledger_index: "validated"
    };

    return requestAccountInfo(req)
        .then(function(res) { return res.result.account_data; });
}

//String -> Promise[Array[AccountLines]]
function getTrustLines(address) {
    var req = {
        command: "account_info",
        account: address,
        ledger_index: "validated"
    };

    return requestLines(req)
        .then(function (res) { return res.result.lines; });
}

//AccountInfo -> Int
function getBalance(accountInfo) {
    return accountInfo.Balance;
}

//Array[AccountLines] -> Array[{ currency: int }]
function calculateBalances(trustLines) {

    //Array[Line] -> { currency: int }
    function sumLines (lines) {
        return _.reduce(lines, function(sum, line) {
            return sum + line.balance;
        });
    }

    var grouped = _.groupBy(trustLines, function (line) {
        return line.currency;
    });

    return _.mapValues(grouped, sumLines, 0);
}
