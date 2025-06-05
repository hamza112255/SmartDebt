import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
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

const DashboardScreen = ({ navigation }) => {
    const accounts = [
        { id: 1, name: 'Main Account', balance: 30000, option: 'Debit - Credit' },
        { id: 2, name: 'Main Account 2', balance: 150000, option: 'Receive - Send Out' },
    ];

    const formatAmount = (amount) => {
        return `PKR ${amount.toLocaleString()}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.accountsSection}>
                    {accounts.map((account) => (
                        <TouchableOpacity
                            key={account.id}
                            style={styles.accountCard}
                            onPress={() => navigation.navigate(screens.AccountDetails, { account })}
                            activeOpacity={0.7}
                        >
                            <View style={styles.accountHeader}>
                                <View style={styles.accountInfo}>
                                    <Text style={styles.accountName}>{account.name}</Text>
                                    {account.id === 1 && <Text style={styles.primaryTag}>Primary</Text>}
                                    <View style={styles.currencyContainer}>
                                        <Icon name="flag" size={20} color={colors.primary} />
                                        <Text style={styles.currencyText}>PKR</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.moreButton}>
                                    <Icon name="more-vert" size={24} color={colors.gray} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.accountFooter}>
                                <Text style={styles.accountOption}>{account.option}</Text>
                                <Text style={styles.accountBalance}>{formatAmount(account.balance)}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity
                    style={styles.addWalletButton}
                    onPress={() => navigation.navigate(screens.NewAccount)}
                >
                    <Icon name="add" size={24} color={colors.gray} />
                    <Text style={styles.addWalletText}>Add another account</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    accountsSection: { padding: 18 },
    accountCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 5,
        borderLeftColor: colors.primary,
    },
    accountHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    accountInfo: { flex: 1 },
    accountName: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 4,
        fontFamily: 'Sora', // Using Sora for account names
    },
    primaryTag: {
        fontSize: 12,
        color: colors.primary,
        backgroundColor: '#fefcbf',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 4,
        fontFamily: 'Roboto', // Using Roboto for tags
    },
    currencyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencyText: {
        fontSize: 14,
        color: colors.gray,
        marginLeft: 6,
        fontFamily: 'Roboto',
    },
    moreButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    accountFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
    },
    accountOption: {
        fontSize: 16,
        color: colors.gray,
        fontWeight: '600',
        fontFamily: 'Roboto',
    },
    accountBalance: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.primary,
        fontFamily: 'Sora',
    },
    addWalletButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.gray,
        borderStyle: 'dashed',
        paddingVertical: 12,
        borderRadius: 8,
        margin: 18,
        backgroundColor: 'transparent',
    },
    addWalletText: {
        color: colors.gray,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
        fontFamily: 'Sora',
    },
});

export default DashboardScreen;