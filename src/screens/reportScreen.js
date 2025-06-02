import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Make sure to install @expo/vector-icons
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

const ReportScreen = ({ navigation }) => {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Reports</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Content */}
            <ScrollView style={styles.content}>
                {/* Users Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Users</Text>

                    <TouchableOpacity style={styles.reportItem}>
                        <Text style={styles.reportText}>User Report</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9e9e9e" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.reportItem}>
                        <Text style={styles.reportText}>User Summary Report</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9e9e9e" />
                    </TouchableOpacity>
                </View>

                {/* Accounts Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Accounts</Text>

                    <TouchableOpacity style={styles.reportItem}>
                        <Text style={styles.reportText}>Transaction Report</Text>
                        <Ionicons name="chevron-forward" size={20} color="#9e9e9e" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
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
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#1e88e5', // Primary blue
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    reportItem: {
        backgroundColor: '#f5f5f5',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#1e88e5', // Primary blue accent
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reportText: {
        color: '#333333',
        fontSize: 16,
        fontWeight: '500',
    },
});

export default ReportScreen;