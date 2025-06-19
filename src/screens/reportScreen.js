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
import {realm} from '../realm';

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
    const [realmError, setRealmError] = useState(null); // New state for Realm errors
    const { t } = useTranslation();

    // Load data from Realm
    const loadData = useCallback(() => {
        try {
            console.log('Loading data from Realm', realm);
            if (!realm) {
                throw new Error('Realm instance is not initialized');
            }

            // Load users
            const users = getAllObjects('User');
            if (users && users.length > 0) {
                setCurrentUser(users[0]);
            }

            // Load contacts
            const contacts = getAllObjects('Contact');
            setAllContacts(contacts || []);

            // Load transactions
            const transactions = getAllObjects('Transaction');
            setTransactions(transactions || []);

            // Clear ReportGenerator cache
            if (ReportGenerator.clearCache) {
                ReportGenerator.clearCache();
            }

            setRealmError(null); // Clear any previous errors
        } catch (error) {
            console.error('Failed to load data:', error);
            setRealmError(error.message);
        }
    }, []);

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

        // Cleanup listener on component unmount
        return () => {
            transactionCollection.removeAllListeners();
        };
    }, [loadData]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const generatePdf = async () => {
        if (!reportType) {
            Alert.alert(t('common.validationError'), t('reportScreen.alerts.selectReportType'));
            return null;
        }

        if (reportType === 'contact' && !selectedContact?.id) {
            Alert.alert(t('common.error'), t('reportScreen.alerts.selectContact'));
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
                accountId: selectedAccount?.id,
                contactId: selectedContact?.id,
            };

            switch (reportType) {
                case 'transaction':
                    reportData = ReportGenerator.generateTransactionReport(filters);
                    break;
                case 'contact':
                    reportData = ReportGenerator.generateContactReport(filters);
                    if (!reportData.contactInfo) {
                        throw new Error(t('reportScreen.errors.contactNotFound'));
                    }
                    break;
                case 'account':
                    reportData = ReportGenerator.generateAccountReport(filters);
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
            Alert.alert(t('common.error'), t('reportScreen.alerts.generateError'));
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const generateReport = async () => {
        const uri = await generatePdf();
        if (uri) {
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    dialogTitle: t('reportScreen.shareDialogTitle'),
                    mimeType: 'application/pdf',
                });
            } else {
                Alert.alert(t('reportScreen.alerts.sharingNotAvailableTitle'), t('reportScreen.alerts.sharingNotAvailableMessage'));
            }
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
                                : t('reportScreen.accountSummary.title')}
                    </Text>

                    {reportType === 'contact' && (
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
                                style={[styles.generateButton, { marginBottom: 15 }]}
                                onPress={generateReport}
                                disabled={isLoading || !!realmError}
                            >
                                <Text style={styles.generateButtonText}>{t('reportScreen.generateAndShare')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.generateButton}
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
                    <Text style={styles.retryButtonText}>{t('reportScreen.retry')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>{t('reportScreen.loading')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('reportScreen.title')}</Text>
                <View style={styles.placeholder} />
            </View>
            <ScrollView style={styles.content}>
                <TouchableOpacity
                    style={styles.reportCard}
                    onPress={() => {
                        setReportType('transaction');
                        setShowModal(true);
                    }}
                >
                    <Icon name="receipt" size={24} color={colors.primary} />
                    <View style={styles.reportInfo}>
                        <Text style={styles.reportTitle}>{t('reportScreen.transactionReport.title')}</Text>
                        <Text style={styles.reportDesc}>{t('reportScreen.transactionReport.description')}</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={colors.gray} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.reportCard}
                    onPress={() => {
                        setReportType('contact');
                        setShowModal(true);
                    }}
                >
                    <Icon name="people" size={24} color={colors.primary} />
                    <View style={styles.reportInfo}>
                        <Text style={styles.reportTitle}>{t('reportScreen.contactReport.title')}</Text>
                        <Text style={styles.reportDesc}>{t('reportScreen.contactReport.description')}</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={colors.gray} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.reportCard}
                    onPress={() => {
                        setReportType('account');
                        setShowModal(true);
                    }}
                >
                    <Icon name="account-balance" size={24} color={colors.primary} />
                    <View style={styles.reportInfo}>
                        <Text style={styles.reportTitle}>{t('reportScreen.accountSummary.title')}</Text>
                        <Text style={styles.reportDesc}>{t('reportScreen.accountSummary.description')}</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={colors.gray} />
                </TouchableOpacity>
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
        marginTop: 20,
    },
    generateButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold',
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
        fontFamily: 'Sora-Regular',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        color: colors.gray,
        fontFamily: 'Sora-Regular',
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