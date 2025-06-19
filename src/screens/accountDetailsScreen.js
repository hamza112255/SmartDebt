import { useState, useLayoutEffect, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { screens } from '../constant/screens';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { useFocusEffect } from '@react-navigation/native';
import { getAllObjects, realm } from '../realm';
import { useTranslation } from 'react-i18next';

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
});

const AccountDetailScreen = ({ navigation, route }) => {
    // Replace account param handling with accountId
        const { t, i18n } = useTranslation();
    const accountId = route.params?.account?.id || route.params?.accountId;
    const [accountData, setAccountData] = useState(null);
    // State for transactions
    const [transactions, setTransactions] = useState([]);
    const [showAccountSheet, setShowAccountSheet] = useState(false);

    // Get the account color or use primary color as fallback
    const accountColor = accountData?.color || colors.primary;

    // Create styles with the account color
    const dynamicStyles = makeStyles(accountColor);

    // Load account data from Realm
    const loadAccountData = useCallback(() => {
        if (!accountId) return;
        const account = realm.objectForPrimaryKey('Account', accountId);
        if (account) {
            setAccountData({
                id: account.id,
                name: account.name,
                type: account.type,
                color: account.color,
                currentBalance: account.currentBalance,
                cashIn: account.cashIn,
                cashOut: account.cashOut,
                receive: account.receive,
                sendOut: account.sendOut,
                borrow: account.borrow,
                lend: account.lend,
                credit: account.credit,
                debit: account.debit,
                currency: account.currency,
                userId: account.userId,
            });
        }
    }, [accountId]);

    // Add account listener
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

    // Load transactions from Realm
    const updateAccountBalance = useCallback((accountId) => {
        try {
            const realmAccount = realm.objectForPrimaryKey('Account', accountId);
            if (!realmAccount) return;

            // Calculate new balance from all transactions
            const transactions = realm.objects('Transaction').filtered('accountId == $0', accountId);
            let newBalance = 0;

            transactions.forEach(tx => {
                if (
                    tx.type === 'cashIn' ||
                    tx.type === 'credit' ||
                    tx.type === 'receive' ||
                    tx.type === 'borrow'
                ) {
                    newBalance += tx.amount || 0;
                } else {
                    newBalance -= tx.amount || 0;
                }
            });

            // Update account balance in Realm
            realm.write(() => {
                realmAccount.balance = newBalance;
                realmAccount.updatedOn = new Date();
            });

            // Update local state
            setAccountData(prev => ({
                ...prev,
                balance: newBalance,
                updatedOn: new Date().toISOString()
            }));

            return newBalance;
        } catch (error) {
            console.error('Error updating account balance:', error);
            return 0;
        }
    }, []);

    const loadTransactions = useCallback(() => {
        try {
            const realmTransactions = getAllObjects('Transaction')
                ?.filtered('accountId == $0', accountData?.id || '')
                ?.sorted('transactionDate', true) || [];

            const plainTransactions = (realmTransactions || []).map(tx => ({
                ...tx,
                transactionDate: tx?.transactionDate ? tx.transactionDate.toISOString() : new Date().toISOString(),
                createdOn: tx?.createdOn ? tx.createdOn.toISOString() : new Date().toISOString(),
                updatedOn: tx?.updatedOn ? tx.updatedOn.toISOString() : new Date().toISOString()
            }));

            setTransactions(plainTransactions || []);

            // Update account balance when loading transactions
            if (accountData?.id) {
                updateAccountBalance(accountData.id);
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            setTransactions([]);
        }
    }, [accountData?.id, updateAccountBalance]);

    // Set up Realm listener for transaction changes
    useEffect(() => {
        try {
            const transactions = realm.objects('Transaction');
            if (!transactions) return;

            const transactionListener = (txs, changes) => {
                try {
                    const relevantChanges = changes.insertions?.some(index => {
                        const tx = txs[index];
                        return tx.accountId === accountData?.id;
                    }) || changes.modifications?.some(index => {
                        const tx = txs[index];
                        return tx.accountId === accountData?.id;
                    }) || changes.deletions?.some(index => {
                        const tx = txs[index];
                        return tx.accountId === accountData?.id;
                    });

                    if (relevantChanges) {
                        loadTransactions();
                        if (accountData?.id) {
                            updateAccountBalance(accountData.id);
                        }
                    }
                } catch (error) {
                    console.error('Error in transaction listener:', error);
                }
            };

            transactions.addListener(transactionListener);
            return () => {
                if (transactions && transactions.removeListener) {
                    transactions.removeListener(transactionListener);
                }
            };
        } catch (error) {
            console.error('Error setting up transaction listener:', error);
        }
    }, [loadTransactions, updateAccountBalance, accountData?.id]);

    // Load transactions when screen gains focus
    useFocusEffect(
        useCallback(() => {
            loadTransactions();
            return () => { };
        }, [loadTransactions])
    );

    // Set navigation options
    useLayoutEffect(() => {
        navigation.setOptions({
                        title: accountData?.name || t('screens.accountDetails'),
            headerStyle: {
                backgroundColor: accountColor,
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 0,
            },
            headerTintColor: colors.white,
            headerTitleStyle: {
                fontFamily: 'Sora-Bold',
                fontSize: RFValue(18),
                color: colors.white,
            },
            headerLeft: () => (
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={dynamicStyles.backButton}
                >
                    <Icon name="arrow-back" size={RFValue(24)} color={colors.white} />
                </TouchableOpacity>
            ),
            headerRight: () => (
                <TouchableOpacity
                    onPress={() => navigation.navigate(screens.NewAccount, { account: accountData })}
                    style={{ padding: 8 }}
                >
                    <Text style={{ color: colors.white, fontFamily: 'Sora-SemiBold', fontSize: RFValue(16) }}>{t('common.edit')}</Text>
                </TouchableOpacity>
            ),
        });
    }, [navigation, accountData, accountColor, dynamicStyles.backButton]);

    // Determine which columns to show based on account type
    const getAccountTypeColumns = () => {
        if (!accountData?.type) return [];

        const termKey = `terms.${accountData.type.replace(/ /g, '').replace('-', '')}`;
        const translatedTerm = t(termKey);

        if (translatedTerm === termKey) return []; // Key not found

        const subTerms = translatedTerm.split(' - ');
        const keys = accountData.type.toLowerCase().replace(/ /g, '').split('-');

        if (subTerms.length === 2 && keys.length === 2) {
            return [
                { key: keys[0], label: subTerms[0] },
                { key: keys[1], label: subTerms[1] },
            ];
        }

        return [];
    };

    const accountColumns = getAccountTypeColumns();

    // Safely format amounts even when undefined/null and prepend account currency
    const formatAmount = (amount, code = accountData?.currency) => {
        const numeric = Number(amount ?? 0);
        return `${code} ${numeric.toLocaleString()}`;
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
                return date.toLocaleDateString(i18n.language, {
            month: 'short',
            day: 'numeric',
        });
    };

    // Update: Show up/down arrow based on type
    const getTransactionIcon = (type) => {
        if (
            type === 'cashIn' ||
            type === 'credit' ||
            type === 'receive' ||
            type === 'borrow'
        ) {
            return 'arrow-downward';
        }
        return 'arrow-upward';
    };

    // Update: Green for + types, red for - types
    const getTransactionColor = (type) => {
        if (
            type === 'cashIn' ||
            type === 'credit' ||
            type === 'receive' ||
            type === 'borrow'
        ) {
            return colors.success;
        }
        return colors.error;
    };

    // Update: Transaction not clickable
    const renderTransactionItem = useCallback(({ item }) => {
        if (!item) return null;

        const type = item?.type || 'debit';
        const transactionColor = getTransactionColor(type);
        const amount = parseFloat(item?.amount) || 0;
        const iconName = getTransactionIcon(type);

        const typeTextMap = {
            cashIn: t('terms.cashIn'),
            cashOut: t('terms.cashOut'),
            debit: t('terms.debit'),
            credit: t('terms.credit'),
            receive: t('terms.receive'),
            sendOut: t('terms.sendOut'),
            borrow: t('terms.borrow'),
            lend: t('terms.lend'),
        };
        const typeText = typeTextMap[type] || type;

        return (
            <View style={[dynamicStyles.transactionItem, { opacity: item._isValid !== false ? 1 : 0.5 }]}>
                <View style={[dynamicStyles.transactionIcon, { backgroundColor: transactionColor + '20' }]}>
                    <Icon
                        name={iconName}
                        size={RFValue(20)}
                        color={transactionColor}
                    />
                </View>
                <View style={dynamicStyles.transactionDetails}>
                    <Text style={dynamicStyles.transactionName} numberOfLines={1}>
                        {item?.purpose || t('accountDetailsScreen.noDescription')}
                    </Text>
                    <Text style={dynamicStyles.transactionDate}>
                        {item?.transactionDate ? formatDate(item.transactionDate) : t('accountDetailsScreen.noDate')}
                    </Text>
                </View>
                <View style={dynamicStyles.amountContainer}>
                    <Text
                        style={[
                            dynamicStyles.transactionAmount,
                            { color: transactionColor }
                        ]}
                    >
                        {['cashIn', 'credit', 'receive', 'borrow'].includes(type) ? '+' : '-'}
                        {formatAmount(amount, accountData?.currency)}
                    </Text>
                    <Text style={dynamicStyles.transactionType}>{typeText}</Text>
                </View>
            </View>
        );
    }, [accountData?.type, accountData?.currency, dynamicStyles]);

    // Add this function before the return statement
    const handleTransactionSave = useCallback(() => {
        loadTransactions();
        if (accountData?.id) {
            updateAccountBalance(accountData.id);
        }
    }, [loadTransactions, updateAccountBalance, accountData?.id]);

    // Update your render to use accountData instead of account
    if (!accountData) return null;

    return (
        <SafeAreaView style={dynamicStyles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dynamicStyles.scrollContent}>
                <View style={dynamicStyles.header}>
                    <View style={dynamicStyles.headerTop}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={dynamicStyles.backButton}>
                            <Icon name="arrow-back" size={RFValue(24)} color={colors.white} />
                        </TouchableOpacity>
                        <View style={dynamicStyles.headerTitleContainer}>
                            <Text style={dynamicStyles.accountName}>{accountData.name || t('common.account')}</Text>
                            {accountData.type && <Text style={dynamicStyles.accountType}>{t(`${accountData.type}`)}</Text>}
                        </View>
                    </View>

                    {/* Account Balance */}
                    <View style={dynamicStyles.balanceContainer}>
                        <Text style={dynamicStyles.balanceLabel}>{t('accountDetailsScreen.currentBalance')}</Text>
                        <Text style={dynamicStyles.balanceAmount}>
                            {accountData.currentBalance ? formatAmount(accountData.currentBalance) : formatAmount(0)}
                        </Text>
                    </View>

                    {/* Dynamic Type Columns */}
                    {accountColumns.length > 0 && (
                        <View style={dynamicStyles.typeContainer}>
                            {accountColumns.map((col, index) => (
                                <View key={index} style={dynamicStyles.typeBox}>
                                    <Text style={dynamicStyles.typeLabel}>{col.label}</Text>
                                    <Text style={dynamicStyles.typeAmount}>
                                        {formatAmount(accountData[col.key] || 0)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Recent Transactions */}
                <View style={dynamicStyles.transactionsSection}>
                    <View style={dynamicStyles.transactionsHeader}>
                        <Text style={dynamicStyles.sectionTitle}>{t('accountDetailsScreen.recentTransactions')}</Text>
                    </View>

                    {transactions.length > 0 ? (
                        transactions.map((transaction, index) => (
                            <View key={`${transaction.id}_${index}`}>
                                {renderTransactionItem({ item: transaction })}
                            </View>
                        ))
                    ) : (
                        <View style={dynamicStyles.noTransactions}>
                            <Icon name="receipt" size={RFValue(40)} color={colors.lightGray} />
                            <Text style={dynamicStyles.noTransactionsText}>{t('accountDetailsScreen.noTransactions')}</Text>
                            <Text style={dynamicStyles.noTransactionsSubtext}>
                                {t('accountDetailsScreen.addFirstTransaction')}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
            <TouchableOpacity
                style={[dynamicStyles.fab, { backgroundColor: accountColor }]}
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