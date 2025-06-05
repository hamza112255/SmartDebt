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

const SettingsScreen = ({ navigation }) => {
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
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.placeholder} />
            </View>
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
});

export default SettingsScreen;