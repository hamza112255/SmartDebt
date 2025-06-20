import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RFValue } from 'react-native-responsive-fontsize';
import Icon from 'react-native-vector-icons/MaterialIcons';

const colors = {
    primary: '#2563eb',
    white: '#ffffff',
    background: '#f8fafc',
    text: '#1e293b',
    gold: '#FFD700',
};

const PremiumScreen = () => {
    const { t } = useTranslation();

    return (
        <View style={styles.container}>
            <Icon name="workspace-premium" size={RFValue(80)} color={colors.gold} style={styles.icon} />
            <Text style={styles.title}>{t('premiumScreen.title')}</Text>
            <Text style={styles.subtitle}>{t('premiumScreen.subtitle')}</Text>
            
            <View style={styles.featuresContainer}>
                <View style={styles.featureItem}>
                    <Icon name="check-circle" size={RFValue(24)} color={colors.primary} />
                    <Text style={styles.featureText}>{t('premiumScreen.features.advancedReports')}</Text>
                </View>
                <View style={styles.featureItem}>
                    <Icon name="check-circle" size={RFValue(24)} color={colors.primary} />
                    <Text style={styles.featureText}>{t('premiumScreen.features.unlimitedAccounts')}</Text>
                </View>
                <View style={styles.featureItem}>
                    <Icon name="check-circle" size={RFValue(24)} color={colors.primary} />
                    <Text style={styles.featureText}>{t('premiumScreen.features.cloudSync')}</Text>
                </View>
                 <View style={styles.featureItem}>
                    <Icon name="check-circle" size={RFValue(24)} color={colors.primary} />
                    <Text style={styles.featureText}>{t('premiumScreen.features.prioritySupport')}</Text>
                </View>
                 <View style={styles.featureItem}>
                    <Icon name="check-circle" size={RFValue(24)} color={colors.primary} />
                    <Text style={styles.featureText}>{t('premiumScreen.features.createBudget')}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.upgradeButton}>
                <Text style={styles.upgradeButtonText}>{t('premiumScreen.upgradeButton')}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    icon: {
        marginBottom: 20,
    },
    title: {
        fontSize: RFValue(24),
        fontFamily: 'Sora-Bold',
        color: colors.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: RFValue(16),
        fontFamily: 'Sora-Regular',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 30,
    },
    featuresContainer: {
        width: '100%',
        marginBottom: 40,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    featureText: {
        fontSize: RFValue(16),
        fontFamily: 'Sora-Regular',
        color: colors.text,
        marginLeft: 10,
    },
    upgradeButton: {
        backgroundColor: colors.primary,
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
    },
    upgradeButtonText: {
        color: colors.white,
        fontSize: RFValue(18),
        fontFamily: 'Sora-Bold',
    },
});

export default PremiumScreen;
