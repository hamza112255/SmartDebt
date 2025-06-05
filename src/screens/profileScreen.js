import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
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

const ProfileScreen = ({ navigation }) => {
    const [name, setName] = useState('John Doe');
    const [email, setEmail] = useState('john.doe@example.com');
    const [password, setPassword] = useState('********');

    const handleSave = () => {
        // Simulate saving profile data
        Alert.alert('Success', 'Profile updated successfully!');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Name */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Name</Text>
                    <View style={styles.inputWrapper}>
                        <Icon name="person-outline" size={20} color={colors.gray} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your name"
                            placeholderTextColor={colors.gray}
                            autoCapitalize="words"
                        />
                    </View>
                </View>

                {/* Email */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputWrapper}>
                        <Icon name="email" size={20} color={colors.gray} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            placeholderTextColor={colors.gray}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Password */}
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputWrapper}>
                        <Icon name="lock-outline" size={20} color={colors.gray} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter your password"
                            placeholderTextColor={colors.gray}
                            secureTextEntry
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
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
        paddingVertical: 18,
        paddingHorizontal: 18,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        justifyContent:'center'
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
    inputContainer: {
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    label: {
        fontSize: 14,
        color: colors.gray,
        marginBottom: 8,
        fontWeight: '500',
    },
    inputWrapper: {
        backgroundColor: colors.white,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.gray,
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        margin: 16,
    },
    saveButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ProfileScreen;