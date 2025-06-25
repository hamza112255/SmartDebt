import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RFValue } from 'react-native-responsive-fontsize';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { screens } from '../constant/screens';

const colors = {
    primary: '#2563eb',
    white: '#ffffff',
    background: '#f8fafc',
    text: '#1e293b',
    gold: '#FFD700',
    gradientStart: '#fbbf24',
    gradientEnd: '#f59e42',
    card: '#fffbea',
    shadow: '#eab308',
};

const PremiumScreen = ({ navigation }) => {
    const { t } = useTranslation();

    return (
        <View style={styles.container}>
            {/* Custom Header with Gradient */}
            <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={styles.headerContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Back Button */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Icon name="chevron-left" size={RFValue(32)} color={colors.white} />
                </TouchableOpacity>
                <Icon name="emoji-events" size={RFValue(60)} color={colors.white} style={styles.headerIcon} />
                <Text style={styles.headerTitle}>{t('premiumScreen.title')}</Text>
                <Text style={styles.headerSubtitle}>{t('premiumScreen.subtitle')}</Text>
            </LinearGradient>

            {/* Features Card */}
            <View style={styles.featuresCard}>
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
            </View>

            {/* Upgrade Button with Gradient */}
            <TouchableOpacity
                activeOpacity={0.85}
                style={styles.upgradeButtonWrapper}
                onPress={() => navigation.navigate(screens.Signup)}
            >
                <LinearGradient
                    colors={[colors.primary, colors.gold]}
                    style={styles.upgradeButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Icon name="arrow-upward" size={RFValue(22)} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.upgradeButtonText}>{t('premiumScreen.upgradeButton')}</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        padding: 0,
    },
    headerContainer: {
        width: '100%',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 30,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: 20,
        elevation: 6,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 18,
        zIndex: 2,
        padding: 4,
    },
    headerIcon: {
        marginBottom: 10,
        marginTop: 10,
    },
    headerTitle: {
        fontSize: RFValue(28),
        fontFamily: 'Sora-Bold',
        color: colors.white,
        marginBottom: 6,
        textAlign: 'center',
        letterSpacing: 1,
    },
    headerSubtitle: {
        fontSize: RFValue(15),
        fontFamily: 'Sora-Regular',
        color: colors.white,
        textAlign: 'center',
        opacity: 0.95,
        paddingHorizontal: 20,
    },
    featuresCard: {
        width: '90%',
        backgroundColor: colors.card,
        borderRadius: 18,
        paddingVertical: 25,
        paddingHorizontal: 20,
        marginBottom: 40,
        elevation: 4,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.13,
        shadowRadius: 6,
    },
    featuresContainer: {
        width: '100%',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    featureText: {
        fontSize: RFValue(16),
        fontFamily: 'Sora-SemiBold',
        color: colors.text,
        marginLeft: 12,
        letterSpacing: 0.2,
    },
    upgradeButtonWrapper: {
        width: '80%',
        alignItems: 'center',
    },
    upgradeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 30,
        paddingVertical: 16,
        paddingHorizontal: 30,
        width: '100%',
        elevation: 5,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
    },
    upgradeButtonText: {
        color: colors.white,
        fontSize: RFValue(19),
        fontFamily: 'Sora-Bold',
        letterSpacing: 0.5,
    },
});

export default PremiumScreen;
