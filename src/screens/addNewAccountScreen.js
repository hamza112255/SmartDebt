import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    ScrollView,
    Modal,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';


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

const AccountNameInput = memo(({ accountName, setAccountName }) => {
    const textInputRef = useRef(null);

    const handleTextChange = useCallback((text) => {
        setAccountName(text);
    }, [setAccountName]);

    useEffect(() => {
        console.log('AccountNameInput re-rendered, accountName:', accountName);
    }, [accountName]);

    return (
        <View style={styles.inputContainer}>
            <Text style={styles.settingTitle}>
                Account Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
                ref={textInputRef}
                style={styles.textInput}
                value={accountName}
                onChangeText={handleTextChange}
                placeholder="Enter account name"
                placeholderTextColor={colors.gray}
                autoFocus={false}
                returnKeyType="default"
                blurOnSubmit={false}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                onFocus={() => {
                    console.log('TextInput focused');
                    textInputRef.current?.focus();
                }}
                onBlur={() => console.log('TextInput blurred')}
            />
        </View>
    );
});

const AddAccountScreen = ({ navigation }) => {
    const [accountName, setAccountName] = useState('');
    const [language, setLanguage] = useState('English');
    const [currency, setCurrency] = useState(currencies?.[0] ?? { code: 'USD', flag: '🇺🇸' });
    const [terms, setTerms] = useState('Cash In - Cash Out');
    const [showLanguageSheet, setShowLanguageSheet] = useState(false);
    const [showCurrencySheet, setShowCurrencySheet] = useState(false);
    const [showTermsSheet, setShowTermsSheet] = useState(false);

    const languages = [
        'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
        'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Urdu',
    ];

    const currencies = [
        { code: 'USD', name: 'US Dollar', flag: '🇺🇸', country: 'United States' },
        { code: 'EUR', name: 'Euro', flag: '🇪🇺', country: 'European Union' },
        { code: 'GBP', name: 'British Pound', flag: '🇬🇧', country: 'United Kingdom' },
        { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵', country: 'Japan' },
        { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺', country: 'Australia' },
        { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦', country: 'Canada' },
        { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', country: 'Switzerland' },
        { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳', country: 'China' },
        { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪', country: 'Sweden' },
        { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿', country: 'New Zealand' },
        { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽', country: 'Mexico' },
        { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬', country: 'Singapore' },
        { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰', country: 'Hong Kong' },
        { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴', country: 'Norway' },
        { code: 'PKR', name: 'Pakistani Rupee', flag: '🇵🇰', country: 'Pakistan' },
        { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳', country: 'India' },
    ];

    const termOptions = [
        'Cash In - Cash Out', 'Debit - Credit', 'Receive - Send Out', 'Borrow - Lend',
    ];

    const handleAddAccount = () => {
        if (accountName.trim()) {
            navigation.goBack();
        }
    };

    const BottomSheet = ({ visible, onClose, title, children }) => (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.bottomSheetOverlay}
                onPress={onClose}
                activeOpacity={1}
            >
                <View style={styles.bottomSheet}>
                    <Text style={styles.sheetTitle}>{title}</Text>
                    {children}
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const CurrencyItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.sheetOption,
                currency.code === item.code && { backgroundColor: colors.lightGray }
            ]}
            onPress={() => {
                setCurrency(item);
                setShowCurrencySheet(false);
            }}
        >
            <Text style={styles.currencyFlag}>{item.flag}</Text>
            <View style={styles.currencyInfo}>
                <Text style={styles.sheetOptionText}>{item.code}</Text>
                <Text style={styles.currencyName}>{item.name}</Text>
            </View>
            {currency.code === item.code && (
                <Icon name="check" size={22} color={colors.primary} />
            )}
        </TouchableOpacity>
    );

    const SettingRow = ({ title, value, onPress, isRequired = false, icon }) => (
        <TouchableOpacity style={styles.settingRow} onPress={onPress}>
            <View style={styles.settingContent}>
                <View style={styles.settingLeft}>
                    <Text style={styles.settingTitle}>
                        {title} {isRequired && <Text style={styles.required}>*</Text>}
                    </Text>
                    <View style={styles.settingValue}>
                        {icon && <View style={styles.iconContainer}>{icon}</View>}
                        <Text style={styles.sheetOptionText}>{value}</Text>
                    </View>
                </View>
                <Icon name="chevron-right" size={24} color={colors.gray} />
            </View>
        </TouchableOpacity>
    );

    const CurrencyIcon = () => (
        <Text style={styles.currencyFlag}>{currency.flag}</Text>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.flex}>
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.goBack()}
                            >
                                <Icon name="arrow-back" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Add New Account</Text>
                            <View style={styles.placeholder} />
                        </View>
                        <AccountNameInput
                            accountName={accountName}
                            setAccountName={setAccountName}
                        />
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.settingsContainer}>
                                <SettingRow
                                    title="Language"
                                    value={language}
                                    onPress={() => setShowLanguageSheet(true)}
                                    isRequired={true}
                                />
                                <SettingRow
                                    title="Currency"
                                    value={currency.code}
                                    onPress={() => setShowCurrencySheet(true)}
                                    isRequired={true}
                                    icon={<CurrencyIcon />}
                                />
                                <SettingRow
                                    title="Terms"
                                    value={terms}
                                    onPress={() => setShowTermsSheet(true)}
                                    isRequired={true}
                                />
                            </View>
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.getStartedButton,
                                        !accountName.trim() && styles.disabledButton
                                    ]}
                                    onPress={handleAddAccount}
                                    disabled={!accountName.trim()}
                                >
                                    <Text style={styles.buttonText}>Add Account</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>

                {/* Language Bottom Sheet */}
                <BottomSheet
                    visible={showLanguageSheet}
                    onClose={() => setShowLanguageSheet(false)}
                    title="Select Language"
                >
                    <FlatList
                        data={languages}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.sheetOption,
                                    language === item && { backgroundColor: colors.lightGray }
                                ]}
                                onPress={() => {
                                    setLanguage(item);
                                    setShowLanguageSheet(false);
                                }}
                            >
                                <Text style={[
                                    styles.sheetOptionText,
                                    language === item && { color: colors.primary, fontWeight: 'bold' }
                                ]}>
                                    {item}
                                </Text>
                                {language === item && (
                                    <Icon name="check" size={22} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        )}
                        showsVerticalScrollIndicator={false}
                    />
                </BottomSheet>

                {/* Terms Bottom Sheet */}
                <BottomSheet
                    visible={showTermsSheet}
                    onClose={() => setShowTermsSheet(false)}
                    title="Select Terms"
                >
                    {termOptions.map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.sheetOption,
                                terms === option && { backgroundColor: colors.lightGray }
                            ]}
                            onPress={() => {
                                setTerms(option);
                                setShowTermsSheet(false);
                            }}
                        >
                            <Text style={[
                                styles.sheetOptionText,
                                terms === option && { color: colors.primary, fontWeight: 'bold' }
                            ]}>
                                {option}
                            </Text>
                            {terms === option && (
                                <Icon name="check" size={22} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </BottomSheet>

                {/* Currency Bottom Sheet */}
                <BottomSheet
                    visible={showCurrencySheet}
                    onClose={() => setShowCurrencySheet(false)}
                    title="Select Currency"
                >
                    <FlatList
                        data={currencies}
                        keyExtractor={(item) => item.code}
                        renderItem={({ item }) => <CurrencyItem item={item} />}
                        showsVerticalScrollIndicator={false}
                    />
                </BottomSheet>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    flex: {
        flex: 1,
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
    placeholder: {
        width: 40,
    },
    inputContainer: {
        backgroundColor: colors.white,
        borderRadius: 14,
        paddingVertical: 20,
        paddingHorizontal: 18,
        marginBottom: 12,
        marginHorizontal: 18,
        marginTop: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
    },
    settingsContainer: {
        paddingHorizontal: 18,
        paddingTop: 0,
    },
    settingRow: {
        backgroundColor: colors.white,
        borderRadius: 14,
        paddingVertical: 20,
        paddingHorizontal: 18,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
    },
    settingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingLeft: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 13,
        color: colors.gray,
        fontWeight: '600',
        marginBottom: 8,
    },
    required: {
        color: colors.error,
    },
    settingValue: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: 12,
    },
    sheetOptionText: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: '500',
    },
    textInput: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: '600',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    buttonContainer: {
        paddingHorizontal: 18,
        paddingVertical: 32,
    },
    getStartedButton: {
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 3 },
    },
    disabledButton: {
        backgroundColor: colors.gray,
        opacity: 0.6,
    },
    buttonText: {
        color: colors.white,
        fontSize: 18,
        fontWeight: '700',
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
    currencyFlag: {
        fontSize: 24,
        marginRight: 12,
    },
    currencyInfo: {
        flex: 1,
    },
    currencyName: {
        fontSize: 14,
        color: colors.gray,
        marginTop: 2,
    },
});

export default AddAccountScreen;