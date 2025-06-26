import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { screens } from '../constant/screens';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { getAllObjects, realm } from '../realm';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import moment from 'moment';

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
    const { t } = useTranslation();

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
            const realmTransactions = getAllObjects('Transaction')
                ?.filtered('accountId == $0', accountId)
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
            setStats(calculateStats(transactionsByDate[selectedDate] || [], latestAcc));
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }, [selectedDate, accountMap, selectedAccount]);

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
                    setSelectedAccount({...refreshedAccount});
                }
            }
        }, [selectedAccount?.id, realm])
    );

    useEffect(() => {
        if (selectedAccount?.id) {
            loadTransactions(selectedAccount.id);
        }
    }, [selectedAccount?.id, selectedDate, loadTransactions]);

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
        const baseBalance = account?.currentBalance || 0;
        const transactionStats = transArr.reduce((acc, transaction) => {
            const amount = parseFloat(transaction.amount) || 0;
            if (['cash_in', 'receive', 'borrow', 'credit'].includes(transaction.type)) {
                acc.credit += amount;
            } else if (['cash_out', 'send_out', 'lend', 'debit'].includes(transaction.type)) {
                acc.debit += amount;
            }
            if (transaction.type === 'cash_in') acc.cash_in += amount;
            else if (transaction.type === 'cash_out') acc.cash_out += amount;
            else if (transaction.type === 'receive') acc.receive += amount;
            else if (transaction.type === 'send_out') acc.send_out += amount;
            else if (transaction.type === 'borrow') acc.borrow += amount;
            else if (transaction.type === 'lend') acc.lend += amount;
            else if (transaction.type === 'credit') acc.creditType += amount;
            else if (transaction.type === 'debit') acc.debitType += amount;
            return acc;
        }, {
            credit: 0, debit: 0, cash_in: 0, cash_out: 0, receive: 0,
            send_out: 0, borrow: 0, lend: 0, creditType: 0, debitType: 0,
        });
        return { ...transactionStats, balance: baseBalance };
    };

    const getStatLabel = (side, account) => {
        if (!account?.type) return side === 'left' ? t('terms.debit') : t('terms.credit');
        
        // Get the translated type name
        const typeName = t(`accountTypes.${account.type}`);
        
        // Split into parts if it contains a dash
        if (typeName.includes(' - ')) {
            const [left, right] = typeName.split(' - ');
            return side === 'left' ? left : right;
        }
        
        // Fallback for simple types
        return side === 'left' ? t('terms.debit') : t('terms.credit');
    };

    const getStatValue = (side, account, stats) => {
        if (account?.type === 'cash_in_out') {
            return side === 'left' ? stats.cash_in : stats.cash_out;
        }
        if (account?.type === 'recieve_send_out') {
            return side === 'left' ? stats.recieve : stats.send_out;
        }
        if (account?.type === 'borrow_lend') {
            return side === 'left' ? stats.borrow : stats.lend;
        }
        return side === 'left' ? stats.credit : stats.debit;
    };

    const currency = safeGet(selectedAccount, 'currency', 'PKR');
    const currentBalance = selectedAccount?.id && accountMap[selectedAccount.id]?.currentBalance !== undefined
        ? Number(accountMap[selectedAccount.id]?.currentBalance)
        : 0;

    const statForDate = currentBalance;

    return (
        <SafeAreaView style={styles.container}>
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
                        const hasTransactions = safeGetTransactions(date.dateString).length > 0;
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
                            {currency}{currentBalance < 0 && ' -'}{Math.abs(currentBalance).toFixed(2)}
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
                                {currency}{statForDate < 0 && ' -'}{Math.abs(statForDate).toFixed(2)}
                            </Text>
                        )}
                    </View>

                    {safeGetTransactions(selectedDate)?.length === 0 ? (
                        <View style={styles.noTransactions}>
                            <Icon name="receipt" size={RFValue(40)} color={colors.lightGray} />
                            <Text style={styles.noTransactionsText}>{t('calendarScreen.noTransactions')}</Text>
                        </View>
                    ) : (
                        safeGetTransactions(selectedDate).map(transaction => (
                            <TouchableOpacity
                                key={safeGet(transaction, 'id', Math.random().toString())}
                                style={styles.transactionItem}
                                onPress={() => navigation.navigate(
                                    screens.NewRecord,
                                    {
                                        transactionId: safeGet(transaction, 'id'),
                                        accountId: selectedAccount.id,
                                        userId: selectedAccount.userId,
                                        onSave: loadAccountsAndMap,
                                        sourceScreen: 'calendar'
                                    }
                                )}
                            >
                                <View style={[
                                    styles.transactionIcon,
                                    { backgroundColor: safeGet(transaction, 'color', colors.lightGray) + '20' }
                                ]}>
                                    <Icon
                                        name={['cash_in', 'receive', 'borrow', 'credit'].includes(safeGet(transaction, 'type')) ? "arrow-downward" : "arrow-upward"}
                                        size={RFValue(16)}
                                        color={safeGet(transaction, 'color', colors.lightGray)}
                                    />
                                </View>
                                <View style={styles.transactionDetails}>
                                    <Text style={styles.transactionName} numberOfLines={1}>
                                        {safeGet(transaction, 'name', 'No description')}
                                    </Text>
                                    <Text style={styles.transactionType}>
                                        {t(`terms.${transaction.type}`)} • {safeGet(transaction, 'contactName', t('common.noContact'))}
                                    </Text>
                                </View>
                                <Text
                                    style={[
                                        styles.transactionAmount,
                                        { color: safeGet(transaction, 'color', colors.lightGray) }
                                    ]}
                                >
                                    {['cash_in', 'receive', 'borrow', 'credit'].includes(safeGet(transaction, 'type')) ? '+' : '-'}
                                    {currency} {Number(safeGet(transaction, 'amount', 0)).toFixed(2)}
                                </Text>
                            </TouchableOpacity>
                        ))
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: wp(2.5),
        padding: wp(3.5),
        marginBottom: hp(1),
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    transactionIcon: {
        width: wp(10),
        height: wp(10),
        borderRadius: wp(5),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: wp(3),
    },
    transactionDetails: {
        flex: 1,
        marginRight: wp(2),
    },
    transactionName: {
        fontSize: RFValue(14),
        fontFamily: 'Sora-SemiBold',
        color: colors.gray,
        marginBottom: hp(0.25),
    },
    transactionType: {
        fontSize: RFValue(12),
        fontFamily: 'Sora-Regular',
        color: colors.lightGray,
    },
    transactionAmount: {
        fontSize: RFValue(14),
        fontFamily: 'Sora-SemiBold',
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
});

export default CalendarScreen;