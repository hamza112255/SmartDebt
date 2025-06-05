import { useState } from 'react';
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

const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    error: '#dc2626',
    background: '#f8fafc',
    white: '#ffffff',
    gray: '#6b7280',
    lightGray: '#f3f4f6',
    border: '#e5e7eb',
};

const AccountDetailScreen = ({ navigation, route }) => {
    const { account } = route.params;

    // Sample transaction data
    const [transactions] = useState([
        {
            id: 1,
            type: 'credit',
            amount: 5000,
            description: 'Salary Credit',
            date: '2025-06-03',
            time: '10:30 AM',
            balance: 30000,
        },
        {
            id: 2,
            type: 'debit',
            amount: 1500,
            description: 'ATM Withdrawal',
            date: '2025-06-02',
            time: '02:15 PM',
            balance: 25000,
        },
        {
            id: 3,
            type: 'debit',
            amount: 800,
            description: 'Online Shopping',
            date: '2025-06-01',
            time: '07:45 PM',
            balance: 26500,
        },
        {
            id: 4,
            type: 'credit',
            amount: 2000,
            description: 'Transfer from John',
            date: '2025-05-31',
            time: '11:20 AM',
            balance: 27300,
        },
        {
            id: 5,
            type: 'debit',
            amount: 300,
            description: 'Mobile Recharge',
            date: '2025-05-30',
            time: '09:10 AM',
            balance: 25300,
        },
    ]);

    const formatAmount = (amount) => {
        return `PKR ${amount.toLocaleString()}`;
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    const getTransactionIcon = (type) => {
        return type === 'credit' ? 'arrow-downward' : 'arrow-upward';
    };

    const getTransactionColor = (type) => {
        return type === 'credit' ? colors.success : colors.error;
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-back" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{account.name}</Text>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Icon name="account-balance-wallet" size={28} color={colors.error} />
                        <Text style={styles.statTitle}>Debit</Text>
                        <Text style={styles.statValue}>PKR 2,600</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Icon name="account-balance" size={28} color={colors.success} />
                        <Text style={styles.statTitle}>Credit</Text>
                        <Text style={styles.statValue}>PKR 7,000</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Icon name="attach-money" size={28} color={colors.primary} />
                        <Text style={styles.statTitle}>Balance</Text>
                        <Text style={styles.statValue}>{formatAmount(account.balance)}</Text>
                    </View>
                </View>

                {/* Recent Transactions */}
                <View style={styles.transactionsSection}>
                    <View style={styles.transactionsHeader}>
                        <Text style={styles.sectionTitle}>Recent Transactions</Text>
                        <TouchableOpacity>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {transactions.map((transaction) => (
                        <View key={transaction.id} style={styles.transactionItem}>
                            <View style={[
                                styles.transactionIcon,
                                { backgroundColor: getTransactionColor(transaction.type) + '20' }
                            ]}>
                                <Icon
                                    name={getTransactionIcon(transaction.type)}
                                    size={20}
                                    color={getTransactionColor(transaction.type)}
                                />
                            </View>
                            <View style={styles.transactionDetails}>
                                <Text style={styles.transactionDescription}>
                                    {transaction.description}
                                </Text>
                                <Text style={styles.transactionDate}>
                                    {formatDate(transaction.date)} • {transaction.time}
                                </Text>
                            </View>
                            <View style={styles.transactionAmount}>
                                <Text style={[
                                    styles.transactionAmountText,
                                    { color: getTransactionColor(transaction.type) }
                                ]}>
                                    {transaction.type === 'credit' ? '+' : '-'}{formatAmount(transaction.amount)}
                                </Text>
                                <Text style={styles.transactionBalance}>
                                    Bal: {formatAmount(transaction.balance)}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Floating Add Transaction Button (FAB) */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate(screens.NewTransaction)}
            >
                <Icon name="add" size={30} color={colors.white} />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background
    },
    header: {
        backgroundColor: colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        justifyContent: 'flex-start',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
    },
    notificationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.error,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.white
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 10,
        gap: 10,
        paddingHorizontal: 18,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 14,
        alignItems: 'center',
        paddingVertical: 22,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
    },
    statTitle: {
        fontSize: 13,
        color: colors.gray,
        marginTop: 6,
        marginBottom: 2,
        fontWeight: '600',
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primary,
    },
    transactionsSection: {
        paddingHorizontal: 18,
        paddingBottom: 100,
    },
    transactionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray,
        marginBottom: 16,
    },
    viewAllText: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '600',
    },
    transactionItem: {
        backgroundColor: colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowOffset: { width: 0, height: 1 },
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionDescription: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
        marginBottom: 4,
    },
    transactionDate: {
        fontSize: 12,
        color: colors.gray,
    },
    transactionAmount: {
        alignItems: 'flex-end',
    },
    transactionAmountText: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    transactionBalance: {
        fontSize: 11,
        color: colors.gray,
    },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 32,
        backgroundColor: colors.primary,
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 3 },
    },
});

export default AccountDetailScreen;