import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFPercentage, RFValue } from 'react-native-responsive-fontsize';

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
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={RFValue(24)} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Reports</Text>
                <View style={styles.placeholder} />
            </View>
            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Users</Text>
                    <TouchableOpacity style={styles.reportItem}>
                        <Text style={styles.reportText}>User Report</Text>
                        <Ionicons name="chevron-forward" size={RFValue(20)} color="#9e9e9e" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.reportItem}>
                        <Text style={styles.reportText}>User Summary Report</Text>
                        <Ionicons name="chevron-forward" size={RFValue(20)} color="#9e9e9e" />
                    </TouchableOpacity>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Accounts</Text>
                    <TouchableOpacity style={styles.reportItem}>
                        <Text style={styles.reportText}>Transaction Report</Text>
                        <Ionicons name="chevron-forward" size={RFValue(20)} color="#9e9e9e" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
        paddingVertical: hp(2.25), // ~18px on a 800px height screen
        paddingHorizontal: wp(4.5), // ~18px on a 400px width screen
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: wp(10), // ~40px on a 400px width screen
        height: wp(10),
        borderRadius: wp(5), // Half of width/height for circular shape
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: RFPercentage(2.5), // ~18px on a 720px height screen
        fontWeight: '700',
        color: colors.primary,
        marginLeft: wp(4), // ~16px on a 400px width screen
    },
    placeholder: {
        width: wp(10), // Matches backButton width
    },
    content: {
        flex: 1,
        padding: wp(4), // ~16px on a 400px width screen
    },
    section: {
        marginBottom: hp(3), // ~24px on a 800px height screen
    },
    sectionTitle: {
        color: '#1e88e5',
        fontSize: RFPercentage(2.5), // ~18px on a 720px height screen
        fontWeight: '600',
        marginBottom: hp(1.5), // ~12px on a 800px height screen
        paddingBottom: hp(0.5), // ~4px on a 800px height screen
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
    },
    reportItem: {
        backgroundColor: colors.background,
        padding: wp(4), // ~16px on a 400px width screen
        borderRadius: wp(2), // ~8px on a 400px width screen
        marginBottom: hp(1.5), // ~12px on a 800px height screen
        borderLeftWidth: 4,
        borderLeftColor: '#1e88e5',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reportText: {
        color: '#333333',
        fontSize: RFPercentage(2.2), // ~16px on a 720px height screen
        fontWeight: '500',
    },
});

export default ReportScreen;