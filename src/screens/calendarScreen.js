import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal, Alert, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { screens } from '../constant/screens';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { getAllObjects, realm } from '../realm';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { useNetInfo } from '@react-native-community/netinfo';
import { deleteTransactionInSupabase, cancelRecurringTransactionInSupabase } from '../supabase';

const colors = {
    primary: '#1e90ff',
    success: '#32cd32',
    error: '#ff4500',
    background: '#f5f5f5',
    white: '#ffffff',
    gray: '#666666',
    lightGray: '#e0e0e0',
    border: '#1e90ff',
};

const safeGet = (obj, path, defaultValue = null) => {
    if (!obj || typeof obj !== 'object') return defaultValue;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
        result = result?.[key];
        if (result === undefined) return defaultValue;
    }
    return result ?? defaultValue;
};

const CalendarScreen = ({ navigation, route }) => {
    console.log('CalendarScreen rendered',realm.objects('Transaction'));
    console.log('CalendarScreen accounts', realm.objects('Account'));
    console.log('CalendarScreen proxypayment', realm.objects('ProxyPayment'));
    const today = moment().format('YYYY-MM-DD');
    const [selectedDate, setSelectedDate] = useState(today);
    const [showAccountSheet, setShowAccountSheet] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState({});
    const [markedDates, setMarkedDates] = useState({
        [today]: { selected: true, selectedColor: colors.primary },
    });
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [accountMap, setAccountMap] = useState({});
    const [stats, setStats] = useState({
        debit: 0, credit: 0, balance: 0, cash_in: 0, cash_out: 0,
        receive: 0, send_out: 0, borrow: 0, lend: 0, creditType: 0, debitType: 0,
    });
    const [balanceForDate, setBalanceForDate] = useState(0);
    const [expandedProxyGroups, setExpandedProxyGroups] = useState({}); // Track expanded proxy groups
    const [expandedRecurringGroups, setExpandedRecurringGroups] = useState({});
    const { t, i18n } = useTranslation();
    const [isMenuVisible, setMenuVisible] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const netInfo = useNetInfo();

    const getTransactionIcon = (type) => {
        if (['cash_in', 'credit', 'receive', 'borrow'].includes(type)) return 'arrow-upward';
        return 'arrow-downward';
    };

    const getTransactionColor = (type) => {
        if (['cash_in', 'credit', 'receive', 'borrow'].includes(type)) return colors.success;
        return colors.error;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return moment(dateStr).format('hh:mm A');
    };

    const openMenu = (transaction, event, isProxy = false) => {
        const { pageX, pageY } = event.nativeEvent;
        const screenWidth = Dimensions.get('window').width;
        const menuWidth = 150;

        let x = pageX;
        // If the menu would overflow the right edge of the screen
        if (pageX + menuWidth > screenWidth) {
            x = screenWidth - menuWidth - 16; // Position it from the right edge with padding
        }

        setSelectedTx({ ...transaction, isProxy });
        setMenuPosition({ x, y: pageY });
        setMenuVisible(true);
    };

    const closeMenu = () => {
        setMenuVisible(false);
        setSelectedTx(null);
    };

    const handleEdit = () => {
        if (!selectedTx) return;
        const tx = selectedTx;
        closeMenu();
        navigation.navigate(screens.NewRecord, {
            transactionId: tx.id,
            accountId: selectedAccount.id,
            userId: selectedAccount.userId,
            onSave: loadAccountsAndMap,
            sourceScreen: 'calendar',
        });
    };

    const handleDuplicate = () => {
        if (!selectedTx) return;
        const tx = selectedTx;
        closeMenu();
        navigation.navigate(screens.NewRecord, {
            transactionId: tx.id,
            accountId: selectedAccount.id,
            userId: selectedAccount.userId,
            onSave: loadAccountsAndMap,
            sourceScreen: 'calendar',
            isDuplicating: true,
        });
    };

    function updateAccountBalance(account, tx, isRevert = false) {
        if (tx.isRecurring) return;
        let balanceChange = 0;
        const amount = parseFloat(tx.amount) || 0;
        const type = tx.type;
        if (tx.on_behalf_of_contact_id == null || tx.on_behalf_of_contact_id === '') {
            // Handle both generic types (credit/debit) and specific types
            if (['credit', 'cash_in', 'receive', 'borrow'].includes(type)) {
                balanceChange = amount;
            } else if (['debit', 'cash_out', 'send_out', 'lend'].includes(type)) {
                balanceChange = -amount;
            }
            if (isRevert) balanceChange = -balanceChange;
            
            account.currentBalance = (account.currentBalance || 0) + balanceChange;
            account.updatedOn = new Date();
        }
    }

    const handleCancel = async () => {
        if (!selectedTx || !selectedTx.isRecurring) return;
        const txToCancelId = selectedTx.id;
        closeMenu();

        Alert.alert(
            "Cancel Recurring Transaction",
            "Are you sure you want to cancel this recurring transaction? This will stop future transactions from being generated.",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        const user = realm.objectForPrimaryKey('User', selectedAccount.userId);
                        const isPaidUser = user?.userType === 'paid';

                        const performLocalUpdate = () => {
                            realm.write(() => {
                                const tx = realm.objectForPrimaryKey('Transaction', txToCancelId);
                                if (tx) {
                                    tx.status = 'cancelled';
                                    tx.updatedOn = new Date();
                                }
                            });
                            loadTransactions(selectedAccount.id);
                        };

                        if (isPaidUser && netInfo.isConnected) {
                            try {
                                await cancelRecurringTransactionInSupabase(txToCancelId);
                                performLocalUpdate();
                            } catch (error) {
                                console.error("Supabase cancel failed, creating SyncLog", error);
                                realm.write(() => {
                                    const tx = realm.objectForPrimaryKey('Transaction', txToCancelId);
                                    if (tx) {
                                        tx.status = 'cancelled';
                                        tx.needsUpload = true;
                                    }
                                });
                                performLocalUpdate();
                            }
                        } else {
                            realm.write(() => {
                                const tx = realm.objectForPrimaryKey('Transaction', txToCancelId);
                                if (tx) {
                                    tx.status = 'cancelled';
                                    tx.needsUpload = true;
                                }
                            });
                            performLocalUpdate();
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = () => {
        if (!selectedTx) return;
        const txToDeleteId = selectedTx.id;
        closeMenu();

        Alert.alert("Delete Transaction", "Are you sure you want to delete this transaction?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    const user = realm.objectForPrimaryKey('User', selectedAccount.userId);
                    const isPaidUser = user?.userType === 'paid';

                    const performLocalDeletion = (txId) => {
                        realm.write(() => {
                            const txToDelete = realm.objectForPrimaryKey('Transaction', txId);
                            if (!txToDelete) return;

                            if (txToDelete.is_proxy_payment) {
                                const proxyPayment = realm.objects('ProxyPayment').filtered('originalTransactionId == $0', txToDelete.id)[0];
                                if (proxyPayment) {
                                    const debtTx = realm.objectForPrimaryKey('Transaction', proxyPayment.debtAdjustmentTransactionId);
                                    if (debtTx) {
                                        const adjAccount = realm.objectForPrimaryKey('Account', debtTx.accountId);
                                        if (adjAccount) {
                                            updateAccountBalance(adjAccount, debtTx, true);
                                        }
                                        realm.delete(debtTx);
                                    }
                                    realm.delete(proxyPayment);
                                }
                            }

                            const account = realm.objectForPrimaryKey('Account', txToDelete.accountId);
                            if (account) {
                                updateAccountBalance(account, txToDelete, true);
                            }
                            realm.delete(txToDelete);
                        });
                        loadTransactions(selectedAccount.id);
                    };

                    const createSyncLogForDeletion = (tx) => {
                        realm.write(() => {
                            const pendingLogs = realm.objects('SyncLog').filtered('recordId == $0 AND (status == "pending" OR status == "failed")', tx.id);
                            const isNewAndUnsynced = pendingLogs.some(log => log.operation === 'create');

                            if (isNewAndUnsynced) {
                                if (pendingLogs.length > 0) realm.delete(pendingLogs);
                            } else {
                                const updateLogs = pendingLogs.filtered('operation == "update"');
                                if (updateLogs.length > 0) realm.delete(updateLogs);
                                realm.create('SyncLog', {
                                    id: new Date().toISOString() + '_log',
                                    userId: tx.userId,
                                    tableName: 'transactions',
                                    recordId: tx.id,
                                    operation: 'delete',
                                    status: 'pending',
                                    createdOn: new Date(),
                                });
                            }

                            if (tx.is_proxy_payment) {
                                const proxyPayment = realm.objects('ProxyPayment').filtered('originalTransactionId == $0', tx.id)[0];
                                if (proxyPayment?.debtAdjustmentTransactionId) {
                                    const debtTx = realm.objectForPrimaryKey('Transaction', proxyPayment.debtAdjustmentTransactionId);
                                    if (debtTx) {
                                        const debtTxLogs = realm.objects('SyncLog').filtered('recordId == $0', debtTx.id);
                                        if (debtTxLogs.filtered('operation == "create"').length > 0) {
                                            realm.delete(debtTxLogs);
                                        } else {
                                            realm.create('SyncLog', {
                                                id: new Date().toISOString() + '_debt_log',
                                                userId: debtTx.userId,
                                                tableName: 'transactions',
                                                recordId: debtTx.id,
                                                operation: 'delete',
                                                status: 'pending',
                                                createdOn: new Date(),
                                            });
                                        }
                                    }
                                }
                            }
                        });
                    };

                    if (isPaidUser && netInfo.isConnected) {
                        try {
                             const txToDelete = realm.objectForPrimaryKey('Transaction', txToDeleteId);
                            if (!txToDelete) return;
                             if (txToDelete.id.startsWith('temp_')) {
                                // unsynced, no need for sync log or supabase call
                            } else {
                                await deleteTransactionInSupabase(txToDeleteId);
                                if (txToDelete.is_proxy_payment) {
                                    const proxyPayment = realm.objects('ProxyPayment').filtered('originalTransactionId == $0', txToDelete.id)[0];
                                    if (proxyPayment?.debtAdjustmentTransactionId) {
                                        await deleteTransactionInSupabase(proxyPayment.debtAdjustmentTransactionId);
                                    }
                                }
                            }
                            performLocalDeletion(txToDeleteId);
                        } catch (error) {
                            console.error("Supabase delete failed, falling back to SyncLog", error);
                            const txToDelete = realm.objectForPrimaryKey('Transaction', txToDeleteId);
                            if(txToDelete) {
                                createSyncLogForDeletion(txToDelete);
                                performLocalDeletion(txToDeleteId);
                            }
                        }
                    } else {
                        const txToDelete = realm.objectForPrimaryKey('Transaction', txToDeleteId);
                        if (txToDelete) {
                            createSyncLogForDeletion(txToDelete);
                            performLocalDeletion(txToDeleteId);
                        }
                    }
                },
            },
        ]);
    };

    const loadAccountsAndMap = useCallback(() => {
        const realmAccounts = getAllObjects('Account') || [];
        const accountsList = realmAccounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            currency: acc.currency,
            type: acc.type,
            currentBalance: acc.currentBalance || 0,
            userId: acc.userId,
            cash_in: acc.cash_in || 0,
            cash_out: acc.cash_out || 0,
            receive: acc.receive || 0,
            send_out: acc.send_out || 0,
            borrow: acc.borrow || 0,
            lend: acc.lend || 0,
            debit: acc.debit || 0,
            credit: acc.credit || 0,
        }));

        const mapping = {};
        accountsList.forEach(acc => (mapping[acc.id] = acc));

        setAccounts(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(accountsList)) {
                return accountsList;
            }
            return prev;
        });
        setAccountMap(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(mapping)) {
                return mapping;
            }
            return prev;
        });

        if (!selectedAccount || !accountsList.some(a => a.id === selectedAccount.id)) {
            setSelectedAccount(accountsList[0] || null);
        }

        return { accountsList, mapping };
    }, [selectedAccount]);

    const loadTransactions = useCallback((accountId) => {
        if (!accountId) {
            setTransactions({});
            setStats({
                debit: 0, credit: 0, balance: 0, cash_in: 0, cash_out: 0,
                receive: 0, send_out: 0, borrow: 0, lend: 0, creditType: 0, debitType: 0,
            });
            return;
        }

        try {
            // Get all non-recurring transactions for calendar display
            const realmTransactions = getAllObjects('Transaction')
                ?.filtered('accountId == $0 AND isRecurring != true', accountId)
                ?.sorted('transactionDate', true) || [];

            const transactionsByDate = {};
            const newMarkedDates = { [selectedDate]: { selected: true, selectedColor: colors.primary } };

            realmTransactions.forEach(tx => {
                const date = tx.transactionDate ? moment(tx.transactionDate).format('YYYY-MM-DD') : today;
                if (!transactionsByDate[date]) transactionsByDate[date] = [];

                const contact = tx.contactId ? realm.objectForPrimaryKey('Contact', tx.contactId) : null;
                const contactName = contact?.name || '';

                const transaction = {
                    id: tx.id,
                    name: tx.purpose || 'No description',
                    type: tx.type,
                    amount: tx.amount || 0,
                    date,
                    color: ['cash_in', 'receive', 'borrow', 'credit'].includes(tx.type) ? colors.success : colors.error,
                    contactName,
                    contactId: tx.contactId || '',
                    isRecurring: tx.isRecurring,
                    parentTransactionId: tx.parentTransactionId,
                    status: tx.status,
                };

                transactionsByDate[date].push(transaction);

                if (!newMarkedDates[date]) {
                    newMarkedDates[date] = { marked: true, dotColor: transaction.color };
                }
            });

            setTransactions(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(transactionsByDate)) {
                    return transactionsByDate;
                }
                return prev;
            });
            setMarkedDates(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(newMarkedDates)) {
                    return newMarkedDates;
                }
                return prev;
            });

            const latestAcc = accountMap[accountId] || selectedAccount;
            
            // Calculate stats which includes all-time totals from transactions
            setStats(calculateStats(transactionsByDate[selectedDate] || [], latestAcc));
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }, [selectedDate, accountMap, selectedAccount, calculateStats]);

    const handleDayPress = useCallback((day) => {
        const newDate = day.dateString;
        setSelectedDate(newDate);

        setMarkedDates(prev => {
            const updated = {
                ...Object.keys(prev).reduce((acc, date) => {
                    acc[date] = { ...prev[date], selected: false, selectedColor: undefined, customStyles: undefined };
                    return acc;
                }, {}),
                [newDate]: {
                    ...prev[newDate],
                    selected: true,
                    selectedColor: 'transparent',
                    customStyles: {
                        container: {
                            borderWidth: 2,
                            borderColor: colors.primary,
                            backgroundColor: 'transparent',
                            borderRadius: 8,
                        },
                        text: {
                            color: colors.primary,
                            fontWeight: 'bold',
                        },
                    },
                },
            };
            return JSON.stringify(prev) !== JSON.stringify(updated) ? updated : prev;
        });
    }, []);

    const handleSwitchAccount = useCallback((accountId) => {
        const account = accounts.find(a => a.id === accountId);
        if (account) {
            setSelectedAccount(account);
        }
    }, [accounts]);

    useFocusEffect(
        useCallback(() => {
            const { accountsList } = loadAccountsAndMap();
            if (selectedAccount?.id || accountsList[0]?.id) {
                loadTransactions(selectedAccount?.id || accountsList[0]?.id);
            }
        }, [loadAccountsAndMap, loadTransactions, selectedAccount?.id])
    );

    useFocusEffect(
        useCallback(() => {
            if (selectedAccount?.id) {
                // Refresh the selected account data
                const refreshedAccount = realm.objectForPrimaryKey('Account', selectedAccount.id);
                if (refreshedAccount) {
                    const plainAccount = JSON.parse(JSON.stringify(refreshedAccount));
                    setSelectedAccount(plainAccount);
                    calculateBalanceForDate(plainAccount, selectedDate);
                }
            }
        }, [selectedAccount?.id, realm, selectedDate])
    );

    useEffect(() => {
        if (selectedAccount?.id) {
            loadTransactions(selectedAccount.id);
            calculateBalanceForDate(selectedAccount, selectedDate);
        }
    }, [selectedAccount?.id, selectedDate, loadTransactions]);

    const calculateBalanceForDate = (account, date) => {
        if (!account) {
            setBalanceForDate(0);
            return;
        }

        try {
            // Use the account's current balance as starting point
            let balance = 0;
            
            // Calculate balance by summing all non-recurring transactions
            const allTransactions = realm.objects('Transaction')
                .filtered('accountId == $0 AND isRecurring != true', account.id);
                
            allTransactions.forEach(tx => {
                if (!tx.is_proxy_payment && (tx.on_behalf_of_contact_id == null || tx.on_behalf_of_contact_id === '')) {
                    if (['cash_in', 'credit', 'receive', 'borrow'].includes(tx.type)) {
                        balance += parseFloat(tx.amount) || 0;
                    } else {
                        balance -= parseFloat(tx.amount) || 0;
                    }
                }
            });
            
            // Add initial balance if any
            balance += account.initial_amount || 0;
            
            setBalanceForDate(balance);
        } catch (error) {
            console.error('Error calculating balance for date:', error);
            setBalanceForDate(account.currentBalance || 0);
        }
    };

    const activeAccount = selectedAccount || accounts[0] || { id: null, name: 'Select Account' };
    const getDayOfWeek = (dateStr) => moment(dateStr).format('dddd');

    const safeGetTransactions = (date) => {
        try {
            return Array.isArray(transactions[date]) ? transactions[date] : [];
        } catch (error) {
            console.error('Error getting transactions:', error);
            return [];
        }
    };

    const renderTransactionType = (transaction, account) => {
        if (account?.type === 'Cash In - Cash Out') {
            return transaction.type === 'cash_in' ? 'Cash In' : 'Cash Out';
        } else if (account?.type === 'Receive - Send Out') {
            return transaction.type === 'receive' ? 'Receive' : 'Send Out';
        } else if (account?.type === 'Borrow - Lend') {
            return transaction.type === 'borrow' ? 'Borrow' : 'Lend';
        }
        switch (transaction.type) {
            case 'cash_in': return 'Cash In';
            case 'cash_out': return 'Cash Out';
            case 'receive': return 'Receive';
            case 'send_out': return 'Send Out';
            case 'borrow': return 'Borrow';
            case 'lend': return 'Lend';
            case 'credit': return 'Credit';
            case 'debit': return 'Debit';
            default: return transaction.type;
        }
    };

    const calculateStats = (transArr = [], account) => {
        const debtAdjustmentTxIds = new Set(
            (realm.objects('ProxyPayment') || []).map(p => p.debtAdjustmentTransactionId)
        );

        // Initialize stats for the day and account totals
        const stats = {
            credit: 0, debit: 0, cash_in: 0, cash_out: 0, receive: 0,
            send_out: 0, borrow: 0, lend: 0, creditType: 0, debitType: 0,
        };
        
        // Skip if no account is selected
        if (!account || !account.id) {
            return { ...stats, balance: 0 };
        }
        
        // Only process transactions for the selected date (transArr)
        // Filter out debt adjustment transactions
        const filteredTransactions = transArr.filter(tx => !debtAdjustmentTxIds.has(tx.id));
        
        // Process each transaction
        filteredTransactions.forEach(tx => {
            const amount = parseFloat(tx.amount) || 0;
            const accountType = account.type || 'debit_credit';
            
            // First, handle the basic credit/debit categorization
            if (['credit', 'cash_in', 'receive', 'borrow'].includes(tx.type)) {
                stats.credit += amount;
            } else if (['debit', 'cash_out', 'send_out', 'lend'].includes(tx.type)) {
                stats.debit += amount;
            }
            
            // Then, map transaction to specific type based on account type
            if (accountType === 'cash_in_out') {
                if (tx.type === 'credit' || tx.type === 'cash_in') {
                    stats.cash_in += amount;
                } else if (tx.type === 'debit' || tx.type === 'cash_out') {
                    stats.cash_out += amount;
                }
            } else if (accountType === 'receive_send') {
                if (tx.type === 'credit' || tx.type === 'receive') {
                    stats.receive += amount;
                } else if (tx.type === 'debit' || tx.type === 'send_out') {
                    stats.send_out += amount;
                }
            } else if (accountType === 'borrow_lend') {
                if (tx.type === 'credit' || tx.type === 'borrow') {
                    stats.borrow += amount;
                } else if (tx.type === 'debit' || tx.type === 'lend') {
                    stats.lend += amount;
                }
            } else if (accountType === 'debit_credit') {
                if (tx.type === 'credit') {
                    stats.creditType += amount;
                } else if (tx.type === 'debit') {
                    stats.debitType += amount;
                }
            }
            
            // Also add specific type amounts if they exist
            if (tx.type === 'cash_in') stats.cash_in += amount;
            else if (tx.type === 'cash_out') stats.cash_out += amount;
            else if (tx.type === 'receive') stats.receive += amount;
            else if (tx.type === 'send_out') stats.send_out += amount;
            else if (tx.type === 'borrow') stats.borrow += amount;
            else if (tx.type === 'lend') stats.lend += amount;
        });
            
        return { ...stats, balance: account?.currentBalance || 0 };
    };

    const getStatLabel = (side, account) => {
        if (account?.type) {
            const typeName = t(`accountTypes.${account.type}`);
            if (typeName && typeName.includes(' - ')) {
                const parts = typeName.split(' - ');
                if (account.type === 'debit_credit') {
                    return side === 'left' ? parts[1] : parts[0]; 
                }
                return side === 'left' ? parts[0] : parts[1];
            }
        }
        return side === 'left' ? t('terms.credit') : t('terms.debit');
    };

    const getStatValue = (side, account, stats) => {
        if (!account || !stats) return 0;
        const type = account.type;
        if (side === 'left') { // Corresponds to Credit/Receiving Money
            if (type === 'cash_in_out') return stats.cash_in;
            if (type === 'receive_send') return stats.receive;
            if (type === 'borrow_lend') return stats.borrow;
            if (type === 'debit_credit') return stats.creditType;
            return stats.credit;
        } else { // Corresponds to Debit/Sending Money
            if (type === 'cash_in_out') return stats.cash_out;
            if (type === 'receive_send') return stats.send_out;
            if (type === 'borrow_lend') return stats.lend;
            if (type === 'debit_credit') return stats.debitType;
            return stats.debit;
        }
    };

    const currency = safeGet(selectedAccount, 'currency', 'PKR');

    // Helper to get proxy payment mapping for quick lookup
    const getProxyPaymentMap = () => {
        const proxyPayments = realm.objects('ProxyPayment') || [];
        const map = {};
        proxyPayments.forEach(pp => {
            map[pp.originalTransactionId] = pp;
            map[pp.debtAdjustmentTransactionId] = pp;
        });
        return map;
    };

    // Group transactions for rendering: proxy payments as group, others as normal
    const groupTransactions = (transactionsArr) => {
        if (!selectedAccount) return [];
        const proxyMap = getProxyPaymentMap();
        const grouped = [];
        const usedIds = new Set();
        const localTransactions = [...transactionsArr]; // Transactions on selected day

        const allAccountTransactions = realm.objects('Transaction').filtered('accountId == $0', selectedAccount.id);

        // Process all other transactions for the day
        localTransactions.forEach(tx => {
            if (usedIds.has(tx.id)) return;

            const proxy = proxyMap[tx.id];

            // Check if it's a main proxy transaction
            if (proxy && tx.id === proxy.originalTransactionId) {
                const adjTx = allAccountTransactions.find(t => t.id === proxy.debtAdjustmentTransactionId);
                grouped.push({
                    type: 'proxyGroup',
                    main: tx,
                    adjustment: adjTx ? JSON.parse(JSON.stringify(adjTx)) : null,
                    proxy,
                });
                usedIds.add(tx.id);
            } 
            // Check if it's an adjustment whose main proxy isn't today
            else if (proxy && tx.id === proxy.debtAdjustmentTransactionId) {
                // In this case, the main tx isn't in localTransactions. We'll treat the adjustment as a single transaction.
                grouped.push({ type: 'single', tx });
                usedIds.add(tx.id);
            }
            // It's a regular single transaction
            else if (!proxy) {
                grouped.push({ type: 'single', tx });
                usedIds.add(tx.id);
            }
        });

        return grouped.sort((a, b) => {
            const dateA = a.tx?.date || a.main?.date;
            const dateB = b.tx?.date || b.main?.date;
            return new Date(dateB) - new Date(dateA);
        });
    };

    const renderTransactionItem = useCallback(({ item, isProxy = false }) => {
        if (!item) return null;

        const type = item?.type || 'debit';
        const transactionColor = getTransactionColor(type);
        const amount = parseFloat(item?.amount) || 0;
        const iconName = getTransactionIcon(type);
        const isRecurringOrChild = item.isRecurring || !!item.parentTransactionId;

        const typeTextMap = { cash_in: t('terms.cash_in'), cash_out: t('terms.cash_out'), debit: t('terms.debit'), credit: t('terms.credit'), receive: t('terms.receive'), send_out: t('terms.send_out'), borrow: t('terms.borrow'), lend: t('terms.lend') };
        const typeText = typeTextMap[type] || type;

        return (
            <View style={styles.transactionRow} key={item.id}>
                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1, padding: 16 }}
                >
                    <View style={[styles.colorIndicator, { backgroundColor: transactionColor }]} />
                    <View style={styles.transactionDetails}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Icon name={iconName} size={RFValue(18)} color={transactionColor} style={{ marginRight: 8 }}/>
                            <Text style={styles.transactionName} numberOfLines={1}>{item?.name || t('accountDetailsScreen.noDescription')}</Text>
                            {isRecurringOrChild && <Icon name="autorenew" size={RFValue(16)} color={colors.primary} style={{ marginLeft: 8 }} />}
                        </View>
                        <Text style={styles.transactionDate}>{item?.date ? formatDate(item.date) : ''}</Text>
                    </View>
                    
                    {/* Amount and type as column */}
                    <View style={styles.amountColumnContainer}>
                        <Text style={[styles.transactionAmountText, { color: transactionColor }]}>
                            {['cash_in', 'credit', 'receive', 'borrow'].includes(type) ? '+' : '-'}
                            {currency} {amount.toFixed(2)}
                        </Text>
                        <Text style={styles.transactionType}>{typeText}</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuTrigger} onPress={(e) => openMenu(item, e, isProxy)}>
                    <Icon name="more-vert" size={RFValue(20)} color={colors.gray} />
                </TouchableOpacity>
            </View>
        );
    }, [currency, t]);

    const renderMenu = () => (
        <Modal
            visible={isMenuVisible}
            transparent
            animationType="fade"
            onRequestClose={closeMenu}
        >
            <TouchableWithoutFeedback onPress={closeMenu}>
                <View style={StyleSheet.absoluteFill}>
                    <View style={[styles.menuContainer, { top: menuPosition.y, left: menuPosition.x }]}>
                        {/* Case 1: Parent Recurring Transaction */}
                        {selectedTx?.isRecurring ? (
                            <>
                                {selectedTx.status !== 'cancelled' && (
                                    <>
                                        <TouchableOpacity style={styles.menuOption} onPress={handleEdit}>
                                            <Text style={styles.menuText}>{t('common.edit')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.menuOption} onPress={handleCancel}>
                                            <Text style={[styles.menuText, { color: colors.error }]}>{t('common.cancel')}</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </>
                        ) : selectedTx?.parentTransactionId ? ( /* Case 2: Child Recurring Transaction */
                            <>
                                <TouchableOpacity style={styles.menuOption} onPress={handleEdit}>
                                    <Text style={styles.menuText}>{t('common.edit')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuOption} onPress={handleDelete}>
                                    <Text style={[styles.menuText, { color: colors.error }]}>{t('common.delete')}</Text>
                                </TouchableOpacity>
                            </>
                        ) : ( /* Case 3: Simple or Proxy Transaction */
                            <>
                                {selectedTx && !selectedTx.isProxy &&
                                    <TouchableOpacity style={styles.menuOption} onPress={handleEdit}>
                                        <Text style={styles.menuText}>{t('common.edit')}</Text>
                                    </TouchableOpacity>
                                }
                                <TouchableOpacity style={styles.menuOption} onPress={handleDuplicate}>
                                    <Text style={styles.menuText}>{t('common.duplicate')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuOption} onPress={handleDelete}>
                                    <Text style={[styles.menuText, { color: colors.error }]}>{t('common.delete')}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            {renderMenu()}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.accountSelectorContainer}>
                    <TouchableOpacity
                        style={styles.accountSelector}
                        onPress={() => setShowAccountSheet(true)}
                    >
                        <Text style={styles.accountTitle}>
                            {safeGet(activeAccount, 'name', 'Select Account')}
                        </Text>
                        <Icon name="arrow-drop-down" size={RFValue(26)} color={colors.primary} style={styles.dropdownIcon} />
                    </TouchableOpacity>
                </View>

                <Calendar
                    onDayPress={handleDayPress}
                    markedDates={markedDates}
                    markingType={'custom'}
                    style={styles.calendar}
                    theme={{
                        selectedDayBackgroundColor: colors.primary,
                        selectedDayTextColor: colors.white,
                        todayTextColor: colors.primary,
                        dayTextColor: colors.gray,
                        textDisabledColor: colors.lightGray,
                        monthTextColor: colors.gray,
                        textDayFontFamily: 'Sora-Regular',
                        textMonthFontFamily: 'Sora-Bold',
                        textDayHeaderFontFamily: 'Sora-Regular',
                        textDayFontSize: RFPercentage(1.7),
                        textMonthFontSize: RFPercentage(2.2),
                        textDayHeaderFontSize: RFPercentage(1.7),
                        weekVerticalMargin: 0,
                    }}
                    dayComponent={({ date, state }) => {
                        const isSelected = date.dateString === selectedDate;
                        const hasTransactions = safeGetTransactions(date?.dateString)?.length > 0;
                        const styleOverride = isSelected
                            ? {
                                borderWidth: 2,
                                borderColor: colors.primary,
                                backgroundColor: 'transparent',
                                borderRadius: 8,
                            }
                            : {};

                        return (
                            <TouchableOpacity
                                onPress={() => handleDayPress({ dateString: date.dateString })}
                                style={[
                                    styles.dayContainer,
                                    isSelected && styleOverride,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.dayText,
                                        isSelected && { color: colors.primary, fontWeight: 'bold' },
                                        state === 'disabled' && styles.disabledDayText,
                                    ]}
                                >
                                    {date.day}
                                </Text>
                                {hasTransactions && (
                                    <View style={styles.dotContainer}>
                                        {(() => {
                                            const transactions = safeGetTransactions(date.dateString);
                                            const hasReceive = transactions.some(t =>
                                                ['cash_in', 'receive', 'borrow', 'credit'].includes(t.type)
                                            );
                                            const hasSend = transactions.some(t =>
                                                ['cash_out', 'send_out', 'lend', 'debit'].includes(t.type)
                                            );

                                            return (
                                                <>
                                                    {hasReceive && (
                                                        <View style={[styles.transactionDot, { backgroundColor: colors.success }]} />
                                                    )}
                                                    {hasSend && (
                                                        <View style={[styles.transactionDot, { backgroundColor: colors.error }]} />
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />

                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: colors.success }]}>
                        <View style={styles.typeContainer}>
                            <Text style={[styles.typeLabel, { color: colors.white }]}>
                                {getStatLabel('left', selectedAccount)}
                            </Text>
                        </View>
                        <Text style={[styles.statValue, { color: colors.white }]}>
                            {currency} {getStatValue('left', selectedAccount, stats).toFixed(2)}
                        </Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.error }]}>
                        <View style={styles.typeContainer}>
                            <Text style={[styles.typeLabel, { color: colors.white }]}>
                                {getStatLabel('right', selectedAccount)}
                            </Text>
                        </View>
                        <Text style={[styles.statValue, { color: colors.white }]}>
                            {currency} {getStatValue('right', selectedAccount, stats).toFixed(2)}
                        </Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.statLabel, { color: colors.white }]}>{t('accountDetailsScreen.balance')}</Text>
                        <Text style={[styles.statValue, { color: colors.white }]}>
                            {currency}{balanceForDate < 0 && ' -'}{Math.abs(balanceForDate).toFixed(2)}
                        </Text>
                    </View>
                </View>

                <View style={styles.transactions}>
                    <View style={styles.transactionHeader}>
                        <Text style={styles.transactionDate}>
                            {moment(selectedDate).format('MMMM D, YYYY')} • {getDayOfWeek(selectedDate)}
                        </Text>
                        {selectedAccount && (
                            <Text style={styles.transactionTotal}>
                                {currency}{balanceForDate < 0 && ' -'}{Math.abs(balanceForDate).toFixed(2)}
                            </Text>
                        )}
                    </View>

                    {safeGetTransactions(selectedDate)?.length === 0 ? (
                        <View style={styles.noTransactions}>
                            <Icon name="receipt" size={RFValue(40)} color={colors.lightGray} />
                            <Text style={styles.noTransactionsText}>{t('calendarScreen.noTransactions')}</Text>
                        </View>
                    ) : (
                        groupTransactions(safeGetTransactions(selectedDate)).map((item, idx) => {
                            if (item.type === 'proxyGroup') {
                                const groupKey = item.main.id;
                                const expanded = !!expandedProxyGroups[groupKey];
                                return (
                                    <View key={groupKey} style={styles.proxyCard}>
                                        <TouchableOpacity
                                            style={[styles.transactionRow, {padding: wp(3.5)}]}
                                            onPress={() => setExpandedProxyGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                                            activeOpacity={0.8}
                                        >
                                            <View style={[styles.transactionIcon, { backgroundColor: colors.primary + '20' }]}>
                                                <Icon name="swap-horiz" size={RFValue(16)} color={colors.primary} />
                                            </View>
                                            <View style={styles.transactionDetails}>
                                                <Text style={styles.transactionName}>Proxy Payment</Text>
                                                <Text style={styles.transactionType}>{safeGet(item.main, 'name', 'Tap to see details')}</Text>
                                            </View>
                                            <View style={{alignItems: 'center', flexDirection: 'row'}}>
                                                <View style={styles.amountColumnContainer}>
                                                    <Text style={[styles.transactionAmountText, { color: item.main.color }]}>
                                                        {['cash_in', 'receive', 'borrow', 'credit'].includes(item.main.type) ? '+' : '-'}
                                                        {currency} {Number(item.main.amount).toFixed(2)}
                                                    </Text>
                                                    <Text style={styles.transactionType}>
                                                        {item.main.type === 'credit' ? 'Credit' : 
                                                         item.main.type === 'debit' ? 'Debit' : item.main.type}
                                                    </Text>
                                                </View>
                                                <Icon name={expanded ? "expand-less" : "expand-more"} size={RFValue(24)} color={colors.primary} style={{marginLeft: wp(2)}} />
                                            </View>
                                        </TouchableOpacity>
                                        
                                        {expanded && (
                                            <View style={styles.proxyBody}>
                                                <View style={styles.transactionRow}>
                                                    <TouchableOpacity
                                                        style={{ flexDirection: 'row', alignItems: 'center', flex: 1, padding: 12 }}
                                                    >
                                                        <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(item.main.type) + '20' }]}>
                                                            <Icon name={getTransactionIcon(item.main.type)} size={RFValue(20)} color={getTransactionColor(item.main.type)} />
                                                        </View>
                                                        <View style={styles.transactionDetails}>
                                                            <Text style={styles.transactionName}>{item.main.name || 'Original Payment'}</Text>
                                                            <Text style={styles.transactionDate}>{item.main.contactName || 'N/A'}</Text>
                                                        </View>
                                                        <View style={styles.amountColumnContainer}>
                                                            <Text style={[styles.transactionAmountText, { color: getTransactionColor(item.main.type) }]}>
                                                                {['cash_in', 'credit', 'receive', 'borrow'].includes(item.main.type) ? '+' : '-'}
                                                                {currency} {Number(item.main.amount).toFixed(2)}
                                                            </Text>
                                                            <Text style={styles.transactionType}>
                                                                {item.main.type === 'credit' ? 'Credit' : 
                                                                item.main.type === 'debit' ? 'Debit' : item.main.type}
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={styles.menuTrigger} onPress={(e) => openMenu(item.main, e, true)}>
                                                        <Icon name="more-vert" size={RFValue(20)} color={colors.gray} />
                                                    </TouchableOpacity>
                                                </View>
                                                
                                                <View style={[styles.transactionItem, { elevation: 0, shadowOpacity: 0, backgroundColor: '#f9f9f9', padding: 12 }]}>
                                                     <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(item.adjustment.type) + '20' }]}>
                                                        <Icon name={getTransactionIcon(item.adjustment.type)} size={RFValue(20)} color={getTransactionColor(item.adjustment.type)} />
                                                    </View>
                                                    <View style={styles.transactionDetails}>
                                                        <Text style={styles.transactionName}>{item.adjustment.name || 'Debt Adjustment'}</Text>
                                                        <Text style={styles.transactionDate}>{item.adjustment.contactName || 'N/A'}</Text>
                                                    </View>
                                                    <View style={styles.amountColumnContainer}>
                                                        <Text style={[styles.transactionAmountText, { color: getTransactionColor(item.adjustment.type) }]}>
                                                            {['cash_in', 'credit', 'receive', 'borrow'].includes(item.adjustment.type) ? '+' : '-'}
                                                            {currency} {Number(item.adjustment.amount).toFixed(2)}
                                                        </Text>
                                                        <Text style={styles.transactionType}>
                                                            {item.adjustment.type === 'credit' ? 'Credit' : 
                                                            item.adjustment.type === 'debit' ? 'Debit' : item.adjustment.type}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            }
                            if (item.type === 'single') {
                                return <View key={item.tx.id}>{renderTransactionItem({ item: item.tx })}</View>;
                            }
                            return null;
                        })
                    )}
                </View>
            </ScrollView>

            {selectedAccount && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => {
                        if (!selectedAccount?.id) {
                            setShowAccountSheet(true);
                        } else {
                            navigation.navigate(screens.NewRecord, {
                                accountId: selectedAccount.id,
                                userId: selectedAccount.userId,
                                onSave: loadAccountsAndMap,
                                sourceScreen: 'calendar'
                            });
                        }
                    }}
                >
                    <Icon name="add" size={RFValue(24)} color={colors.white} />
                </TouchableOpacity>
            )}

            <Modal
                visible={showAccountSheet}
                onRequestClose={() => setShowAccountSheet(false)}
                transparent={true}
                animationType="slide"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.accountSheet}>
                        <Text style={styles.sheetTitle}>{t('calendarScreen.selectAccount')}</Text>
                        {accounts.map(account => (
                            <TouchableOpacity
                                key={account.id}
                                style={styles.accountOption}
                                onPress={() => {
                                    handleSwitchAccount(account.id);
                                    setShowAccountSheet(false);
                                }}
                            >
                                <Text style={styles.accountName}>{account.name}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowAccountSheet(false)}
                        >
                            <Text style={styles.closeButtonText}>{t('calendarScreen.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingBottom: hp(15),
    },
    accountSelectorContainer: {
        paddingVertical: hp(1.25),
        paddingHorizontal: wp(4),
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) },
        shadowRadius: wp(1.5),
    },
    accountSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5ff',
        borderRadius: wp(2.5),
        borderWidth: 1,
        borderColor: colors.primary,
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.25),
        alignSelf: 'flex-start',
    },
    accountTitle: {
        fontSize: RFPercentage(2.4),
        fontFamily: 'Sora-Bold',
        color: colors.primary,
        marginRight: wp(2),
    },
    dropdownIcon: {
        transform: [{ translateY: hp(0.25) }],
    },
    calendar: {
        marginBottom: hp(2),
        maxHeight: hp(40),
    },
    dayContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: wp(7),
        height: hp(4),
        borderRadius: wp(2.5),
    },
    selectedDay: {
        backgroundColor: colors.primary,
    },
    dayText: {
        color: colors.gray,
        fontSize: RFPercentage(1.7),
        fontFamily: 'Sora-Regular',
        textAlign: 'center',
    },
    selectedDayText: {
        color: colors.white,
        fontFamily: 'Sora-Bold',
    },
    disabledDayText: {
        color: colors.lightGray,
    },
    dotContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        position: 'absolute',
        bottom: hp(-0.005),
    },
    transactionDot: {
        width: wp(1.25),
        height: wp(1.25),
        borderRadius: wp(0.625),
        marginHorizontal: wp(0.25),
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: wp(4),
        backgroundColor: colors.background,
    },
    statCard: {
        backgroundColor: colors.white,
        borderRadius: wp(3),
        padding: wp(2.5),
        alignItems: 'center',
        width: wp(28),
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) },
    },
    statLabel: {
        fontFamily: 'Sora-Regular',
        fontSize: RFPercentage(1.5),
        color: colors.gray,
        textAlign: 'center',
        marginBottom: hp(0.5),
    },
    statValue: {
        fontFamily: 'Sora-Bold',
        fontSize: RFPercentage(1.5),
        color: colors.primary,
        textAlign: 'center',
    },
    statDateNote: {
        fontFamily: 'Sora-Regular',
        fontSize: RFPercentage(1.2),
        textAlign: 'center',
        marginTop: hp(0.5),
        opacity: 0.8,
    },
    typeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: hp(0.5),
    },
    typeLabel: {
        fontFamily: 'Sora-Regular',
        fontSize: RFPercentage(1.5),
        color: colors.gray,
        textAlign: 'center',
    },
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    amountColumnContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    transactions: {
        padding: wp(4),
        paddingBottom: hp(10),
        backgroundColor: colors.background,
    },
    transactionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: hp(2),
    },
    transactionDate: {
        fontSize: RFPercentage(2.2),
        color: colors.gray,
        fontFamily: 'Sora-Bold',
    },
    transactionTotal: {
        fontSize: RFPercentage(2),
        color: colors.success,
        fontFamily: 'Sora-Bold',
    },
    transactionItem: {
        backgroundColor: colors.white,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: wp(2.5),
        borderRadius: wp(2),
        marginBottom: hp(1),
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: hp(0.125) },
    },
    transactionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionName: {
        fontSize: RFPercentage(2),
        fontWeight: '600',
        color: '#333',
    },
    transactionDate: {
        fontSize: RFPercentage(1.6),
        color: '#666',
        marginTop: 2,
    },
    transactionType: {
        fontSize: RFValue(12),
        fontFamily: 'Sora-Regular',
        color: colors.gray,
    },
    transactionAmount: {
        alignItems: 'flex-end',
    },
    transactionAmountText: {
        fontSize: RFPercentage(2.0),
        fontFamily: 'Sora-Bold',
    },
    fab: {
        position: 'absolute',
        right: wp(4),
        bottom: hp(2),
        backgroundColor: colors.primary,
        width: wp(14),
        height: wp(14),
        borderRadius: wp(7),
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: hp(0.375) },
        overflow: 'hidden'
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    accountSheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: wp(4),
        borderTopRightRadius: wp(4),
        padding: wp(4),
    },
    sheetTitle: {
        fontSize: RFPercentage(2.5),
        fontFamily: 'Sora-Bold',
        color: colors.gray,
        marginBottom: hp(2),
    },
    accountOption: {
        padding: wp(3),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    accountName: {
        fontSize: RFPercentage(2.2),
        fontFamily: 'Sora-Regular',
        color: colors.primary,
    },
    closeButton: {
        padding: wp(3),
        backgroundColor: colors.error,
        borderRadius: wp(2),
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: hp(2),
    },
    closeButtonText: {
        fontSize: RFPercentage(2),
        fontFamily: 'Sora-Bold',
        color: colors.white,
    },
    noTransactions: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: hp(5),
        paddingHorizontal: wp(10),
    },
    noTransactionsText: {
        fontSize: RFValue(16),
        fontFamily: 'Sora-SemiBold',
        color: colors.gray,
        marginTop: hp(2),
        textAlign: 'center',
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    menuContainer: {
        position: 'absolute',
        backgroundColor: colors.white,
        borderRadius: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        paddingVertical: 8,
        width: 150,
    },
    colorIndicator: {
        width: 4,
        height: 40,
        borderRadius: 2,
        marginRight: 12,
    },
    menuOption: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    menuText: {
        fontSize: RFValue(14),
        fontFamily: 'Sora-Regular',
        color: colors.gray,
    },
    menuTrigger: {
        padding: wp(3.5),
    },
    proxyExpandedContainer: {
        padding: wp(2),
        backgroundColor: '#f8f8f8'
    },
    proxyBody: {
        backgroundColor: '#f8f8f8',
        padding: 12,
    },
    proxyCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        marginBottom: hp(1),
        elevation: 1,
        shadowColor: colors.gray,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        overflow: 'hidden'
    },
    recurringCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 1,
        shadowColor: colors.gray,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        overflow: 'hidden'
    },
    recurringHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    recurringIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    recurringDetails: {
        flex: 1,
    },
    disabledOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        zIndex: 1,
    },
    noTransactionsSubtext: {
        fontSize: RFValue(14),
        fontFamily: 'Sora-Regular',
        color: colors.gray,
        textAlign: 'center',
    },
});

export default CalendarScreen;