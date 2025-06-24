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
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { createObject, updateObject, getAllObjects } from '../realm';
import uuid from 'react-native-uuid';
import { useTranslation } from 'react-i18next';

const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    error: '#dc2626',
    background: '#f8fafc',
    white: '#ffffff',
    gray: '#6b7280',
    lightGray: '#e0e0e0',
    border: '#e5e7eb',
    text: '#1e293b',
};

const AccountNameInput = memo(({ accountName, setAccountName, t }) => {
    const textInputRef = useRef(null);

    const handleTextChange = useCallback((text) => {
        setAccountName(text);
    }, [setAccountName]);

    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>
                {t('addNewAccountScreen.accountName')} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
                ref={textInputRef}
                style={styles.input}
                value={accountName}
                onChangeText={handleTextChange}
                placeholder={t('addNewAccountScreen.placeholders.accountName')}
                placeholderTextColor={colors.gray}
                autoFocus={false}
                returnKeyType="default"
                blurOnSubmit={false}
                autoCapitalize="words"
                autoCorrect={false}
                keyboardType="default"
            />
        </View>
    );
});

const AddAccountScreen = ({ navigation, route }) => {
    const { t, i18n } = useTranslation();
    const [accountName, setAccountName] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [terms, setTerms] = useState('cash_in_out');
    const [showCurrencySheet, setShowCurrencySheet] = useState(false);
    const [showTermsSheet, setShowTermsSheet] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Fetch currencies from Realm
        const currencyElements = getAllObjects('CodeListElement')
            .filtered('codeListName == "currencies" && active == true')
            .sorted('sortOrder');
        
        setCurrencies(Array.from(currencyElements));
        
        // Realm change listener
        const listener = () => {
            const updatedCurrencies = getAllObjects('CodeListElement')
                .filtered('codeListName == "currencies" && active == true')
                .sorted('sortOrder');
            setCurrencies(Array.from(updatedCurrencies));
        };
        
        currencyElements.addListener(listener);
        return () => currencyElements.removeListener(listener);
    }, []);

    const existingAccount = route?.params?.account ?? null;

    useEffect(() => {
        if (existingAccount) {
            setAccountName(existingAccount.name);
            setCurrency(existingAccount.currency || 'USD');
            setTerms(existingAccount.type);
        }
    }, [existingAccount]);

    const termOptions = [
        {code: 'cash_in_out', display: t('terms.cash_inCashOut')},
        {code: 'debit_credit', display: t('terms.debitCredit')},
        {code: 'receive_send', display: t('terms.receiveSendOut')},
        {code: 'borrow_lend', display: t('terms.borrowLend')}
    ];

    const getTranslatedTerm = (typeCode) => {
        const term = termOptions.find(t => t.code === typeCode);
        return term ? term.display : t('terms.cash_inCashOut');
    };

    const handleAddAccount = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const now = new Date();
            // Determine current user id (create default user if none)
            const users = getAllObjects('User');
            let currentUserId = users.length > 0 ? users[0].id : 'localUser';

            const data = {
                id: existingAccount ? existingAccount.id : uuid.v4(),
                name: accountName.trim(),
                currency: currency,
                type: terms,
                userId: currentUserId,
                isPrimary: existingAccount ? existingAccount.isPrimary : false,
                currentBalance: existingAccount ? existingAccount.currentBalance : 0,
                language: i18n.language,
                // Initialize all type-based amounts to 0
                cash_in: existingAccount ? existingAccount.cash_in : 0,
                cash_out: existingAccount ? existingAccount.cash_out : 0,
                debit: existingAccount ? existingAccount.debit : 0,
                credit: existingAccount ? existingAccount.credit : 0,
                receive: existingAccount ? existingAccount.receive : 0,
                send_out: existingAccount ? existingAccount.send_out : 0,
                borrow: existingAccount ? existingAccount.borrow : 0,
                lend: existingAccount ? existingAccount.lend : 0,
                isActive: true,
                createdOn: existingAccount ? existingAccount.createdOn : now,
                updatedOn: now,
                syncStatus: 'pending',
                needsUpload: true,
            };

            // Ensure a local user profile exists when working offline
            if (users.length === 0) {
                const userData = {
                    id: currentUserId,
                    firstName: null,
                    lastName: null,
                    email: null,
                    emailConfirmed: false,
                    biometricEnabled: false,
                    pinEnabled: false,
                    pinCode: null,
                    language: null,
                    passwordHash: null,
                    userType: 'free',
                    profilePictureUrl: null,
                    timezone: null,
                    isActive: true,
                    lastLoginAt: null,
                    createdOn: now,
                    updatedOn: now,
                    syncStatus: 'pending',
                    lastSyncAt: null,
                    needsUpload: true,
                };
                createObject('User', userData);
            }

            if (existingAccount) {
                updateObject('Account', data.id, data);
                Alert.alert(t('common.success'), t('addNewAccountScreen.success.accountUpdated'));
            } else {
                createObject('Account', data);

                // Create sync log
                createObject('SyncLog', {
                    id: Date.now().toString() + '_log',
                    userId: currentUserId,
                    tableName: 'accounts',
                    recordId: data.id,
                    operation: 'create',
                    status: 'pending',
                    createdOn: new Date(),
                    processedAt: null
                });

                Alert.alert(t('common.success'), t('addNewAccountScreen.success.accountAdded'));
            }

            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to create account: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, accountName, currency, terms, existingAccount, navigation]);

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

    const renderCurrencyItem = ({ item }) => (
        <TouchableOpacity
            style={styles.currencyItem}
            onPress={() => {
                console.log('Selected currency:', item.element);
                setCurrency(item.element);
                setShowCurrencySheet(false);
            }}
        >
            <Text style={styles.currencyCode}>{item.element}</Text>
            <Text style={styles.currencyName}>{item.description}</Text>
        </TouchableOpacity>
    );

    const SettingRow = ({ title, value, onPress, isRequired = false, icon }) => (
        <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.settingContent}>
                <View style={styles.settingLeft}>
                    <Text style={styles.label}>
                        {title} {isRequired && <Text style={styles.required}>*</Text>}
                    </Text>
                    <View style={styles.settingValue}>
                        {icon && <View style={styles.iconContainer}>{icon}</View>}
                        <Text style={styles.sheetOptionText}>{value}</Text>
                    </View>
                </View>
                <Icon name="chevron-right" size={RFValue(24)} color={colors.gray} />
            </View>
        </TouchableOpacity>
    );

    const CurrencyIcon = () => (
        <Text style={styles.currencyFlag}>{currency.flag}</Text>
    );

    // Find the selected currency object
    const selectedCurrency = currencies.find(c => c.element === currency) || { element: 'USD' };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : hp(2.5)} // ~20px
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.flex}>
                        <View style={[styles.header, { paddingHorizontal: wp(4.5) }]}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.goBack()}
                            >
                                <Icon name="arrow-back" size={RFValue(24)} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>{existingAccount ? t('addNewAccountScreen.updateAccount') : t('addNewAccountScreen.addAccount')}</Text>
                            <View style={styles.placeholder} />
                        </View>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{
                                alignItems: 'center',
                                paddingBottom: hp(15), // ~120px
                                marginTop: hp(2.25) // ~18px
                            }}
                        >
                            <View style={[styles.formWrapper, { maxWidth: wp(90), width: '100%' }]}>
                                <AccountNameInput
                                    accountName={accountName}
                                    setAccountName={setAccountName}
                                    t={t}
                                />
                                <View style={styles.settingsContainer}>
                                    <SettingRow
                                        title={t('addNewAccountScreen.currency')}
                                        value={selectedCurrency.element}
                                        onPress={() => setShowCurrencySheet(true)}
                                        isRequired={true}
                                        icon={<CurrencyIcon />}
                                    />
                                    <SettingRow
                                        title={t('addNewAccountScreen.terms')}
                                        value={getTranslatedTerm(terms)}
                                        onPress={() => setShowTermsSheet(true)}
                                        isRequired={true}
                                    />
                                </View>
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.saveButton,
                                            !accountName.trim() && styles.disabledButton
                                        ]}
                                        onPress={handleAddAccount}
                                        disabled={!accountName.trim()}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.buttonText}>{existingAccount ? t('addNewAccountScreen.updateAccount') : t('addNewAccountScreen.addAccount')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>

                {/* Terms Bottom Sheet */}
                <BottomSheet
                    visible={showTermsSheet}
                    onClose={() => setShowTermsSheet(false)}
                    title={t('addNewAccountScreen.selectTransactionType')}
                >
                    {termOptions.map((option) => (
                        <TouchableOpacity
                            key={option.code}
                            style={[
                                styles.sheetOption,
                                terms === option.code && { backgroundColor: colors.lightGray }
                            ]}
                            onPress={() => {
                                setTerms(option.code);
                                setShowTermsSheet(false);
                            }}
                        >
                            <Text style={[
                                styles.sheetOptionText,
                                terms === option.code && { color: colors.primary, fontFamily: 'Sora-Bold' }
                            ]}>
                                {option.display}
                            </Text>
                            {terms === option.code && (
                                <Icon name="check" size={RFValue(22)} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </BottomSheet>

                {/* Currency Bottom Sheet */}
                <BottomSheet
                    visible={showCurrencySheet}
                    onClose={() => setShowCurrencySheet(false)}
                    title={t('addNewAccountScreen.selectCurrency')}
                >
                    <FlatList
                        data={currencies}
                        renderItem={renderCurrencyItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.currencyList}
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
        paddingVertical: hp(2), // ~16px
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        width: '100%',
    },
    backButton: {
        width: wp(10), // ~40px
        height: wp(10), // ~40px
        borderRadius: wp(5), // ~20px
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: RFPercentage(2.8), // ~20px
        fontFamily: 'Sora-Bold',
        color: colors.primary,
        marginLeft: wp(3), // ~12px
        flex: 1,
        textAlign: 'center',
    },
    placeholder: {
        width: wp(10), // ~40px
    },
    formWrapper: {
        width: '100%',
        paddingHorizontal: wp(4.5), // ~18px
        alignSelf: 'center',
    },
    inputContainer: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(4), // ~16px
        marginBottom: hp(1.75), // ~14px
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
    },
    label: {
        fontSize: RFPercentage(2), // ~14px
        fontFamily: 'Sora-SemiBold',
        color: colors.gray,
        marginBottom: hp(0.75), // ~6px
    },
    required: {
        color: colors.error,
        fontFamily: 'Sora-Bold',
        fontSize: RFPercentage(2), // ~14px
    },
    input: {
        backgroundColor: colors.white,
        borderRadius: wp(2), // ~8px
        paddingVertical: hp(1.25), // ~10px
        paddingHorizontal: wp(2.5), // ~10px
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
    },
    settingsContainer: {
        paddingTop: 0,
        marginBottom: hp(1.25), // ~10px
    },
    settingRow: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(4), // ~16px
        marginBottom: hp(1.75), // ~14px
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
    },
    settingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingLeft: {
        flex: 1,
    },
    settingValue: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: wp(3), // ~12px
    },
    sheetOptionText: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        color: colors.primary,
    },
    buttonContainer: {
        marginTop: hp(2), // ~16px
        marginBottom: hp(3), // ~24px
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(8), // ~32px
        alignItems: 'center',
        width: '100%',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
    },
    disabledButton: {
        backgroundColor: colors.gray,
        opacity: 0.6,
    },
    buttonText: {
        color: colors.white,
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Bold',
        textAlign: 'center',
    },
    bottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.18)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: wp(5), // ~20px
        borderTopRightRadius: wp(5), // ~20px
        paddingHorizontal: wp(6), // ~24px
        paddingVertical: hp(3), // ~24px
        minHeight: hp(22.5), // ~180px
        elevation: 12,
    },
    sheetTitle: {
        fontSize: RFPercentage(2.5), // ~18px
        fontFamily: 'Sora-Bold',
        color: colors.gray,
        marginBottom: hp(2.25), // ~18px
        textAlign: 'center',
    },
    sheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(2), // ~8px
        borderRadius: wp(2.5), // ~10px
        marginBottom: hp(0.75), // ~6px
    },
    currencyFlag: {
        fontSize: RFPercentage(3.3), // ~24px
        marginRight: wp(3), // ~12px
    },
    currencyInfo: {
        flex: 1,
    },
    currencyName: {
        fontSize: RFPercentage(2), // ~14px
        color: colors.gray,
        marginTop: hp(0.25), // ~2px
        fontFamily: 'Sora-Regular',
    },
    currencyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(2), // ~8px
        borderRadius: wp(2.5), // ~10px
        marginBottom: hp(0.75), // ~6px
    },
    currencyCode: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        color: colors.primary,
    },
    currencyList: {
        paddingHorizontal: wp(6), // ~24px
        paddingVertical: hp(3), // ~24px
    },
    selectInput: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(4), // ~16px
        marginBottom: hp(1.75), // ~14px
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectInputText: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        color: colors.text,
    },
});

export default AddAccountScreen;