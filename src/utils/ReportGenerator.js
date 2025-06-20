import { realm } from '../realm';
import uuid from 'react-native-uuid';

export class ReportGenerator {
  static generateTransactionSummary(userId, startDate, endDate, filters = {}) {
    try {
      let transactions = realm.objects('Transaction')
        .filtered('userId == $0', userId)
        .filtered('transactionDate >= $0 && transactionDate <= $1', startDate, endDate);

      if (filters.accountId) {
        transactions = transactions.filtered('accountId == $0', filters.accountId);
      }

      if (filters.contactId) {
        transactions = transactions.filtered('contactId == $0', filters.contactId);
      }

      const summary = {
        totalTransactions: transactions.length,
        totalAmount: 0,
        byType: {},
        byAccount: {},
        byContact: {},
      };

      transactions.forEach(tx => {
        const amount = Number(tx.amount) || 0;
        
        // By Type
        if (!summary.byType[tx.type]) {
          summary.byType[tx.type] = { count: 0, amount: 0 };
        }
        summary.byType[tx.type].count++;
        summary.byType[tx.type].amount += amount;

        // By Account
        if (!summary.byAccount[tx.accountId]) {
          summary.byAccount[tx.accountId] = { count: 0, amount: 0 };
        }
        summary.byAccount[tx.accountId].count++;
        summary.byAccount[tx.accountId].amount += amount;

        // By Contact
        if (tx.contactId && !summary.byContact[tx.contactId]) {
          summary.byContact[tx.contactId] = { count: 0, amount: 0 };
        }
        if (tx.contactId) {
          summary.byContact[tx.contactId].count++;
          summary.byContact[tx.contactId].amount += amount;
        }

        summary.totalAmount += amount;
      });

      const report = {
        id: uuid.v4(),
        userId,
        type: 'transaction',
        subType: 'summary',
        title: 'Transaction Summary Report',
        dateRange: 'custom',
        startDate,
        endDate,
        filters: JSON.stringify(filters),
        data: JSON.stringify(summary),
        generatedOn: new Date(),
        createdOn: new Date(),
        updatedOn: new Date(),
      };

      realm.write(() => {
        realm.create('Report', report);
      });

      return report;
    } catch (error) {
      console.error('Error generating transaction summary:', error);
      throw error;
    }
  }

  static generateContactBalances(userId) {
    try {
      const contacts = realm.objects('Contact')
        .filtered('userId == $0 && isActive == true', userId);
      console.log('Contacts:', realm.objects('Contact'));

      const balances = {};
      
      contacts.forEach(contact => {
        const transactions = realm.objects('Transaction')
          .filtered('contactId == $0', contact.id);

        let totalOwed = 0;
        let totalOwing = 0;

        transactions.forEach(tx => {
          const amount = Number(tx.amount) || 0;
          if (['cashOut', 'sendOut', 'lend', 'debit'].includes(tx.type)) {
            totalOwed += amount;
          } else {
            totalOwing += amount;
          }
        });

        balances[contact.id] = {
          name: contact.name,
          totalOwed,
          totalOwing,
          netBalance: totalOwed - totalOwing,
        };
      });

      const report = {
        id: uuid.v4(),
        userId,
        type: 'contact',
        subType: 'balances',
        title: 'Contact Balances Report',
        dateRange: 'all',
        startDate: new Date(0),
        endDate: new Date(),
        data: JSON.stringify(balances),
        generatedOn: new Date(),
        createdOn: new Date(),
        updatedOn: new Date(),
      };

      realm.write(() => {
        realm.create('Report', report);
      });

      return report;
    } catch (error) {
      console.error('Error generating contact balances:', error);
      throw error;
    }
  }

  static generateTransactionReport(filters) {
    let transactions = realm.objects('Transaction')
        .filtered(
            'transactionDate >= $0 && transactionDate <= $1',
            filters.startDate,
            filters.endDate
        );

    if (filters.accountId) {
        transactions = transactions.filtered('accountId == $0', filters.accountId);
    }

    if (filters.transactionTypeFilter && filters.transactionTypeFilter !== 'all') {
        const receivingTypes = ['cashIn', 'receive', 'credit', 'borrow'];
        const sendingTypes = ['cashOut', 'sendOut', 'debit', 'lend'];
        
        const types = filters.transactionTypeFilter === 'receiving' ? receivingTypes : sendingTypes;
        transactions = transactions.filtered('type IN $0', types);
    }

    return {
        type: 'transaction',
        data: Array.from(transactions),
        filters,
        generatedAt: new Date(),
    };
  }

  static generateContactReport(filters) {
    let transactions = realm.objects('Transaction')
        .filtered(
            'transactionDate >= $0 && transactionDate <= $1',
            filters.startDate,
            filters.endDate
        );

    if (filters.contactId) {
        transactions = transactions.filtered('contactId == $0', filters.contactId);
    }

    if (filters.accountId) {
        transactions = transactions.filtered('accountId == $0', filters.accountId);
    }

    if (filters.transactionTypeFilter && filters.transactionTypeFilter !== 'all') {
        const receivingTypes = ['cashIn', 'receive', 'credit', 'borrow'];
        const sendingTypes = ['cashOut', 'sendOut', 'debit', 'lend'];
        
        const types = filters.transactionTypeFilter === 'receiving' ? receivingTypes : sendingTypes;
        transactions = transactions.filtered('type IN $0', types);
    }

    const contact = filters.contactId ? 
        realm.objectForPrimaryKey('Contact', filters.contactId) : null;

    return {
        type: 'contact',
        contactInfo: contact,
        data: Array.from(transactions),
        filters,
    };
  }

  static generateAccountReport(filters) {
    const accounts = realm.objects('Account');
    const accountSummaries = accounts.map(account => {
        const transactions = realm.objects('Transaction')
            .filtered(
                'accountId == $0 && transactionDate >= $1 && transactionDate <= $2',
                account.id,
                filters.startDate,
                filters.endDate
            );

        return {
            account,
            transactions: Array.from(transactions),
            summary: this.calculateAccountSummary(transactions)
        };
    });

    return {
        type: 'account',
        data: accountSummaries,
        filters,
        generatedAt: new Date(),
    };
  }

  static calculateAccountSummary(transactions) {
    let totalCredits = 0;
    let totalDebits = 0;

    transactions.forEach(tx => {
      const amount = Number(tx.amount) || 0;
      if (['cashIn', 'receive', 'credit', 'refund'].includes(tx.type)) {
        totalCredits += amount;
      } else {
        totalDebits += amount;
      }
    });

    return {
      totalCredits,
      totalDebits,
      balance: totalCredits - totalDebits,
    };
  }

  static generateAccountSummaryByAccountReport(filters) {
    const { accountId, transactionTypeFilter, startDate, endDate } = filters;

    console.log('Debugging generateAccountSummaryByAccountReport:');
    console.log('accountId:', accountId);
    console.log('filters:', filters);
    
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    const account = realm.objectForPrimaryKey('Account', accountId);
    console.log('Account object:', account);

    if (!account) {
      throw new Error('Account not found.');
    }

    if (!account.name) {
      throw new Error('Account name is missing');
    }

    // Ensure accountId type matches Transaction.accountId type
    let realmAccountId = accountId;
    // If your Transaction.accountId is stored as string, this is fine.
    // If it's an ObjectId, you may need to convert:
    // realmAccountId = new Realm.BSON.ObjectId(accountId);

    let transactions = realm.objects('Transaction').filtered(
      'accountId == $0 AND transactionDate >= $1 AND transactionDate <= $2',
      realmAccountId, startDate, endDate
    );

    const receivingTypes = ['cashIn', 'receive', 'credit', 'borrow'];
    const sendingTypes = ['cashOut', 'sendOut', 'debit', 'lend'];

    // Filter transactions by type if needed
    if (transactionTypeFilter === 'receiving') {
      transactions = transactions.filtered('type IN $0', receivingTypes);
    } else if (transactionTypeFilter === 'sending') {
      transactions = transactions.filtered('type IN $0', sendingTypes);
    }

    // Defensive: filter again in JS in case Realm filter fails due to type mismatch
    let txArray = Array.from(transactions);
    if (transactionTypeFilter === 'receiving') {
      txArray = txArray.filter(tx => receivingTypes.includes(tx.type));
    } else if (transactionTypeFilter === 'sending') {
      txArray = txArray.filter(tx => sendingTypes.includes(tx.type));
    }

    let totalIn = 0;
    let totalOut = 0;

    txArray.forEach(tx => {
      const amount = Number(tx.amount) || 0;
      if (receivingTypes.includes(tx.type)) {
        totalIn += amount;
      } else if (sendingTypes.includes(tx.type)) {
        totalOut += amount;
      }
    });

    return {
      type: 'account_summary_by_account',
      title: `Summary for ${account.name}`,
      data: {
        accountName: account.name,
        totalIn,
        totalOut,
        netFlow: totalIn - totalOut,
        transactionCount: txArray.length,
        transactions: txArray
      },
      filters,
    };
  }

  static generateAllAccountsSummaryReport(filters) {
    const { startDate, endDate, transactionTypeFilter } = filters;
    const accounts = realm.objects('Account');
    const summaryData = [];

    const receivingTypes = ['cashIn', 'receive', 'credit', 'borrow'];
    const sendingTypes = ['cashOut', 'sendOut', 'debit', 'lend'];

    accounts.forEach(account => {
      let accountId = account.id || account._id;
      let transactions = realm.objects('Transaction').filtered(
        '(accountId == $0 OR accountId == $1) AND transactionDate >= $2 AND transactionDate <= $3',
        accountId,
        accountId && accountId.toString ? accountId.toString() : accountId,
        startDate,
        endDate
      );

      // Apply transactionTypeFilter if present
      if (transactionTypeFilter === 'receiving') {
        transactions = transactions.filtered('type IN $0', receivingTypes);
      } else if (transactionTypeFilter === 'sending') {
        transactions = transactions.filtered('type IN $0', sendingTypes);
      }

      let totalIn = 0;
      let totalOut = 0;

      transactions.forEach(tx => {
        if (receivingTypes.includes(tx.type)) {
          totalIn += Number(tx.amount) || 0;
        } else if (sendingTypes.includes(tx.type)) {
          totalOut += Number(tx.amount) || 0;
        }
      });

      summaryData.push({
        accountName: account.name,
        totalIn,
        totalOut,
        balance: totalIn - totalOut,
      });
    });

    return {
      type: 'all_accounts_summary',
      title: 'Summary of All Accounts',
      data: summaryData,
      filters,
    };
  }

  static generateReportHTML(reportData) {
    // Generate appropriate HTML based on report type
    switch (reportData.type) {
      case 'transaction':
        return this.generateTransactionHTML(reportData);
      case 'contact':
        return this.generateContactHTML(reportData);
      case 'account':
        return this.generateAccountHTML(reportData);
      case 'account_summary_by_account':
      case 'all_accounts_summary':
        return this.generateSummaryHTML(reportData);
      default:
        throw new Error('Invalid report type');
    }
  }

  static _generateHTMLWrapper(title, bodyContent) {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { margin-top: 20px; padding: 15px; background-color: #eef; border-left: 5px solid #1e90ff; }
            .header { text-align: center; margin-bottom: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          ${bodyContent}
        </body>
      </html>
    `;
  }

  static generateSummaryHTML(reportData) {
    const { title, data, filters, type } = reportData;
    let body;

    if (type === 'account_summary_by_account') {
        // Only show relevant totals based on transactionTypeFilter
        let totalsHtml = '';
        if (filters.transactionTypeFilter === 'receiving') {
            totalsHtml = `
                <p>Total Receiving: ${data.totalIn.toFixed(2)}</p>
                <p><strong>Net Flow: ${data.netFlow.toFixed(2)}</strong></p>
            `;
        } else if (filters.transactionTypeFilter === 'sending') {
            totalsHtml = `
                <p>Total Sending: ${data.totalOut.toFixed(2)}</p>
                <p><strong>Net Flow: ${data.netFlow.toFixed(2)}</strong></p>
            `;
        } else {
            totalsHtml = `
                <p>Total Receiving: ${data.totalIn.toFixed(2)}</p>
                <p>Total Sending: ${data.totalOut.toFixed(2)}</p>
                <p><strong>Net Flow: ${data.netFlow.toFixed(2)}</strong></p>
            `;
        }

        body = `
            <h2>${title}</h2>
            <p>From: ${new Date(filters.startDate).toLocaleDateString()} To: ${new Date(filters.endDate).toLocaleDateString()}</p>
            <div class="summary">
                ${totalsHtml}
                <p>Total Transactions: ${data.transactionCount}</p>
            </div>
        `;
    } else { // all_accounts_summary
        const rows = data.map(acc => `
            <tr>
                <td>${acc.accountName}</td>
                <td>${acc.totalIn.toFixed(2)}</td>
                <td>${acc.totalOut.toFixed(2)}</td>
                <td>${acc.balance.toFixed(2)}</td>
            </tr>
        `).join('');

        body = `
            <h2>${title}</h2>
            <p>From: ${new Date(filters.startDate).toLocaleDateString()} To: ${new Date(filters.endDate).toLocaleDateString()}</p>
            <table>
                <thead>
                    <tr>
                        <th>Account</th>
                        <th>Total In</th>
                        <th>Total Out</th>
                        <th>Balance</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    return this._generateHTMLWrapper(title, body);
  }

  static generateTransactionHTML(reportData) {
    const { data, filters } = reportData;
    let rows = data.map(tx => `
      <tr>
        <td>${new Date(tx.transactionDate).toLocaleDateString()}</td>
        <td>${tx.type}</td>
        <td>${tx.amount.toFixed(2)}</td>
        <td>${tx.description || ''}</td>
      </tr>
    `).join('');

    const body = `
      <h2>Transaction Report</h2>
      <p>From: ${new Date(filters.startDate).toLocaleDateString()} To: ${new Date(filters.endDate).toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    return this._generateHTMLWrapper('Transaction Report', body);
  }

  static generateContactHTML(reportData) {
    const { contactInfo, data, filters } = reportData;
    const reportTitle = contactInfo ? `Report for ${contactInfo.name}` : 'Contact-wise Report';

    if (!data || data.length === 0) {
        const message = contactInfo ?
            `<p>No transaction data found for ${contactInfo.name}</p>` :
            '<p>No transaction data found for the selected criteria.</p>';
        return this._generateHTMLWrapper(reportTitle, message);
    }

    let rows = data.map(tx => {
        // Find contact name for the transaction
        const contact = tx.contactId ? realm.objectForPrimaryKey('Contact', tx.contactId) : null;
        const contactName = contact ? contact.name : 'N/A';
        
        return `
        <tr>
            <td>${new Date(tx.transactionDate).toLocaleDateString()}</td>
            ${!contactInfo ? `<td>${contactName}</td>` : ''}
            <td>${tx.type}</td>
            <td>${tx.amount?.toFixed(2) || '0.00'}</td>
            <td>${tx.description || ''}</td>
        </tr>
    `}).join('');

    const body = `
        <h2>${reportTitle}</h2>
        <p>From: ${new Date(filters.startDate).toLocaleDateString()} To: ${new Date(filters.endDate).toLocaleDateString()}</p>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    ${!contactInfo ? '<th>Contact</th>' : ''}
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
    return this._generateHTMLWrapper(reportTitle, body);
}  

  static generateSummaryHTML(reportData) {
    const { title, data, filters, type } = reportData;
    let body;

    if (type === 'account_summary_by_account') {
        // Only show relevant totals based on transactionTypeFilter
        let totalsHtml = '';
        if (filters.transactionTypeFilter === 'receiving') {
            totalsHtml = `
                <p>Total Receiving: ${data.totalIn.toFixed(2)}</p>
                <p><strong>Net Flow: ${data.netFlow.toFixed(2)}</strong></p>
            `;
        } else if (filters.transactionTypeFilter === 'sending') {
            totalsHtml = `
                <p>Total Sending: ${data.totalOut.toFixed(2)}</p>
                <p><strong>Net Flow: ${data.netFlow.toFixed(2)}</strong></p>
            `;
        } else {
            totalsHtml = `
                <p>Total Receiving: ${data.totalIn.toFixed(2)}</p>
                <p>Total Sending: ${data.totalOut.toFixed(2)}</p>
                <p><strong>Net Flow: ${data.netFlow.toFixed(2)}</strong></p>
            `;
        }

        body = `
            <h2>${title}</h2>
            <p>From: ${new Date(filters.startDate).toLocaleDateString()} To: ${new Date(filters.endDate).toLocaleDateString()}</p>
            <div class="summary">
                ${totalsHtml}
                <p>Total Transactions: ${data.transactionCount}</p>
            </div>
        `;
    } else { // all_accounts_summary
        // Show only relevant columns based on transactionTypeFilter
        let tableHeaders = '<th>Account</th>';
        let tableRows = '';
        if (filters.transactionTypeFilter === 'receiving') {
            tableHeaders += '<th>Total In</th><th>Balance</th>';
            tableRows = data.map(acc => `
                <tr>
                    <td>${acc.accountName}</td>
                    <td>${acc.totalIn.toFixed(2)}</td>
                    <td>${acc.balance.toFixed(2)}</td>
                </tr>
            `).join('');
        } else if (filters.transactionTypeFilter === 'sending') {
            tableHeaders += '<th>Total Out</th><th>Balance</th>';
            tableRows = data.map(acc => `
                <tr>
                    <td>${acc.accountName}</td>
                    <td>${acc.totalOut.toFixed(2)}</td>
                    <td>${acc.balance.toFixed(2)}</td>
                </tr>
            `).join('');
        } else {
            tableHeaders += '<th>Total In</th><th>Total Out</th><th>Balance</th>';
            tableRows = data.map(acc => `
                <tr>
                    <td>${acc.accountName}</td>
                    <td>${acc.totalIn.toFixed(2)}</td>
                    <td>${acc.totalOut.toFixed(2)}</td>
                    <td>${acc.balance.toFixed(2)}</td>
                </tr>
            `).join('');
        }

        body = `
            <h2>${title}</h2>
            <p>From: ${new Date(filters.startDate).toLocaleDateString()} To: ${new Date(filters.endDate).toLocaleDateString()}</p>
            <table>
                <thead>
                    <tr>
                        ${tableHeaders}
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
    }

    return this._generateHTMLWrapper(title, body);
  }

  static generateAccountHTML(reportData) {
    const { data, filters } = reportData;
    const accountSections = data.map(accSummary => `
      <div>
        <h3>Account: ${accSummary.account.name} (${accSummary.account.type})</h3>
        <div class="summary">
          <p>Total Credits: ${accSummary.summary.totalCredits.toFixed(2)}</p>
          <p>Total Debits: ${accSummary.summary.totalDebits.toFixed(2)}</p>
          <p><strong>Balance: ${accSummary.summary.balance.toFixed(2)}</strong></p>
        </div>
        <h4>Transactions:</h4>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${accSummary.transactions.map(tx => `
              <tr>
                <td>${new Date(tx.transactionDate).toLocaleDateString()}</td>
                <td>${tx.type}</td>
                <td>${tx.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');

    const body = `
      <h2>Account Report</h2>
      <p>From: ${new Date(filters.startDate).toLocaleDateString()} To: ${new Date(filters.endDate).toLocaleDateString()}</p>
      ${accountSections}
    `;
    return this._generateHTMLWrapper('Account Statement', body);
  }
}
