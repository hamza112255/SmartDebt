import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';

const colors = {
    primary: '#1e90ff',
    success: '#1e90ff',
    error: '#ff4500',
    background: '#f5f5f5',
    white: '#ffffff',
    gray: '#666666',
    lightGray: '#e0e0e0',
    border: '#d3d3d3',
    activeBorder: '#1e90ff',
};

const NewRecordScreen = ({ navigation }) => {
    const [transactionType, setTransactionType] = useState('Debit');
    const [date, setDate] = useState(new Date('2025-05-30'));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [time, setTime] = useState(new Date('2025-05-30T15:30:00'));
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [contactPerson, setContactPerson] = useState('');
    const [purpose, setPurpose] = useState('');
    const [amount, setAmount] = useState('0.00');
    const [currency, setCurrency] = useState('PKR');
    const [remark, setRemark] = useState('');

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    const onTimeChange = (event, selectedTime) => {
        const currentTime = selectedTime || time;
        setShowTimePicker(Platform.OS === 'ios');
        setTime(currentTime);
    };

    const formatDate = (date) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
        return date.toLocaleDateString('en-US', options).replace(',', '');
    };

    const formatTime = (time) => {
        return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
                    <Text style={styles.headerTitle}>New Record</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Debit/Credit Toggle */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            transactionType === 'Debit' && styles.activeToggle,
                        ]}
                        onPress={() => setTransactionType('Debit')}
                    >
                        <Text
                            style={[
                                styles.toggleText,
                                transactionType === 'Debit' && styles.activeToggleText,
                            ]}
                        >
                            Debit
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            transactionType === 'Credit' && styles.activeToggle,
                        ]}
                        onPress={() => setTransactionType('Credit')}
                    >
                        <Text
                            style={[
                                styles.toggleText,
                                transactionType === 'Credit' && styles.activeToggleText,
                            ]}
                        >
                            Credit
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Date and Time */}
                <View style={styles.inputRow}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Date</Text>
                        <TouchableOpacity
                            style={[
                                styles.input,
                                showDatePicker && styles.activeInput,
                            ]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Icon name="calendar-today" size={20} color={colors.gray} style={styles.inputIcon} />
                            <Text style={styles.inputText}>{formatDate(date)}</Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={date}
                                mode="date"
                                display="default"
                                onChange={onDateChange}
                            />
                        )}
                    </View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Time</Text>
                        <TouchableOpacity
                            style={[
                                styles.input,
                                showTimePicker && styles.activeInput,
                            ]}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Icon name="access-time" size={20} color={colors.gray} style={styles.inputIcon} />
                            <Text style={styles.inputText}>{formatTime(time)}</Text>
                        </TouchableOpacity>
                        {showTimePicker && (
                            <DateTimePicker
                                value={time}
                                mode="time"
                                display="default"
                                onChange={onTimeChange}
                            />
                        )}
                    </View>
                </View>

                {/* Contact Person */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        Contact Person <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity style={styles.input}>
                        <Text style={styles.inputText}>
                            {contactPerson || 'Contact Person'}
                        </Text>
                        <Icon name="chevron-right" size={20} color={colors.gray} />
                    </TouchableOpacity>
                </View>

                {/* Purpose */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        Purpose <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Purpose"
                        placeholderTextColor={colors.gray}
                        value={purpose}
                        onChangeText={setPurpose}
                    />
                </View>

                {/* Amount */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                        Amount <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.amountContainer}>
                        <TextInput
                            style={[styles.input, styles.amountInput]}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                        <TouchableOpacity style={styles.currencyButton}>
                            <Text style={styles.currencyText}>🇵🇰  {currency}</Text>
                            <Icon name="arrow-drop-down" size={20} color={colors.gray} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Remark */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Remark</Text>
                    <TextInput
                        style={[styles.input, styles.remarkInput]}
                        placeholder="Write remark here..."
                        placeholderTextColor={colors.gray}
                        value={remark}
                        onChangeText={setRemark}
                        multiline
                    />
                </View>

                {/* Attachments */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Attachments</Text>
                    <TouchableOpacity style={styles.attachmentButton}>
                        <Icon name="add" size={24} color={colors.gray} />
                    </TouchableOpacity>
                </View>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
            </ScrollView>
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
        marginLeft: 16,
    },
    placeholder: {
        width: 40,
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 10,
        marginHorizontal: 5,
        borderRadius: 8,
        backgroundColor: colors.white,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
    },
    activeToggle: { backgroundColor: colors.success },
    toggleText: { fontSize: 16, color: colors.gray },
    activeToggleText: { color: colors.white, fontWeight: 'bold' },
    inputRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
    inputContainer: { marginBottom: 16, paddingHorizontal: 16, flex: 1 },
    label: { fontSize: 14, color: colors.gray, marginBottom: 8 },
    required: { color: colors.error },
    input: {
        backgroundColor: colors.white,
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeInput: { borderColor: colors.activeBorder },
    inputIcon: { marginRight: 8 },
    inputText: { color: colors.gray, fontSize: 14, flex: 1 },
    amountContainer: { flexDirection: 'row', alignItems: 'center' },
    amountInput: { flex: 1, marginRight: 8 },
    currencyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.lightGray,
        borderRadius: 8,
        padding: 8,
    },
    currencyText: { color: colors.gray, marginRight: 4 },
    remarkInput: { height: 80, textAlignVertical: 'top' },
    attachmentButton: {
        backgroundColor: colors.white,
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        margin: 16,
    },
    saveButtonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
});

export default NewRecordScreen;