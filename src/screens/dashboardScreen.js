import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Modal,
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

const DashboardScreen = ({ navigation }) => {

    // FAB bottom sheet for add contact
    const [showAddContact, setShowAddContact] = useState(false);

    // For main account sheet
    const [showAccountSheet, setShowAccountSheet] = useState(false);

    // Example accounts
    const [accounts, setAccounts] = useState([
        { id: 1, name: 'Main Account', active: true },
        { id: 2, name: 'Main Account 2', active: false },
    ]);

    const handleSwitchAccount = (id) => {
        setAccounts(accounts.map(acc => ({
            ...acc,
            active: acc.id === id,
        })));
        setShowAccountSheet(false);
    };


    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => navigation.openDrawer()}
                    >
                        <Icon name="menu" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.accountSelector}
                        onPress={() => setShowAccountSheet(true)}
                    >
                        <Text style={styles.accountTitle}>
                            {accounts.find(acc => acc.active)?.name || 'Main Account'}
                        </Text>
                        <Icon name="arrow-drop-down" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.notificationButton}>
                        <Icon name="notifications" size={24} color={colors.primary} />
                        <View style={styles.notificationBadge}>
                            <Text style={styles.badgeText}>2</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Stats below main account */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Icon name="account-balance-wallet" size={28} color={colors.error} />
                        <Text style={styles.statTitle}>Debit</Text>
                        <Text style={styles.statValue}>PKRs 30.00</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Icon name="account-balance" size={28} color={colors.success} />
                        <Text style={styles.statTitle}>Credit</Text>
                        <Text style={styles.statValue}>PKRs 0.00</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Icon name="attach-money" size={28} color={colors.primary} />
                        <Text style={styles.statTitle}>Balance</Text>
                        <Text style={styles.statValue}>PKRs 30.00</Text>
                    </View>
                </View>
                {/* ...rest of dashboard */}
            </ScrollView>

            {/* Floating Add Contact Button (FAB) */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowAddContact(true)}
            >
                <Icon name="person-add" size={30} color={colors.white} />
            </TouchableOpacity>

            {/* Bottom Sheet for Add Contact */}
            <Modal
                animationType="slide"
                transparent
                visible={showAddContact}
                onRequestClose={() => setShowAddContact(false)}
            >
                <TouchableOpacity
                    style={styles.bottomSheetOverlay}
                    onPress={() => setShowAddContact(false)}
                    activeOpacity={1}
                >
                    <View style={styles.bottomSheet}>
                        <Text style={styles.sheetTitle}>Add Contact</Text>
                        <TouchableOpacity style={styles.sheetOption} onPress={() => { setShowAddContact(false); navigation.navigate(screens.NewContact); }}>
                            <Icon name="edit" size={22} color={colors.primary} />
                            <Text style={styles.sheetOptionText}>Add New Contact</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sheetOption} onPress={() => { setShowAddContact(false); /* Add your existing contact logic */ }}>
                            <Icon name="contacts" size={22} color={colors.primary} />
                            <Text style={styles.sheetOptionText}>Add from Existing</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Bottom Sheet for Main Account Switch */}
            <Modal
                animationType="slide"
                transparent
                visible={showAccountSheet}
                onRequestClose={() => setShowAccountSheet(false)}
            >
                <TouchableOpacity
                    style={styles.bottomSheetOverlay}
                    onPress={() => setShowAccountSheet(false)}
                    activeOpacity={1}
                >
                    <View style={styles.bottomSheet}>
                        <Text style={styles.sheetTitle}>Your Accounts</Text>
                        {accounts.map(acc => (
                            <TouchableOpacity
                                key={acc.id}
                                style={[
                                    styles.sheetOption,
                                    acc.active && { backgroundColor: colors.lightGray }
                                ]}
                                disabled={acc.active}
                                onPress={() => handleSwitchAccount(acc.id)}
                            >
                                <Icon
                                    name={acc.active ? "radio-button-checked" : "radio-button-unchecked"}
                                    size={22}
                                    color={acc.active ? colors.primary : colors.gray}
                                />
                                <Text style={[
                                    styles.sheetOptionText,
                                    acc.active && { color: colors.primary, fontWeight: 'bold' }
                                ]}>
                                    {acc.name} {acc.active ? "(Active)" : ""}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <View style={styles.sheetDivider} />
                        <TouchableOpacity style={styles.sheetOption} onPress={() => { navigation.navigate(screens.NewAccount); setShowAccountSheet(false); }}>
                            <Icon name="add-circle-outline" size={22} color={colors.primary} />
                            <Text style={styles.sheetOptionText}>Add New Account</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        backgroundColor: colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        justifyContent: 'space-between',
    },
    menuButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.lightGray,
        justifyContent: 'center', alignItems: 'center',
    },
    accountSelector: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.lightGray,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    accountTitle: {
        fontSize: 16, fontWeight: '700', color: colors.primary, marginRight: 4,
    },
    notificationButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.lightGray,
        justifyContent: 'center', alignItems: 'center',
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -2, right: -2,
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: colors.error,
        justifyContent: 'center', alignItems: 'center',
    },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: colors.white },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 10,
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 14,
        alignItems: 'center',
        marginHorizontal: 8,
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
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.primary,
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
    bottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.18)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 24,
        paddingVertical: 24,
        minHeight: 180,
        elevation: 12,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.gray,
        marginBottom: 18,
    },
    sheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: 10,
        marginBottom: 6,
    },
    sheetOptionText: {
        fontSize: 16,
        color: colors.primary,
        marginLeft: 12,
        fontWeight: '500',
    },
    sheetDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 10,
    },
});

export default DashboardScreen;