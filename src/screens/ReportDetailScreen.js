import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';
import { realm } from '../realm';
import { useTranslation } from 'react-i18next';

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

const ReportDetailScreen = ({ navigation, route }) => {
    const { reportId } = route.params;
        const [report, setReport] = useState(null);
    const { t } = useTranslation();

    useEffect(() => {
        const loadReport = () => {
            const reportData = realm.objectForPrimaryKey('Report', reportId);
            if (reportData) {
                setReport({
                    ...reportData,
                    data: JSON.parse(reportData.data),
                    filters: reportData.filters ? JSON.parse(reportData.filters) : {}
                });
            }
        };

        loadReport();
    }, [reportId]);

        const handleShare = async () => {
        try {
            let message = `${report.title}\n`;
            message += `${t('reportDetailScreen.share.generatedOn', { date: new Date(report.generatedOn).toLocaleDateString() })}\n\n`;

            if (report.type === 'transaction') {
                message += `${t('reportDetailScreen.share.totalTransactions', { count: report.data.totalTransactions })}\n`;
                message += `${t('reportDetailScreen.share.totalAmount', { amount: report.data.totalAmount })}\n\n`;
                
                message += `${t('reportDetailScreen.share.byType')}:\n`;
                Object.entries(report.data.byType).forEach(([type, data]) => {
                    message += `${t('reportDetailScreen.share.typeDetails', { type: t(`common.transactionTypes.${type.toLowerCase()}`), count: data.count, amount: data.amount })}\n`;
                });
            } else if (report.type === 'contact') {
                Object.entries(report.data).forEach(([contactId, data]) => {
                    message += `\n${data.name}:\n`;
                    message += `${t('reportDetailScreen.share.owed', { amount: data.totalOwed })}\n`;
                    message += `${t('reportDetailScreen.share.owing', { amount: data.totalOwing })}\n`;
                    message += `${t('reportDetailScreen.share.netBalance', { amount: data.netBalance })}\n`;
                });
            }

            await Share.share({
                message,
                title: report.title,
            });
        } catch (error) {
            console.error('Error sharing report:', error);
        }
    };

    if (!report) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>{t('reportDetailScreen.loading')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={RFValue(24)} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{report.title}</Text>
                <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShare}
                >
                    <Icon name="share" size={RFValue(24)} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.reportMeta}>
                    <Text style={styles.metaText}>
                        {t('reportDetailScreen.generated')}: {new Date(report.generatedOn).toLocaleDateString()}
                    </Text>
                    <Text style={styles.metaText}>
                        {t('reportDetailScreen.period')}: {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
                    </Text>
                </View>

                {report.type === 'transaction' && (
                    <View style={styles.section}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>{t('reportDetailScreen.summary.title')}</Text>
                            <Text style={styles.summaryText}>
                                {t('reportDetailScreen.summary.totalTransactions')}: {report.data.totalTransactions}
                            </Text>
                            <Text style={styles.summaryText}>
                                {t('reportDetailScreen.summary.totalAmount')}: {report.data.totalAmount}
                            </Text>
                        </View>

                        <View style={styles.detailsCard}>
                            <Text style={styles.detailsTitle}>{t('reportDetailScreen.details.byType')}</Text>
                            {Object.entries(report.data.byType).map(([type, data]) => (
                                <View key={type} style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{t(`common.transactionTypes.${type.toLowerCase()}`)}</Text>
                                    <View style={styles.detailValues}>
                                        <Text style={styles.detailText}>{t('reportDetailScreen.details.count')}: {data.count}</Text>
                                        <Text style={styles.detailText}>{t('reportDetailScreen.details.amount')}: {data.amount}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {report.type === 'contact' && (
                    <View style={styles.section}>
                        {Object.entries(report.data).map(([contactId, data]) => (
                            <View key={contactId} style={styles.contactCard}>
                                <Text style={styles.contactName}>{data.name}</Text>
                                <View style={styles.balanceRow}>
                                    <Text style={styles.balanceLabel}>{t('reportDetailScreen.contact.owed')}:</Text>
                                    <Text style={styles.balanceAmount}>{data.totalOwed}</Text>
                                </View>
                                <View style={styles.balanceRow}>
                                    <Text style={styles.balanceLabel}>{t('reportDetailScreen.contact.owing')}:</Text>
                                    <Text style={styles.balanceAmount}>{data.totalOwing}</Text>
                                </View>
                                <View style={styles.balanceRow}>
                                    <Text style={styles.balanceLabel}>{t('reportDetailScreen.contact.netBalance')}:</Text>
                                    <Text style={[
                                        styles.balanceAmount,
                                        { color: data.netBalance >= 0 ? colors.success : colors.error }
                                    ]}>
                                        {data.netBalance}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(2),
        paddingHorizontal: wp(4),
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: wp(2),
    },
    headerTitle: {
        flex: 1,
        fontSize: RFValue(18),
        fontFamily: 'Sora-Bold',
        color: colors.primary,
        textAlign: 'center',
    },
    shareButton: {
        padding: wp(2),
    },
    content: {
        flex: 1,
        padding: wp(4),
    },
    reportMeta: {
        backgroundColor: colors.white,
        padding: wp(4),
        borderRadius: wp(2),
        marginBottom: hp(2),
    },
    metaText: {
        fontSize: RFValue(14),
        color: colors.gray,
        marginBottom: hp(1),
    },
    section: {
        marginBottom: hp(2),
    },
    summaryCard: {
        backgroundColor: colors.white,
        padding: wp(4),
        borderRadius: wp(2),
        marginBottom: hp(2),
    },
    summaryTitle: {
        fontSize: RFValue(16),
        fontFamily: 'Sora-Bold',
        color: colors.primary,
        marginBottom: hp(1),
    },
    summaryText: {
        fontSize: RFValue(14),
        color: colors.gray,
        marginBottom: hp(0.5),
    },
    detailsCard: {
        backgroundColor: colors.white,
        padding: wp(4),
        borderRadius: wp(2),
    },
    detailsTitle: {
        fontSize: RFValue(16),
        fontFamily: 'Sora-Bold',
        color: colors.primary,
        marginBottom: hp(2),
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: hp(1),
    },
    detailLabel: {
        fontSize: RFValue(14),
        color: colors.gray,
        flex: 1,
    },
    detailValues: {
        flex: 2,
    },
    detailText: {
        fontSize: RFValue(14),
        color: colors.gray,
        textAlign: 'right',
    },
    contactCard: {
        backgroundColor: colors.white,
        padding: wp(4),
        borderRadius: wp(2),
        marginBottom: hp(2),
    },
    contactName: {
        fontSize: RFValue(16),
        fontFamily: 'Sora-Bold',
        color: colors.primary,
        marginBottom: hp(2),
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: hp(1),
    },
    balanceLabel: {
        fontSize: RFValue(14),
        color: colors.gray,
    },
    balanceAmount: {
        fontSize: RFValue(14),
        fontFamily: 'Sora-Bold',
    },
    loadingText: {
        fontSize: RFValue(16),
        color: colors.gray,
        textAlign: 'center',
        marginTop: hp(4),
    },
});

export default ReportDetailScreen;
