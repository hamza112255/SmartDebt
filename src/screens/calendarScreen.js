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

const CalendarScreen = ( { navigation }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const transactions = [
        { id: 1, name: 'Ameer Hamza Office', type: 'Borrow Money', amount: 'PKRs 30.00', date: '2025-05-29' },
    ];

    // Highlight only the current date (May 30, 2025) and show amount below dates with transactions
    const markedDates = {};
    transactions.forEach((t) => {
        markedDates[t.date] = {
            customStyles: {
                container: { backgroundColor: colors.white },
                text: { color: colors.gray },
            },
        };
    });

    // Highlight today's date (May 30, 2025)
    markedDates['2025-05-30'] = {
        selected: true,
        selectedColor: colors.primary,
        customStyles: {
            container: { backgroundColor: colors.primary },
            text: { color: colors.white },
        },
    };

    // If the selected date is not today, ensure it doesn't override the today's highlight
    if (selectedDate !== '2025-05-30') {
        markedDates[selectedDate] = {
            ...markedDates[selectedDate],
            selected: true,
            selectedColor: colors.lightGray,
        };
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Calendar</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Calendar */}
                <Calendar
                    style={styles.calendar}
                    theme={{
                        backgroundColor: colors.background,
                        calendarBackground: colors.background,
                        textSectionTitleColor: colors.gray,
                        selectedDayBackgroundColor: colors.primary,
                        selectedDayTextColor: colors.white,
                        todayTextColor: colors.gray,
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
                    dayComponent={({ date, state, marking }) => {
                        const hasTransaction = transactions.some((t) => t.date === date.dateString);
                        return (
                            <TouchableOpacity
                                onPress={() => setSelectedDate(date.dateString)}
                                style={[
                                    styles.dayContainer,
                                    marking?.selected && styles.selectedDay,
                                    date.dateString === '2025-05-30' && styles.todayDay,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.dayText,
                                        state === 'disabled' && styles.disabledDayText,
                                        marking?.selected && styles.selectedDayText,
                                        date.dateString === '2025-05-30' && styles.todayDayText,
                                    ]}
                                >
                                    {date.day}
                                </Text>
                                {hasTransaction && (
                                    <Text style={styles.amountText}>30.00</Text>
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
                    <Text style={styles.transactionDate}>{selectedDate} - Thursday</Text>
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
                                <Text style={styles.transactionAmount}>{transaction.amount}</Text>
                            </View>
                        ))}
                </View>
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab} onPress={()=>navigation.navigate(screens.NewRecord)}>
                <Icon name="add" size={30} color={colors.white} />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 18,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
        marginLeft: 16,
    },
    placeholder: {
        width: 40,
    },
    calendar: { marginBottom: 16 },
    dayContainer: { alignItems: 'center', padding: 5 },
    selectedDay: { backgroundColor: colors.lightGray, borderRadius: 12 },
    todayDay: { backgroundColor: colors.primary, borderRadius: 12 },
    dayText: { color: colors.gray, fontSize: 12 },
    disabledDayText: { color: colors.lightGray },
    selectedDayText: { color: colors.gray },
    todayDayText: { color: colors.white },
    amountText: { color: colors.primary, fontSize: 10, fontWeight: 'bold' },
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
    transactions: { padding: 16, backgroundColor: colors.background },
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
    modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.gray, marginBottom: 16 },
    modalOption: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.lightGray, borderRadius: 8 },
    modalOptionText: { color: colors.primary, fontSize: 16, marginLeft: 12 },
});

export default CalendarScreen;