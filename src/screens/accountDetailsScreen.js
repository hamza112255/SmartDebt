import { useState, useLayoutEffect, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Modal,
    Alert,
    TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { screens } from '../constant/screens';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { useFocusEffect } from '@react-navigation/native';
import { getAllObjects, realm } from '../realm';
import { useTranslation } from 'react-i18next';
import moment from 'moment';

const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    error: '#dc2626',
    background: '#f8fafc',
    white: '#ffffff',
    gray: '#6b7280',
    lightGray: '#f3f4f6',
    border: '#e5e7eb',
    balance: '#4b5eAA',
    cardBackground: 'rgba(255, 255, 255, 0.15)',
};

const makeStyles = (accountColor) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: hp('10%') },
    header: {
        backgroundColor: accountColor,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
        paddingHorizontal: wp('5%'),
        paddingTop: hp('3%'),
        paddingBottom: hp('2%'),
        marginBottom: hp('3%'),
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: hp('1%') },
    backButton: { marginRight: 16, padding: 6 },
    headerTitleContainer: { flex: 1 },
    accountName: { fontSize: RFPercentage(2.8), color: colors.white, fontFamily: 'Sora-Bold' },
    accountType: { fontSize: RFPercentage(2.0), color: colors.lightGray, fontFamily: 'Sora-Regular', marginTop: 2 },
    balanceContainer: { alignItems: 'center', marginTop: hp('1.5%') },
    balanceLabel: { color: colors.white, fontSize: RFPercentage(1.7), fontFamily: 'Sora-Regular' },
    balanceAmount: { color: colors.white, fontSize: RFPercentage(2.8), fontFamily: 'Sora-Bold', marginTop: 4 },
    typeContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: hp('2%') },
    typeBox: { alignItems: 'center', flex: 1 },
    typeLabel: { color: colors.white, fontSize: RFPercentage(1.8), fontFamily: 'Sora-Regular' },
    typeAmount: { color: colors.white, fontSize: RFPercentage(2.1), fontFamily: 'Sora-Bold', marginTop: 2 },
    transactionsSection: { marginHorizontal: wp('5%'), marginTop: hp('2%') },
    transactionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: RFPercentage(2.2), color: colors.gray, fontFamily: 'Sora-Bold' },
    viewAllText: { fontFamily: 'Sora-Bold', fontSize: RFPercentage(2.0) },
    noTransactions: { alignItems: 'center', marginTop: hp('4%') },
    noTransactionsText: { marginTop: 12, color: colors.lightGray, fontFamily: 'Sora-Regular', fontSize: RFPercentage(1.8) },
    noTransactionsSubtext: { color: colors.lightGray, fontFamily: 'Sora-Regular', fontSize: RFPercentage(1.5), marginTop: 2 },
    transactionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 10, elevation: 1, shadowColor: colors.gray, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1 },
    transactionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    transactionDetails: { flex: 1 },
    transactionName: { fontSize: RFPercentage(1.9), color: colors.gray, fontFamily: 'Sora-Bold' },
    transactionDate: { fontSize: RFPercentage(1.5), color: colors.lightGray, fontFamily: 'Sora-Regular', marginTop: 2 },
    transactionAmount: { fontSize: RFPercentage(2.0), fontFamily: 'Sora-Bold', marginLeft: 8 },
    fab: { position: 'absolute', right: 24, bottom: 32, borderRadius: 30, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', elevation: 4 },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: wp(4.5),
        marginTop: hp(2),
        marginBottom: hp(1)
    },
    balanceRow: {
        paddingHorizontal: wp(4.5),
        marginBottom: hp(2),
    },
    statCard: {
        backgroundColor: colors.white,
        borderRadius: wp(3),
        paddingVertical: hp(1),
        paddingHorizontal: wp(4),
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) },
    },
    debitCard: {
        flex: 1,
        marginRight: wp(2),
        backgroundColor: colors.success,
        borderColor: colors.success,
        borderWidth: 1,
    },
    creditCard: {
        flex: 1,
        marginLeft: wp(2),
        backgroundColor: colors.error,
        borderColor: colors.error,
        borderWidth: 1,
    },
    balanceCard: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1,
    },
    statLabel: {
        fontSize: RFPercentage(1.8),
        fontFamily: 'Sora-Regular',
        color: colors.white,
        marginBottom: hp(0.5),
    },
    statValue: {
        fontSize: RFPercentage(1.5), // ~16px
        fontFamily: 'Sora-Bold',
        color: colors.white,
    },
    transactionsSection: {
        paddingHorizontal: wp(4.5), // ~18px
        paddingBottom: hp(2.5), // ~20px
    },
    transactionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: hp(1.5), // ~12px
    },
    sectionTitle: {
        fontSize: RFPercentage(2.5), // ~18px
        fontFamily: 'Sora-Bold',
        color: colors.gray,
    },
    viewAllText: {
        fontSize: RFPercentage(2), // ~14px
        fontFamily: 'Sora-Regular',
        color: colors.primary,
    },
    transactionItem: {
        backgroundColor: colors.white,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: wp(2.5), // ~10px
        borderRadius: wp(2), // ~8px
        marginBottom: hp(1), // ~8px
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: hp(0.125) }, // ~1px
    },
    transactionDetails: {
        flex: 1,
        marginRight: wp(3), // ~12px
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
        marginBottom: hp(0.5),
    },
    noTransactionsSubtext: {
        fontSize: RFValue(12),
        fontFamily: 'Sora-Regular',
        color: colors.lightGray,
        textAlign: 'center',
    },
    transactionContact: {
        fontSize: RFPercentage(1.4), // ~11px
        fontFamily: 'Sora-Regular',
        color: colors.gray,
        marginTop: 2,
    },
    transactionDescription: {
        fontSize: RFPercentage(2), // ~14px
        fontFamily: 'Sora-Regular',
        color: colors.primary,
        marginBottom: hp(0.25), // ~2px
    },
    transactionDate: {
        fontSize: RFPercentage(1.7), // ~12px
        fontFamily: 'Sora-Regular',
        color: colors.gray,
    },
    transactionAmount: {
        alignItems: 'flex-end',
    },
    transactionAmountText: {
        fontSize: RFPercentage(2), // ~14px
        fontFamily: 'Sora-Bold',
        marginBottom: hp(0.25), // ~2px
    },
    fab: {
            position: 'absolute',
            right: wp(4), // ~16px
            bottom: hp(2), // ~16px
            backgroundColor: colors.primary,
            width: wp(14), // ~56px
            height: wp(14),
            borderRadius: wp(7), // ~28px
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 6,
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowOffset: { width: 0, height: hp(0.375) }, // ~3px
        },
    transactionBalance: {
        fontSize: RFPercentage(1.5), // ~11px
        fontFamily: 'Sora-Regular',
        color: colors.gray,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    transactionType: {
        fontSize: RFValue(12),
        fontFamily: 'Sora-Regular',
        color: colors.gray,
    },
    typeSplitContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: hp('1.5%')
    },
    typeSplitItem: {
        alignItems: 'center',
        flex: 1
    },
    typeSplitLabel: {
        fontSize: RFPercentage(1.8),
        color: colors.lightGray,
        fontFamily: 'Sora-Regular'
    },
    typeSplitValue: {
        fontSize: RFPercentage(2.0),
        color: colors.white,
        fontFamily: 'Sora-Bold',
        marginTop: 4
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
        padding: 12,
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 1,
        shadowColor: colors.gray,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    proxyHeader: {
        backgroundColor: '#f1f5ff',
        borderWidth: 1,
        borderColor: colors.primary,
        justifyContent: 'space-between',
        padding: 12,
    },
    proxyHeaderText: {
        fontFamily: 'Sora-Bold',
        fontSize: RFValue(15),
        color: colors.primary,
        marginLeft: 8,
    },
    proxySubHeaderText: {
        fontFamily: 'Sora-Regular',
        fontSize: RFValue(12),
        color: colors.gray,
        marginTop: 2,
        marginLeft: 0,
    },
    proxyBody: {
        backgroundColor: '#f8f8f8',
        padding: 12,
    },
    proxyCard: {
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
    proxyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    proxyLabel: {
        fontFamily: 'Sora-Regular',
        fontSize: RFValue(13),
        color: colors.gray,
    },
    proxyValue: {
        fontFamily: 'Sora-SemiBold',
        fontSize: RFValue(13),
        color: colors.darkGray,
    },
    proxyActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.lightGray,
        paddingTop: 12,
    },
    proxyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.lightGray,
        marginLeft: 12,
    },
    proxyButtonText: {
        fontFamily: 'Sora-SemiBold',
        fontSize: RFValue(12),
        color: colors.primary,
        marginRight: 4,
    },
    moneyFlowContainer: {
        flexDirection: 'row',
        marginTop: hp('2%'),
        marginHorizontal: wp('2%'),
        justifyContent: 'space-between',
    },
    moneyFlowCard: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    moneyFlowLabel: {
        fontFamily: 'Sora-Regular',
        fontSize: RFValue(14),
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 4,
    },
    moneyFlowValue: {
        fontFamily: 'Sora-Bold',
        fontSize: RFValue(16),
    }
});

const AccountDetailScreen = ({ navigation, route }) => {
    const { accountId, color } = route.params;
    const { t, i18n } = useTranslation();
    const [accountData, setAccountData] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({
        debit: 0,
        credit: 0,
        balance: 0,
    });
    const [isMenuVisible, setMenuVisible] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [expandedProxyGroups, setExpandedProxyGroups] = useState({});

    const styles = makeStyles(color || colors.primary);

    const getStatLabels = () => {
        if (!accountData?.type) {
            return { in: t('terms.credit'), out: t('terms.debit') };
        }
        const typeName = t(`accountTypes.${accountData.type}`);
        if (typeName && typeName.includes(' - ')) {
            const parts = typeName.split(' - ');
            // Handle 'Debit - Credit' case specifically if needed
            if (accountData.type === 'debit_credit') {
                 return { in: parts[1], out: parts[0] };
            }
            return { in: parts[0], out: parts[1] };
        }
        return { in: t('terms.credit'), out: t('terms.debit') };
    };

    const openMenu = (transaction, event, isProxy = false) => {
        const { pageX, pageY } = event.nativeEvent;
        setSelectedTx({ ...transaction, isProxy });
        setMenuPosition({ x: pageX - 120, y: pageY });
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
            accountId: accountData.id,
            userId: accountData.userId,
            onTransactionSaved: handleTransactionSave,
            sourceScreen: 'AccountDetail',
        });
    };

    const handleDuplicate = () => {
        if (!selectedTx) return;
        const tx = selectedTx;
        closeMenu();
        navigation.navigate(screens.NewRecord, {
            transactionId: tx.id,
            accountId: accountData.id,
            userId: accountData.userId,
            onTransactionSaved: handleTransactionSave,
            sourceScreen: 'AccountDetail',
            isDuplicating: true,
        });
    };

    const handleEditAccount = () => {
        navigation.navigate(screens.NewAccount, { account: accountData });
    };

    const handleDeleteAccount = () => {
        if (!accountData?.id) return;

        Alert.alert(
            t('accountDetailsScreen.deleteAccountTitle', 'Delete Account'),
            t('accountDetailsScreen.deleteAccountMessage', 'Are you sure you want to delete this account? All associated transactions will also be deleted permanently.'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => {
                        const accountId = accountData.id;
                        const userId = accountData.userId;

                        realm.write(() => {
                            const transactionsToDelete = realm.objects('Transaction').filtered('accountId == $0', accountId);
                            transactionsToDelete.forEach(tx => {
                                const pendingTxLogs = realm.objects('SyncLog').filtered('recordId == $0 AND (status == "pending" OR status == "failed")', tx.id);
                                const isTxNewAndUnsynced = pendingTxLogs.some(log => log.operation === 'create');

                                if (isTxNewAndUnsynced) {
                                    if (pendingTxLogs.length > 0) realm.delete(pendingTxLogs);
                                } else {
                                    const updateTxLogs = pendingTxLogs.filtered('operation == "update"');
                                    if (updateTxLogs.length > 0) realm.delete(updateTxLogs);
                                    
                                    realm.create('SyncLog', {
                                        id: new Date().toISOString() + '_tx_del_log',
                                        userId: userId,
                                        tableName: 'transactions',
                                        recordId: tx.id,
                                        operation: 'delete',
                                        status: 'pending',
                                        createdOn: new Date(),
                                    });
                                }
                            });
                            realm.delete(transactionsToDelete);

                            const accountToDelete = realm.objectForPrimaryKey('Account', accountId);
                            if (accountToDelete) {
                                const pendingAccountLogs = realm.objects('SyncLog').filtered('recordId == $0 AND (status == "pending" OR status == "failed")', accountId);
                                const isAccountNewAndUnsynced = pendingAccountLogs.some(log => log.operation === 'create');

                                if (isAccountNewAndUnsynced) {
                                    if (pendingAccountLogs.length > 0) realm.delete(pendingAccountLogs);
                                } else {
                                    const updateAccLogs = pendingAccountLogs.filtered('operation == "update"');
                                    if (updateAccLogs.length > 0) realm.delete(updateAccLogs);
                                    
                                    realm.create('SyncLog', {
                                        id: new Date().toISOString() + '_acc_del_log',
                                        userId: userId,
                                        tableName: 'accounts',
                                        recordId: accountId,
                                        operation: 'delete',
                                        status: 'pending',
                                        createdOn: new Date(),
                                    });
                                }
                                realm.delete(accountToDelete);
                            }
                        });
                        
                        navigation.goBack();
                    },
                },
            ]
        );
    };

    function updateAccountBalanceForDelete(account, tx, isRevert = false) {
        const amount = parseFloat(tx.amount) || 0;
        const type = tx.type;
        let balanceChange = 0;

        if (tx.on_behalf_of_contact_id == null || tx.on_behalf_of_contact_id === '') {
            if (['credit', 'borrow', 'cash_in', 'receive'].includes(type)) {
                balanceChange = amount;
            } else { 
                balanceChange = -amount;
            }

            if (isRevert) {
                balanceChange = -balanceChange;
            }

            account.currentBalance = (account.currentBalance || 0) + balanceChange;
            account.updatedOn = new Date();
        }
    }

    const handleDelete = () => {
        if (!selectedTx) return;
        const txToDeleteId = selectedTx.id;
        closeMenu();

        Alert.alert("Delete Transaction", "Are you sure you want to delete this transaction?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                    realm.write(() => {
                        const txToDelete = realm.objectForPrimaryKey('Transaction', txToDeleteId);
                        if (!txToDelete) return;

                        const pendingLogs = realm.objects('SyncLog').filtered('recordId == $0 AND (status == "pending" OR status == "failed")', txToDeleteId);
                        const isNewAndUnsynced = pendingLogs.some(log => log.operation === 'create');

                        if (isNewAndUnsynced) {
                            // Item was created offline and never synced. Delete record and all its logs.
                            if (pendingLogs.length > 0) realm.delete(pendingLogs);
                        } else {
                            // Item was synced or is being synced. Add a delete log.
                            // First, remove any pending 'update' logs for this record.
                            const updateLogs = pendingLogs.filtered('operation == "update"');
                            if (updateLogs.length > 0) realm.delete(updateLogs);
                            
                            realm.create('SyncLog', {
                                id: new Date().toISOString() + '_log',
                                userId: txToDelete.userId,
                                tableName: 'transactions',
                                recordId: txToDeleteId,
                                operation: 'delete',
                                status: 'pending',
                                createdOn: new Date(),
                            });
                        }

                        // Now, handle local data updates and deletion
                        if (txToDelete.is_proxy_payment) {
                            const proxyPayment = realm.objects('ProxyPayment').filtered('originalTransactionId == $0', txToDelete.id)[0];
                            if (proxyPayment) {
                                if (proxyPayment.debtAdjustmentTransactionId) {
                                    const debtTx = realm.objectForPrimaryKey('Transaction', proxyPayment.debtAdjustmentTransactionId);
                                    if (debtTx) {
                                        const adjAccount = realm.objectForPrimaryKey('Account', debtTx.accountId);
                                        if (adjAccount) {
                                            updateAccountBalanceForDelete(adjAccount, debtTx, true);
                                        }
                                        realm.delete(debtTx);
                                    }
                                }
                                realm.delete(proxyPayment);
                            }
                        }

                        const account = realm.objectForPrimaryKey('Account', txToDelete.accountId);
                        if (account) {
                            updateAccountBalanceForDelete(account, txToDelete, true);
                        }
                        realm.delete(txToDelete);
                    });
                    loadTransactions();
                },
            },
        ]);
    };

    const loadAccountData = useCallback(() => {
        if (!accountId) return;
        const account = realm.objectForPrimaryKey('Account', accountId);
        if (account) {
            const allTransactions = realm.objects('Transaction').filtered('accountId == $0', accountId);
            const debtAdjustmentTxIds = getDebtAdjustmentTxIds();

            const stats = allTransactions
                .filter(t => !debtAdjustmentTxIds.has(t.id))
                .reduce((acc, tx) => {
                    const amount = tx.amount || 0;
                    if (tx.type === 'cash_in') acc.cash_in += amount;
                    else if (tx.type === 'cash_out') acc.cash_out += amount;
                    else if (tx.type === 'receive') acc.receive += amount;
                    else if (tx.type === 'send_out') acc.send_out += amount;
                    else if (tx.type === 'borrow') acc.borrow += amount;
                    else if (tx.type === 'lend') acc.lend += amount;
                    else if (tx.type === 'credit') acc.credit += amount;
                    else if (tx.type === 'debit') acc.debit += amount;
                    return acc;
                }, {
                    cash_in: 0, cash_out: 0, receive: 0, send_out: 0,
                    borrow: 0, lend: 0, credit: 0, debit: 0,
                });

            setAccountData({
                id: account.id,
                name: account.name,
                type: account.type,
                color: account.color,
                currentBalance: account.currentBalance,
                currency: account.currency,
                userId: account.userId,
                receiving_money: account.receiving_money,
                sending_money: account.sending_money,
                ...stats,
            });
        }
    }, [accountId]);

    useEffect(() => {
        if (!accountId) return;
        
        loadAccountData();
        
        const account = realm.objectForPrimaryKey('Account', accountId);
        if (!account) return;
        
        const listener = (obj, changes) => {
            if (changes.deleted) return;
            loadAccountData();
        };
        
        account.addListener(listener);
        return () => {
            if (account.isValid()) {
                account.removeListener(listener);
            }
        };
    }, [accountId, loadAccountData]);

    const updateAccountBalance = useCallback((accountId) => {
        try {
            const realmAccount = realm.objectForPrimaryKey('Account', accountId);
            if (!realmAccount) return;

            const transactions = realm.objects('Transaction').filtered('accountId == $0', accountId);
            let newBalance = realmAccount.openingBalance || 0;

            transactions.forEach(tx => {
                if (!tx.is_proxy_payment || !tx.on_behalf_of_contact_id) {
                    if (['cash_in', 'credit', 'receive', 'borrow'].includes(tx.type)) {
                        newBalance += tx.amount || 0;
                    } else {
                        newBalance -= tx.amount || 0;
                    }
                }
            });

            realm.write(() => {
                realmAccount.currentBalance = newBalance;
                realmAccount.updatedOn = new Date();
            });

            setAccountData(prev => (prev ? { ...prev, currentBalance: newBalance } : null));

        } catch (error) {
            console.error('Error updating account balance:', error);
        }
    }, []);

    const loadTransactions = useCallback(() => {
        if (!accountData?.id) return;
        try {
            const realmTransactions = getAllObjects('Transaction')
                ?.filtered('accountId == $0', accountData.id)
                ?.sorted('transactionDate', true) || [];

            const plainTransactions = realmTransactions.map(tx => {
                const contact = tx.contactId ? realm.objectForPrimaryKey('Contact', tx.contactId) : null;
                return {
                    ...JSON.parse(JSON.stringify(tx)),
                    contactName: contact?.name || '',
                };
            });

            setTransactions(plainTransactions.filter(Boolean));

        } catch (error) {
            console.error('Error loading transactions:', error);
            setTransactions([]);
        }
    }, [accountData?.id]);

    useEffect(() => {
        try {
            const allTransactions = realm.objects('Transaction');
            const listener = (transactions, changes) => {
                if (changes) {
                    const accountTransactionsChanged = (changes.insertions?.length > 0) || (changes.modifications?.length > 0) || (changes.deletions?.length > 0);
                    if (accountTransactionsChanged) {
                        loadTransactions();
                    }
                }
            };
            allTransactions.addListener(listener);
            return () => {
                allTransactions.removeListener(listener);
            };
        } catch (error) {
            console.error('Error setting up transaction listener:', error);
        }
    }, [loadTransactions]);

    useFocusEffect(
        useCallback(() => {
            loadAccountData();
            loadTransactions();
        }, [loadAccountData, loadTransactions])
    );

    useLayoutEffect(() => {
        navigation.setOptions({
            title: accountData?.name || t('screens.accountDetails'),
            headerStyle: { backgroundColor: color || colors.primary, elevation: 0, shadowOpacity: 0, borderBottomWidth: 0 },
            headerTintColor: colors.white,
            headerTitleStyle: { fontFamily: 'Sora-Bold', fontSize: RFValue(18), color: colors.white },
            headerLeft: () => (
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
            ),
            headerRight: () => (
                <TouchableOpacity onPress={() => navigation.navigate(screens.NewAccount, { account: accountData })} style={{ padding: 8 }}>
                    <Text style={{ color: colors.white, fontFamily: 'Sora-SemiBold', fontSize: RFValue(16) }}>{t('common.edit')}</Text>
                </TouchableOpacity>
            ),
        });
    }, [navigation, accountData, color, styles.backButton]);

    const getDebtAdjustmentTxIds = () => {
        return new Set(
            (realm.objects('ProxyPayment') || []).map(p => p.debtAdjustmentTransactionId)
        );
    };

    const formatAmount = (amount, code = accountData?.currency) => {
        const value = Math.abs(Number(amount) || 0);
        const sign = Number(amount) < 0 ? '-' : '';
        return `${sign}${code} ${value.toLocaleString()}`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = moment(dateStr).toDate();
        return date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
    };

    const getTransactionIcon = (type) => {
        if (['cash_in', 'credit', 'receive', 'borrow'].includes(type)) return 'arrow-upward';
        return 'arrow-downward';
    };

    const getTransactionColor = (type) => {
        if (['cash_in', 'credit', 'receive', 'borrow'].includes(type)) return colors.success;
        return colors.error;
    };

    const getProxyPaymentMap = () => {
        const proxyPayments = realm.objects('ProxyPayment') || [];
        const map = {};
        proxyPayments.forEach(pp => {
            map[pp.originalTransactionId] = pp;
            map[pp.debtAdjustmentTransactionId] = pp;
        });
        return map;
    };

    const groupTransactions = (transactionsArr) => {
        const proxyMap = getProxyPaymentMap();
        const grouped = [];
        const usedIds = new Set();
        const localTransactions = [...transactionsArr];

        localTransactions.forEach(tx => {
            if (usedIds.has(tx.id)) return;
            const proxy = proxyMap[tx.id];
            if (proxy) {
                const mainTxId = proxy.originalTransactionId;
                const adjTxId = proxy.debtAdjustmentTransactionId;
                const mainTx = localTransactions.find(t => t.id === mainTxId);
                const adjTx = localTransactions.find(t => t.id === adjTxId);

                if (mainTx && adjTx) {
                    grouped.push({
                        type: 'proxyGroup',
                        main: mainTx,
                        adjustment: adjTx,
                        proxy,
                    });
                    usedIds.add(mainTxId);
                    usedIds.add(adjTxId);
                } else {
                    if (mainTx) {
                        grouped.push({ type: 'single', tx: mainTx });
                        usedIds.add(mainTx.id);
                    }
                    if (adjTx && !usedIds.has(adjTx.id)) {
                        grouped.push({ type: 'single', tx: adjTx });
                        usedIds.add(adjTx.id);
                    }
                }
            } else {
                grouped.push({ type: 'single', tx });
                usedIds.add(tx.id);
            }
        });
        return grouped;
    };

    const renderTransactionItem = useCallback(({ item }) => {
        if (!item) return null;
        const type = item?.type || 'debit';
        const transactionColor = getTransactionColor(type);
        const amount = parseFloat(item?.amount) || 0;
        const iconName = getTransactionIcon(type);

        const typeTextMap = { cash_in: t('terms.cash_in'), cash_out: t('terms.cash_out'), debit: t('terms.debit'), credit: t('terms.credit'), receive: t('terms.receive'), send_out: t('terms.send_out'), borrow: t('terms.borrow'), lend: t('terms.lend') };
        const typeText = typeTextMap[type] || type;

        return (
            <View style={styles.transactionRow} key={item.id}>
                <TouchableOpacity 
                    style={{flexDirection: 'row', alignItems: 'center', flex: 1, padding: 12}} 
                    >
                    <View style={[styles.transactionIcon, { backgroundColor: transactionColor + '20' }]}>
                        <Icon name={iconName} size={RFValue(20)} color={transactionColor} />
                    </View>
                    <View style={styles.transactionDetails}>
                        <Text style={styles.transactionName} numberOfLines={1}>{item?.purpose || t('accountDetailsScreen.noDescription')}</Text>
                        <Text style={styles.transactionDate}>{item?.transactionDate ? formatDate(item.transactionDate) : t('accountDetailsScreen.noDate')}</Text>
                    </View>
                    <View style={styles.amountContainer}>
                        <Text style={[styles.transactionAmountText, { color: transactionColor }]}>
                            {['cash_in', 'credit', 'receive', 'borrow'].includes(type) ? '+' : '-'}
                            {formatAmount(amount, accountData?.currency)}
                        </Text>
                        <Text style={styles.transactionType}>{typeText}</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuTrigger} onPress={(e) => openMenu(item, e, item.is_proxy_payment)}>
                    <Icon name="more-vert" size={RFValue(20)} color={colors.gray} />
                </TouchableOpacity>
            </View>
        );
    }, [accountData?.currency, styles, t, navigation]);

    const handleTransactionSave = useCallback(() => {
        loadTransactions();
        if (accountData?.id) {
            updateAccountBalance(accountData.id);
        }
    }, [loadTransactions, updateAccountBalance, accountData?.id]);

    const renderMenu = () => (
        <Modal visible={isMenuVisible} transparent animationType="fade" onRequestClose={closeMenu}>
            <TouchableWithoutFeedback onPress={closeMenu}>
                <View style={StyleSheet.absoluteFill}>
                    <View style={[styles.menuContainer, { top: menuPosition.y, left: menuPosition.x }]}>
                        <TouchableOpacity style={styles.menuOption} onPress={handleEdit}>
                            <Text style={styles.menuText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuOption} onPress={handleDuplicate}>
                            <Text style={styles.menuText}>Duplicate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuOption} onPress={handleDelete}>
                            <Text style={[styles.menuText, { color: colors.error }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    if (!accountData) return null;

    const groupedTransactions = Array.isArray(transactions) ? groupTransactions(transactions) : [];
    const { in: inLabel, out: outLabel } = getStatLabels();

    return (
        <SafeAreaView style={styles.container}>
            {renderMenu()}
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="arrow-back" size={24} color={colors.white} />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.accountName}>{accountData.name || t('common.account')}</Text>
                        </View>
                    </View>
                    <View style={styles.balanceContainer}>
                        <Text style={styles.balanceLabel}>{t('accountDetailsScreen.balance')}</Text>
                        <Text style={styles.balanceAmount}>{formatAmount(accountData.currentBalance)}</Text>
                    </View>

                    <View style={styles.moneyFlowContainer}>
                        <View style={[styles.moneyFlowCard, { marginRight: 8 }]}>
                            <Text style={styles.moneyFlowLabel}>{inLabel}</Text>
                            <Text style={[styles.moneyFlowValue, { color: colors.success }]}>{formatAmount(accountData.receiving_money)}</Text>
                        </View>
                        <View style={[styles.moneyFlowCard, { marginLeft: 8 }]}>
                            <Text style={styles.moneyFlowLabel}>{outLabel}</Text>
                            <Text style={[styles.moneyFlowValue, { color: colors.error }]}>{formatAmount(accountData.sending_money)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.transactionsSection}>
                    <View style={styles.transactionsHeader}>
                        <Text style={styles.sectionTitle}>{t('accountDetailsScreen.recentTransactions')}</Text>
                    </View>

                    {groupedTransactions?.length > 0 ? (
                        groupedTransactions.map((item, index) => {
                            if (item.type === 'proxyGroup') {
                                const groupKey = item.main.id;
                                const expanded = !!expandedProxyGroups[groupKey];
                                return (
                                    <View key={groupKey} style={styles.proxyCard}>
                                        <View style={styles.transactionRow}>
                                            <TouchableOpacity
                                                style={[styles.transactionItem, {flex: 1, padding: 12}]}
                                                onPress={() => setExpandedProxyGroups(prev => ({...prev, [groupKey]: !prev[groupKey]}))}
                                                activeOpacity={0.8}
                                            >
                                                <View style={[styles.transactionIcon, { backgroundColor: colors.primary + '20' }]}>
                                                    <Icon name="swap-horiz" size={RFValue(20)} color={colors.primary} />
                                                </View>
                                                <View style={styles.transactionDetails}>
                                                     <Text style={styles.transactionName}>Proxy Payment</Text>
                                                     <Text style={styles.transactionType}>{item.main.purpose || 'Tap to see details'}</Text>
                                                </View>
                                                <View style={{alignItems: 'center'}}>
                                                    <Text style={[styles.transactionAmountText, { color: getTransactionColor(item.main.type) }]}>
                                                        {['cash_in', 'receive', 'borrow', 'credit'].includes(item.main.type) ? '+' : '-'}
                                                        {formatAmount(item.main.amount, accountData.currency)}
                                                    </Text>
                                                    <Icon name={expanded ? "expand-less" : "expand-more"} size={RFValue(24)} color={colors.primary} />
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                        {expanded && (
                                            <View style={styles.proxyBody}>
                                                <View style={styles.transactionRow}>
                                                    <TouchableOpacity 
                                                        style={{flexDirection: 'row', alignItems: 'center', flex: 1, padding: 12}}
                                                    >
                                                        <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(item.main.type) + '20' }]}>
                                                            <Icon name={getTransactionIcon(item.main.type)} size={RFValue(20)} color={getTransactionColor(item.main.type)} />
                                                        </View>
                                                        <View style={styles.transactionDetails}>
                                                            <Text style={styles.transactionName}>{item.main.purpose || 'Original Payment'}</Text>
                                                            <Text style={styles.transactionDate}>{item.main.contactName || 'N/A'}</Text>
                                                        </View>
                                                        <View style={styles.amountContainer}>
                                                            <Text style={[styles.transactionAmountText, { color: getTransactionColor(item.main.type) }]}>
                                                                {['cash_in', 'credit', 'receive', 'borrow'].includes(item.main.type) ? '+' : '-'}
                                                                {formatAmount(item.main.amount, accountData?.currency)}
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
                                                        <Text style={styles.transactionName}>{item.adjustment.purpose || 'Debt Adjustment'}</Text>
                                                        <Text style={styles.transactionDate}>{item.adjustment.contactName || 'N/A'}</Text>
                                                    </View>
                                                    <View style={styles.amountContainer}>
                                                        <Text style={[styles.transactionAmountText, { color: getTransactionColor(item.adjustment.type) }]}>
                                                            {['cash_in', 'credit', 'receive', 'borrow'].includes(item.adjustment.type) ? '+' : '-'}
                                                            {formatAmount(item.adjustment.amount, accountData?.currency)}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                );
                            }
                            return <View key={item.tx.id}>{renderTransactionItem({ item: item.tx })}</View>;
                        })
                    ) : (
                        <View style={styles.noTransactions}>
                            <Icon name="receipt" size={RFValue(40)} color={colors.lightGray} />
                            <Text style={styles.noTransactionsText}>{t('accountDetailsScreen.noTransactions')}</Text>
                            <Text style={styles.noTransactionsSubtext}>{t('accountDetailsScreen.addFirstTransaction')}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: color || colors.primary }]}
                onPress={() => {
                    navigation.navigate(screens.NewRecord, {
                        accountId: accountData.id,
                        userId: accountData.userId,
                        sourceScreen: 'AccountDetail',
                        onTransactionSaved: handleTransactionSave
                    });
                }}
            >
                <Icon name="add" size={RFValue(30)} color={colors.white} />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default AccountDetailScreen;