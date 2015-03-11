/*jslint indent: 4, nomen: true, sloppy: true */
/*global require, process */

var fs = require('fs');
var Remote = require("ripple-lib").Remote;
var Promise = require("promise");
var _ = require("lodash");

var readFile = Promise.denodeify(fs.readFile);
var remote = new Remote({ servers: [ "wss://s1.ripple.com:443" ] });



//String -> Promise[AccountInfo]
function getAccountInfo(address) {
    var req = {
        account: address,
        ledger_index: "validated"
    };

    return new Promise(function(fulfill, reject) {
        remote.request("account_info",req, function (error, res) {
            if (error) reject(error);
            else fulfill(res);});
    });
}

//String -> Promise[Array[AccountLines]]
function getTrustLines(address) {
    var req = {
        account: address,
        ledger_index: "validated"
    };
    return new Promise(function(fulfill, reject) {
        remote.request("account_lines",req, function (error, res) {
            if (error) reject(error);
            else fulfill(res.lines);});
    });
}

//AccountInfo -> Int
function getXRPBalance(accountInfo) {
    return accountInfo.account_data.Balance;
}

//Array[AccountLines] -> { currency: int }
function calculateLineBalances(trustLines) {
    //Array[Line] -> { currency: int }
    function sumLines (lines) {
        return _.reduce(lines, function(sum, line) {
            return sum + parseFloat(line.balance);
        }, 0);
    }

    var grouped = _.groupBy(trustLines, function (line) {
        return line.currency;
    });
    return _.mapValues(grouped, sumLines);
}

//String -> Promise[{address: string, balances: {currency: int} }]
function calculateAllBalances(address) {
    return Promise.all([getTrustLines(address).then(calculateLineBalances),
                  getAccountInfo(address).then(getXRPBalance)])
        .then(function(resArray) {
            return { address: address , balances:_.extend(resArray[0], { XRP: resArray[1] }) };
        });
}

//{address: string, balances: {currency: int} } -> {address: string, balances: {currency: int} }
function printBalances(entry) {
        console.log("Address of account:", entry.address);
        console.log("Balances (Currency, Balance):");
        _.forIn(entry.balances, function (bal, currency) {
            console.log("(",currency,":",bal,")");
        });
    return entry;
}

//() -> Promise[Array[String]]
function readAddresses() {
    var inputFile = process.argv[2];
    return readFile(inputFile, {encoding: "utf-8"})
        .then(function(contents){return contents.split("\n");});
}

function calculateAddresses(addressArray){
    return Promise.all(addressArray.map(function(a) { return calculateAllBalances(a).then(printBalances); }));
}

function printError (err){console.log("Error: ",err);}

remote.connect(function(){
    readAddresses().then(calculateAddresses).done(function () { process.exit(); });
});
