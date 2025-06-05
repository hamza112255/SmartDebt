import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Alert,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

const colors = {
    primary: '#2563eb',
    background: '#ffffff',
    backgroundLight: '#ffffff',
    white: '#000000',
    black: '#000000',
    gray: '#94a3b8',
    error: '#dc2626',
    text: '#1f2937',
    border: '#e5e7eb',
};

const DrawerContent = (props) => {
    const { navigation } = props;
    const [user] = useState({
        name: 'John Doe',
        email: 'john.doe@example.com',
        avatar: 'JD',
    });

    const menuItems = [
        { id: 1, label: 'Dashboard', icon: 'dashboard', screen: 'Dashboard', active: true },
        { id: 2, label: 'Reports', icon: 'assessment', screen: 'Reports' },
        { id: 3, label: 'Settings', icon: 'settings', screen: 'Settings' },
    ];

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: () => {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    },
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <DrawerContentScrollView
                {...props}
                contentContainerStyle={styles.drawerContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header/Profile */}
                <View style={styles.header}>
                    <View style={styles.userInfo}>
                        <Avatar.Text
                            size={64}
                            label={user.avatar}
                            labelStyle={styles.avatarLabel}
                            style={styles.avatar}
                        />
                        <View style={styles.userDetails}>
                            <Text style={styles.userName}>{user.name}</Text>
                            <Text style={styles.userEmail}>{user.email}</Text>
                        </View>
                    </View>
                </View>

                {/* Navigation Menu */}
                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>MENU</Text>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.menuItem,
                                item.active && styles.menuItemActive,
                            ]}
                            onPress={() => (item.screen !== 'Dashboard') && navigation.navigate(item.screen)}
                        >
                            <View style={styles.menuItemContent}>
                                <Icon
                                    name={item.icon}
                                    size={24}
                                    color={item.active ? colors.primary : colors.gray}
                                    style={styles.menuIcon}
                                />
                                <Text
                                    style={[
                                        styles.menuLabel,
                                        item.active && styles.menuLabelActive,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </View>
                            {item.active && <View style={styles.activeIndicator} />}
                        </TouchableOpacity>
                    ))}
                </View>
            </DrawerContentScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.divider} />
                <View style={styles.appInfo}>
                    <View style={styles.appIconContainer}>
                        <Icon name="account-balance-wallet" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.appDetails}>
                        <Text style={styles.appName}>SmartDebt</Text>
                        <Text style={styles.appVersion}>Version 1.0.0</Text>
                    </View>
                </View>
                <View style={styles.footerActions}>
                    <TouchableOpacity style={styles.footerAction}>
                        <Icon name="help-outline" size={20} color={colors.gray} />
                        <Text style={styles.footerActionText}>Help & Support</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.footerAction}
                        onPress={handleLogout}
                    >
                        <MaterialIcon name="logout" size={20} color={colors.error} />
                        <Text style={[styles.footerActionText, { color: colors.error }]}>
                            Logout
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    drawerContent: { flexGrow: 1 },
    header: {
        backgroundColor: colors.backgroundLight,
        paddingHorizontal: 20,
        paddingVertical: 24,
        marginBottom: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: { backgroundColor: colors.primary },
    avatarLabel: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
    userDetails: { marginLeft: 16, flex: 1 },
    userName: { fontSize: 18, fontWeight: 'bold', color: colors.white, marginBottom: 2 },
    userEmail: { fontSize: 14, color: colors.gray },
    menuContainer: { paddingHorizontal: 20, marginBottom: 24 },
    menuTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.gray,
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 4,
        position: 'relative',
    },
    menuItemActive: { backgroundColor: 'rgba(37, 99, 235, 0.1)' },
    menuItemContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    menuIcon: { marginRight: 16 },
    menuLabel: { fontSize: 16, color: colors.gray, fontWeight: '500' },
    menuLabelActive: { color: colors.primary, fontWeight: '600' },
    activeIndicator: {
        position: 'absolute',
        right: 0,
        width: 3,
        height: 24,
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    footer: { paddingHorizontal: 20, paddingBottom: 20 },
    divider: { height: 1, backgroundColor: colors.border, marginBottom: 16 },
    appInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    appIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    appDetails: { flex: 1 },
    appName: { fontSize: 16, fontWeight: '600', color: colors.white, marginBottom: 2 },
    appVersion: { fontSize: 12, color: colors.gray },
    footerActions: { gap: 8 },
    footerAction: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    footerActionText: { fontSize: 14, color: colors.gray, marginLeft: 8 },
});

export default DrawerContent;