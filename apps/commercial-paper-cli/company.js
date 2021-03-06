'use strict';

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



const winston = require('winston');
const Table = require('cli-table-redemption');
const chalk = require('chalk');
const boxen = require('boxen');
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const AdminConnection = require('composer-admin').AdminConnection;

const ns = 'org.example.commercialpaper';
let businessNetworkDefinition;

winston.loggers.add('app', {
    console: {
        level: 'silly',
        colorize: true,
        label: 'ResourceLoading-App'
    }
});

const LOG = winston.loggers.get('app');

/**
 * Main Function
 * @param {String} userCardName userCardName
 */
async function showCompany(userCardName){
    try {

        // first find out who I am
        const adminConnection = new AdminConnection();
        await adminConnection.connect(userCardName);
        let metaData = await adminConnection.ping();
        let participantId = metaData.participant.substr(metaData.participant.indexOf('#')+1);
        await adminConnection.disconnect();


        // let table = new Table();
        const businessNetworkConnection = new BusinessNetworkConnection();
        LOG.info('> Connecting business network connection');
        LOG.info(`> ${userCardName}`);
        businessNetworkDefinition = await businessNetworkConnection.connect(userCardName);

        let companiesRegistry = await businessNetworkConnection.getRegistry(`${ns}.Company`);
        let accountRegistry = await businessNetworkConnection.getRegistry(`${ns}.Account`);
        let paperRegistry = await businessNetworkConnection.getRegistry(`${ns}.CommercialPaper`);

        let company = await companiesRegistry.get(participantId);

        console.log(boxen(chalk.blue.bold(company.symbol)+' '+chalk.blue(company.name),{padding:1,margin:1}));

        if (company.publicdid){
            console.log(chalk`{bold Public DID} ${company.publicdid.scheme}:${company.publicdid.method}:${company.publicdid.identifier}`);
        }
        let table = new Table();

        let issuedPaperAccount = await accountRegistry.get(company.issuedPaperAccount.getIdentifier());
        for (const paperref of issuedPaperAccount.assets){
            let paper = await paperRegistry.get(paperref.getIdentifier());
            let data = [paper.CUSIP,paper.ticker,paper.currency,paper.par,paper.maturity,paper.issueData];
            table.push(data);
        }

        console.log(chalk`\n[{bold ${issuedPaperAccount.ID}}] {green ${issuedPaperAccount.summary}}, {green ${issuedPaperAccount.workingCurrency}}, {white ${issuedPaperAccount.cashBalance}}`);
        console.log(table.length>0?table.toString():'<none>');

        console.log(chalk`\n{bold Trading Accounts:}`);

        for (const accountRef of company.paperTradingAccounts){
            let account = await accountRegistry.get(accountRef.getIdentifier());
            console.log(chalk`\n[{bold ${account.ID}}] {green ${account.summary}}, {green ${account.workingCurrency}}, {white ${account.cashBalance}}`);

            let listingsTable = new Table({head:['ID','Ticker','Currency','Par','Maturity','Issue Date']});
            for (const paperRef of account.assets){
                let paper = await paperRegistry.get(paperRef.getIdentifier());
                let data = [paper.CUSIP,paper.ticker,paper.currency,paper.par,paper.maturity,paper.issueDate];

                listingsTable.push(data);
            }

            console.log(listingsTable.toString());

        }

        await businessNetworkConnection.disconnect();
    } catch (error) {
        LOG.error(error);
        throw error;
    }

}


module.exports.submit = showCompany;
module.exports.questions = [];