import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { ReportGenerator } from '../utils/ReportGenerator';
import { getAllObjects } from '../realm';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import { realm } from '../realm';

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

const ReportScreen = ({ navigation }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [reportType, setReportType] = useState(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        endDate: new Date(),
    });
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [selectedContact, setSelectedContact] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerType, setDatePickerType] = useState('start');
    const [currentUser, setCurrentUser] = useState(null);
    const [allContacts, setAllContacts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [realmError, setRealmError] = useState(null);
    const [allAccounts, setAllAccounts] = useState([]);
    const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');
    const { t } = useTranslation();

    // Load data from Realm
    const loadData = useCallback(() => {
        try {
            console.log('Loading data from Realm');
            if (!realm) {
                throw new Error('Realm instance is not initialized');
            }

            // Load users
            const users = getAllObjects('User');
            console.log('Loaded users:', users?.length || 0);
            if (users && users.length > 0) {
                setCurrentUser(users[0]);
            }

            // Load contacts
            const contacts = getAllObjects('Contact');
            console.log('Loaded contacts:', contacts?.length || 0);
            setAllContacts(contacts || []);

            // Load transactions
            const transactions = realm.objects('Transaction');
            console.log('Loaded transactions:', transactions?.length || 0);
            setTransactions(transactions || []);

            // Load accounts
            const accounts = realm.objects('Account');
            console.log('Raw accounts loaded:', accounts?.length || 0);
            const accountsArray = Array.from(accounts || []);
            console.log('Raw accounts loaded:', accountsArray);
            // Filter accounts to ensure they have a valid identifier
            setAllAccounts(accountsArray);
            console.log('loadData - After setAllAccounts. allAccounts count:', accountsArray.length,
                'First account ID:', accountsArray.length > 0 && accountsArray[0]?._id ? (accountsArray[0]._id.toHexString ? accountsArray[0]._id.toHexString() : accountsArray[0]._id) : 'N/A');

            // Set selectedAccount to the first valid account if not already set
            if (accountsArray.length > 0 && accountsArray[0]?._id && !selectedAccount) {
                const firstAccountId = accountsArray[0]._id.toHexString ? accountsArray[0]._id.toHexString() : accountsArray[0]._id.toString();
                setSelectedAccount(firstAccountId);
                console.log('loadData - Setting selectedAccount to first account:', firstAccountId);
            }

            // Clear ReportGenerator cache
            if (ReportGenerator.clearCache) {
                ReportGenerator.clearCache();
            }

            setRealmError(null);
        } catch (error) {
            console.error('Failed to load data:', error);
            setRealmError(error.message);
        }
    }, [selectedAccount]);

    // Effect to set default selectedAccount when modal opens or reportType changes
    useEffect(() => {
        console.log('useEffect [reportType, allAccounts, showModal] triggered.');
        console.log('  reportType:', reportType, 'allAccounts.length:', allAccounts.length, 'showModal:', showModal);
        if ((reportType === 'account_summary_by_account' || showModal) && allAccounts.length > 0 && !selectedAccount) {
            const firstValidAccount = allAccounts.find(acc => acc && acc._id);
            if (firstValidAccount) {
                const accountId = firstValidAccount._id?.toHexString ? firstValidAccount._id?.toHexString() : firstValidAccount._id.toString();
                console.log('  Setting selectedAccount to:', accountId);
                setSelectedAccount(accountId);
            }
        }
    }, [reportType, allAccounts, showModal, selectedAccount]);

    // Set up Realm listener for real-time updates
    useEffect(() => {
        if (!realm) {
            console.error('Realm is not initialized, skipping listener setup');
            setRealmError('Realm database is not initialized');
            return;
        }

        const transactionCollection = realm.objects('Transaction');
        transactionCollection.addListener((collection, changes) => {
            console.log('Transaction collection changed');
            loadData();
        });

        return () => {
            transactionCollection.removeAllListeners();
        };
    }, [loadData]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const generatePdf = async (share = false) => {
        if (!reportType) {
            Alert.alert(t('common.error'), t('reportScreen.alerts.selectReportType'));
            return null;
        }

        if (realmError) {
            Alert.alert(t('common.error'), t('reportScreen.alerts.realmError'));
            return null;
        }

        setIsLoading(true);
        try {
            let reportData;
            const filters = {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            };

            switch (reportType) {
                case 'transaction':
                    console.log('Generating transaction report with filters:', filters);
                    reportData = ReportGenerator.generateTransactionReport(filters);
                    break;
                case 'contact':
                    const contactFilters = { ...filters, accountId: selectedAccount, contactId: selectedContact?.id };
                    console.log('Generating contact report with filters:', contactFilters);
                    reportData = ReportGenerator.generateContactReport(contactFilters);
                    if (contactFilters.contactId && !reportData.contactInfo) {
                        throw new Error(t('reportScreen.errors.contactNotFound'));
                    }
                    break;
                case 'account_summary_by_account':
                    const summaryFilters = { ...filters, accountId: selectedAccount, transactionTypeFilter };
                    console.log('Generating account summary with filters:', summaryFilters);
                    if (summaryFilters.accountId) {
                        reportData = ReportGenerator.generateAccountSummaryByAccountReport(summaryFilters);
                    } else {
                        reportData = ReportGenerator.generateAllAccountsSummaryReport(summaryFilters);
                    }
                    break;
                case 'all_accounts_summary':
                    console.log('Generating all accounts summary with filters:', filters);
                    reportData = ReportGenerator.generateAllAccountsSummaryReport(filters);
                    break;
                default:
                    throw new Error(t('reportScreen.errors.invalidReportType'));
            }

            if (!reportData || !reportData.data || (Array.isArray(reportData.data) && reportData.data.length === 0)) {
                Alert.alert(t('reportScreen.alerts.noDataTitle'), t('reportScreen.alerts.noDataMessage'));
                return null;
            }

            const html = ReportGenerator.generateReportHTML(reportData);
            const { uri } = await Print.printToFileAsync({ html });
            return uri;
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert(t('common.error'), error.message || t('reportScreen.alerts.generateError'));
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const generateReport = async () => {
        try {
            setIsLoading(true);

            const filters = {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                accountId: selectedAccount,
                contactId: selectedContact?.id,
                transactionTypeFilter
            };

            let reportData;

            switch (reportType) {
                case 'transaction':
                    reportData = ReportGenerator.generateTransactionReport(filters);
                    break;
                case 'contact':
                    reportData = ReportGenerator.generateContactReport(filters);
                    if (filters.contactId && !reportData.contactInfo) {
                        throw new Error(t('reportScreen.errors.contactNotFound'));
                    }
                    // If no data, show alert and close modal
                    if (!reportData.data || (Array.isArray(reportData.data) && reportData.data.length === 0)) {
                        Alert.alert(
                            t('reportScreen.alerts.noDataTitle'),
                            t('reportScreen.alerts.noDataMessage'),
                            [
                                {
                                    text: t('common.ok'),
                                    onPress: () => setShowModal(false)
                                }
                            ]
                        );
                        return;
                    }
                    break;
                case 'account_summary_by_account':
                    if (selectedAccount) {
                        reportData = ReportGenerator.generateAccountSummaryByAccountReport(filters);
                    } else {
                        reportData = ReportGenerator.generateAllAccountsSummaryReport(filters);
                    }
                    break;
                case 'all_accounts_summary':
                    reportData = ReportGenerator.generateAllAccountsSummaryReport(filters);
                    break;
                default:
                    throw new Error(t('reportScreen.errors.invalidReportType'));
            }

            if (!reportData || !reportData.data || (Array.isArray(reportData.data) && reportData.data.length === 0)) {
                Alert.alert(
                    t('reportScreen.alerts.noDataTitle'),
                    t('reportScreen.alerts.noDataMessage'),
                    [
                        {
                            text: t('common.ok'),
                            onPress: () => setShowModal(false)
                        }
                    ]
                );
                return;
            }

            const html = ReportGenerator.generateReportHTML(reportData);
            const { uri } = await Print.printToFileAsync({ html });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    dialogTitle: t('reportScreen.shareDialogTitle'),
                    mimeType: 'application/pdf',
                    UTI: 'com.adobe.pdf',
                });
            } else {
                Alert.alert(
                    t('reportScreen.alerts.sharingNotAvailableTitle'),
                    t('reportScreen.alerts.sharingNotAvailableMessage')
                );
            }
        } catch (error) {
            console.error('Error generating report:', error);
            Alert.alert(t('common.error'), error.message || t('reportScreen.alerts.generateError'));
        } finally {
            setIsLoading(false);
        }
    };

    const saveReportLocally = async () => {
        const uri = await generatePdf();
        if (uri) {
            try {
                const fileName = `report_${Date.now()}.pdf`;
                const downloadsDir = `${FileSystem.cacheDirectory}SmartDebt/`;
                await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
                const newPath = `${downloadsDir}${fileName}`;

                await FileSystem.copyAsync({
                    from: uri,
                    to: newPath,
                });

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(newPath, {
                        dialogTitle: t('reportScreen.saveDialogTitle'),
                        mimeType: 'application/pdf',
                        UTI: 'com.adobe.pdf',
                    });
                } else {
                    Alert.alert(t('reportScreen.alerts.saveSuccessTitle'), t('reportScreen.alerts.saveSuccessMessage', { filePath: newPath }));
                }
            } catch (error) {
                Alert.alert(t('common.error'), t('reportScreen.alerts.saveErrorMessage'));
            }
        }
    };

    const ReportModal = () => (
        <Modal
            visible={showModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.filterContainer}>
                    <Text style={styles.filterTitle}>
                        {reportType === 'transaction'
                            ? t('reportScreen.transactionReport.title')
                            : reportType === 'contact'
                                ? t('reportScreen.contactReport.title')
                                : reportType === 'account_summary_by_account'
                                    ? t('reportScreen.accountSummaryByAccount.title')
                                    : t('reportScreen.summaryOfAllAccounts.title')}
                    </Text>

                    {reportType === 'account_summary_by_account' && (
                        <>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>{t('reportScreen.modal.selectAccount')}</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={selectedAccount}
                                        onValueChange={value => setSelectedAccount(value === 'all' ? null : value)}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label={t('reportScreen.modal.allAccounts')} value="all" />
                                        {allAccounts.map(acc => (
                                            <Picker.Item
                                                key={acc.id || acc._id}
                                                label={acc.name || t('reportScreen.common.unnamedAccount')}
                                                value={acc.id || acc._id}
                                            />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>{t('reportScreen.modal.selectTransactionType')}</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={transactionTypeFilter}
                                        onValueChange={setTransactionTypeFilter}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label={t('reportScreen.common.all')} value="all" />
                                        <Picker.Item label={t('reportScreen.common.receiving')} value="receiving" />
                                        <Picker.Item label={t('reportScreen.common.sending')} value="sending" />
                                    </Picker>
                                </View>
                            </View>
                        </>
                    )}

                    {reportType === 'contact' && (
                        <>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>{t('reportScreen.modal.selectAccountOptional')}</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={selectedAccount}
                                        onValueChange={setSelectedAccount}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label={t('reportScreen.modal.allAccounts')} value={null} />
                                        {allAccounts.map(acc => (
                                            <Picker.Item
                                                key={acc.id || acc._id}
                                                label={acc.name || 'Unnamed Account'}
                                                value={acc.id || acc._id}
                                            />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>{t('reportScreen.modal.selectContact')}</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={selectedContact?.id}
                                        onValueChange={(itemValue) => {
                                            const contact = allContacts.find((c) => c.id === itemValue);
                                            setSelectedContact(contact);
                                        }}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label={t('reportScreen.modal.allContacts')} value={null} />
                                        {allContacts.map((contact) => (
                                            <Picker.Item
                                                key={contact.id}
                                                label={contact.name}
                                                value={contact.id}
                                            />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                        </>
                    )}

                    <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => {
                            setDatePickerType('start');
                            setShowDatePicker(true);
                        }}
                    >
                        <Text style={styles.dateLabel}>{t('reportScreen.modal.startDate')}</Text>
                        <Text style={styles.dateValue}>
                            {dateRange.startDate.toLocaleDateString()}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => {
                            setDatePickerType('end');
                            setShowDatePicker(true);
                        }}
                    >
                        <Text style={styles.dateLabel}>{t('reportScreen.modal.endDate')}</Text>
                        <Text style={styles.dateValue}>
                            {dateRange.endDate.toLocaleDateString()}
                        </Text>
                    </TouchableOpacity>

                    {isLoading ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                    ) : (
                        <>
                            <TouchableOpacity
                                style={[styles.button, styles.generateButton]}
                                onPress={generateReport}
                                disabled={isLoading || !!realmError}
                            >
                                <Text style={styles.generateButtonText}>{t('reportScreen.generate')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.generateButton]}
                                onPress={saveReportLocally}
                                disabled={isLoading || !!realmError}
                            >
                                <Text style={styles.generateButtonText}>{t('reportScreen.saveReportLocally')}</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                            setShowModal(false);
                            setSelectedContact(null);
                        }}
                    >
                        <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    if (realmError) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('reportScreen.realmError')}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                    <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isLoading && !reportType) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
        );
    }

    const reportOptions = [
        {
            key: 'transaction',
            title: t('reportScreen.transactionReport.title'),
            description: t('reportScreen.transactionReport.description'),
            icon: 'receipt-long',
        },
        {
            key: 'contact',
            title: t('reportScreen.contactReport.title'),
            description: t('reportScreen.contactReport.description'),
            icon: 'people',
        },
        {
            key: 'account_summary_by_account',
            title: t('reportScreen.accountSummaryByAccount.title'),
            description: t('reportScreen.accountSummaryByAccount.description'),
            icon: 'account-balance-wallet',
        },
        {
            key: 'all_accounts_summary',
            title: t('reportScreen.summaryOfAllAccounts.title'),
            description: t('reportScreen.summaryOfAllAccounts.description'),
            icon: 'summarize',
        },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('reportScreen.title')}</Text>
                <View style={styles.placeholder} />
            </View>
            <ScrollView style={styles.content}>
                {reportOptions.map(report => (
                    <TouchableOpacity
                        key={report.key}
                        style={styles.reportCard}
                        onPress={() => {
                            setReportType(report.key);
                            setShowModal(true);
                        }}
                        disabled={report.key === 'account_summary_by_account' && allAccounts.length === 0}
                    >
                        <Icon name={report.icon} size={24} color={report.key === 'account_summary_by_account' && allAccounts.length === 0 ? colors.gray : colors.primary} />
                        <View style={styles.reportInfo}>
                            <Text style={[styles.reportTitle, { color: report.key === 'account_summary_by_account' && allAccounts.length === 0 ? colors.gray : colors.gray }]}>
                                {report.title}
                            </Text>
                            <Text style={styles.reportDesc}>{report.description}</Text>
                        </View>
                        <Icon name="chevron-right" size={24} color={colors.gray} />
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ReportModal />

            {showDatePicker && (
                <DateTimePicker
                    value={datePickerType === 'start' ? dateRange.startDate : dateRange.endDate}
                    mode="date"
                    display="calendar"
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                            setDateRange((prev) => ({
                                ...prev,
                                [datePickerType === 'start' ? 'startDate' : 'endDate']: selectedDate,
                            }));
                        }
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: hp(2.25),
        paddingHorizontal: wp(4.5),
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: RFPercentage(2.5),
        fontWeight: '700',
        color: colors.primary,
        marginLeft: wp(4),
    },
    placeholder: {
        width: wp(10),
    },
    content: {
        flex: 1,
        padding: wp(4),
    },
    reportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.white,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    reportInfo: {
        flex: 1,
        marginLeft: 12,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.gray,
    },
    reportDesc: {
        fontSize: 14,
        color: colors.gray,
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    filterContainer: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    filterTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    dateInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    dateLabel: {
        fontSize: 12,
        color: colors.gray,
        marginBottom: 4,
    },
    dateValue: {
        fontSize: 16,
        color: colors.primary,
    },
    generateButton: {
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    generateButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    cancelButton: {
        padding: 16,
        alignItems: 'center',
        marginTop: 12,
    },
    cancelButtonText: {
        color: colors.error,
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.white,
    },
    loadingText: {
        marginTop: hp(2),
        fontSize: RFValue(16),
        color: colors.gray,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        color: colors.gray,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        marginTop: 5,
        overflow: 'hidden',
    },
    picker: {
        width: '100%',
        height: 44,
        fontFamily: 'Sora-Regular',
        fontSize: RFValue(16),
        color: colors.gray,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.white,
    },
    errorText: {
        fontSize: RFValue(16),
        color: colors.error,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: colors.primary,
        padding: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ReportScreen;