import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { screens } from '../constant/screens';

const { width } = Dimensions.get('window');

const colors = {
    primary: '#1e90ff',
    success: '#32cd32',
    error: '#ff4500',
    background: '#f5f5f5',
    white: '#ffffff',
    gray: '#666666',
    lightGray: '#e0e0e0',
    border: '#d3d3d3',
};

const CalendarScreen = ({ navigation }) => {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today); // Start with today selected
    const [showAccountSheet, setShowAccountSheet] = useState(false);
    const [accounts, setAccounts] = useState([
        { id: 1, name: 'Main Account', active: true },
        { id: 2, name: 'Main Account 2', active: false },
    ]);

    const transactions = [
        { id: 1, name: 'Ameer Hamza Office', type: 'Borrow Money', amount: 30.00, date: '2025-05-29', color: colors.success },
        { id: 2, name: 'Shop Loan', type: 'Lend Money', amount: 40.00, date: '2025-05-29', color: colors.error },
    ];

    const handleSwitchAccount = (id) => {
        setAccounts(accounts.map(acc => ({
            ...acc,
            active: acc.id === id,
        })));
        setShowAccountSheet(false);
    };

    const activeAccount = accounts.find(acc => acc.active) || accounts[0];

    const getDayOfWeek = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    };

    const markedDates = {};
    if (selectedDate) {
        markedDates[selectedDate] = {
            customStyles: {
                container: { borderColor: colors.primary, borderWidth: 2, borderRadius: 12, padding: 4 },
                text: { color: colors.gray, fontWeight: 'bold' },
            },
        };
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
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
                            {activeAccount.name}
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

                {/* Calendar */}
                <Calendar
                    style={styles.calendar}
                    theme={{
                        backgroundColor: colors.background,
                        calendarBackground: colors.background,
                        textSectionTitleColor: colors.gray,
                        dayTextColor: colors.gray,
                        textDisabledColor: colors.lightGray,
                        arrowColor: colors.gray,
                        monthTextColor: colors.gray,
                    }}
                    markedDates={markedDates}
                    onDayPress={(day) => setSelectedDate(day.dateString)}
                    hideArrows={false}
                    renderArrow={(direction) =>
                        direction === 'left' ? (
                            <Icon name="chevron-left" size={20} color={colors.gray} />
                        ) : (
                            <Icon name="chevron-right" size={20} color={colors.gray} />
                        )
                    }
                    dayComponent={({ date, state }) => {
                        const hasTransactions = transactions.some((t) => t.date === date.dateString);
                        const isSelected = date.dateString === selectedDate;
                        const dateTransactions = transactions.filter((t) => t.date === date.dateString);

                        let containerStyle = styles.dayContainer;
                        let textStyle = styles.dayText;

                        if (isSelected) {
                            containerStyle = [styles.dayContainer, styles.selectedDay];
                            textStyle = [styles.dayText, styles.selectedDayText];
                        }

                        if (state === 'disabled') {
                            textStyle = [textStyle, styles.disabledDayText];
                        }

                        return (
                            <TouchableOpacity
                                onPress={() => setSelectedDate(date.dateString)}
                                style={containerStyle}
                            >
                                {dateTransactions.length === 1 ? (
                                    <View style={styles.singleTransactionRow}>
                                        <Text style={textStyle}>{date.day}</Text>
                                        {hasTransactions && (
                                            <Text style={[styles.amountText, { color: dateTransactions[0].color }]}>
                                                {dateTransactions[0].amount.toFixed(2)}
                                            </Text>
                                        )}
                                    </View>
                                ) : (
                                    <View style={styles.multipleTransactionColumn}>
                                        <Text style={textStyle}>{date.day}</Text>
                                        {hasTransactions &&
                                            dateTransactions.map((t, index) => (
                                                <Text
                                                    key={index}
                                                    style={[styles.amountText, { color: t.color }]}
                                                >
                                                    {t.amount.toFixed(2)}
                                                </Text>
                                            ))}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statTitle}>Debit</Text>
                        <Text style={styles.statValue}>PKRs 30.00</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statTitle}>Credit</Text>
                        <Text style={styles.statValue}>PKRs 0.00</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statTitle}>Balance</Text>
                        <Text style={styles.statValue}>PKRs 30.00</Text>
                    </View>
                </View>

                {/* Transactions */}
                <View style={styles.transactions}>
                    <Text style={styles.transactionDate}>
                        {selectedDate} - {getDayOfWeek(selectedDate)}
                    </Text>
                    <Text style={styles.transactionTotal}>PKRs 30.00</Text>
                    {transactions
                        .filter((t) => t.date === selectedDate)
                        .map((transaction) => (
                            <View key={transaction.id} style={styles.transactionItem}>
                                <View style={styles.transactionIcon}>
                                    <Text style={styles.transactionInitial}>{transaction.name[0]}</Text>
                                </View>
                                <View style={styles.transactionDetails}>
                                    <Text style={styles.transactionName}>{transaction.name}</Text>
                                    <Text style={styles.transactionType}>{transaction.type}</Text>
                                </View>
                                <Text style={[styles.transactionAmount, { color: transaction.color }]}>
                                    PKRs {transaction.amount.toFixed(2)}
                                </Text>
                            </View>
                        ))}
                </View>
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate(screens.NewRecord)}>
                <Icon name="add" size={30} color={colors.white} />
            </TouchableOpacity>

            {/* Bottom Sheet for Account Selection */}
            <Modal
                animationType="slide"
                transparent
                visible={showAccountSheet}
                onRequestClose={() => setShowAccountSheet(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={() => setShowAccountSheet(false)}
                    activeOpacity={1}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Account</Text>
                        {accounts.map(acc => (
                            <TouchableOpacity
                                key={acc.id}
                                style={[
                                    styles.modalOption,
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
                                    styles.modalOptionText,
                                    acc.active && { color: colors.primary, fontWeight: 'bold' }
                                ]}>
                                    {acc.name} {acc.active ? "(Active)" : ""}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
        paddingBottom: 100, // Extra padding for scroll space
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 18,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        justifyContent: 'space-between',
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    accountSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.lightGray,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    accountTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
        marginRight: 4,
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
        color: colors.white,
    },
    calendar: {
        marginBottom: 16,
        maxHeight: 360, // Limit calendar height for more scroll space
    },
    dayContainer: {
        alignItems: 'center',
        padding: 4,
        borderRadius: 12,
        backgroundColor: 'transparent', // No background for unselected dates
        width: 32,
        height: 32,
        justifyContent: 'center',
    },
    selectedDay: {
        borderColor: colors.primary,
        borderWidth: 2,
        backgroundColor: 'transparent',
    },
    dayText: { color: colors.gray, fontSize: 12 },
    disabledDayText: { color: colors.lightGray },
    selectedDayText: { color: colors.gray, fontWeight: 'bold' },
    amountText: { color: colors.primary, fontSize: 10, fontWeight: 'bold' },
    singleTransactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    multipleTransactionColumn: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 16,
        backgroundColor: colors.background,
    },
    statCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        width: '30%',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
    },
    statTitle: { color: colors.gray, fontSize: 12, marginBottom: 4 },
    statValue: { color: colors.primary, fontSize: 14, fontWeight: 'bold' },
    transactions: {
        padding: 16,
        paddingBottom: 80, // Extra padding to avoid FAB overlap
        backgroundColor: colors.background,
    },
    transactionDate: { fontSize: 16, color: colors.gray, marginBottom: 4 },
    transactionTotal: { fontSize: 14, color: colors.success, fontWeight: 'bold', marginBottom: 8 },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: colors.white,
        borderRadius: 8,
        marginBottom: 8,
        elevation: 1,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionInitial: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
    transactionDetails: { flex: 1, marginLeft: 12 },
    transactionName: { color: colors.gray, fontSize: 14 },
    transactionType: { color: colors.primary, fontSize: 12 },
    transactionAmount: { color: colors.success, fontSize: 14, fontWeight: 'bold' },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
        backgroundColor: colors.primary,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 3 },
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.gray, marginBottom: 16 },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 6,
    },
    modalOptionText: {
        color: colors.primary,
        fontSize: 16,
        marginLeft: 12,
        fontWeight: '500',
    },
});

export default CalendarScreen;