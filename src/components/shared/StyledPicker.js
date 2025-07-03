import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    SafeAreaView,
    FlatList,
    TextInput,
    TouchableWithoutFeedback,
} from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RFValue, RFPercentage } from 'react-native-responsive-fontsize';
import Icon from 'react-native-vector-icons/MaterialIcons';

const colors = {
    primary: '#667eea',
    border: '#E5E5E5',
    activeBorder: '#667eea',
    textPrimary: '#2d3748',
    textSecondary: '#718096',
    white: '#ffffff',
    lightGray: '#f7fafc',
    overlay: 'rgba(0, 0, 0, 0.4)',
    error: '#f56565',
    lightBackground: '#FAFAFA',
};

const StyledPicker = ({ label, items, selectedValue, onValueChange, placeholder, error, icon, renderFooter, showSearch = true, iconName }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const selectedLabel = items.find(item => item.value === selectedValue)?.label || placeholder || `Select...`;

    const filteredItems = items.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
                onValueChange(item.value);
                setModalVisible(false);
                setSearchQuery('');
            }}
        >
            <Text style={styles.modalItemText}>{item.label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.pickerButton, { borderColor: error ? colors.error : colors.border }]}>
                {iconName && <Icon name={iconName} size={20} color={colors.textSecondary} style={styles.icon} />}
                <Text style={[styles.pickerButtonText, { color: selectedValue ? colors.textPrimary : colors.textSecondary }]}>
                    {selectedLabel}
                </Text>
                <Icon name="arrow-drop-down" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            {error && <Text style={styles.errorText}>{error}</Text>}

            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>{placeholder || `Select ${label || ''}`}</Text>
                                {showSearch && (
                                    <View style={styles.searchContainer}>
                                        <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search..."
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                        />
                                    </View>
                                )}
                                <FlatList
                                    data={filteredItems}
                                    renderItem={renderItem}
                                    keyExtractor={item => item.value.toString()}
                                    style={styles.modalList}
                                />
                                {renderFooter && (
                                    <View style={styles.footerContainer}>
                                        {renderFooter(() => setModalVisible(false))}
                                    </View>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        fontSize: RFPercentage(1.8),
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        backgroundColor: colors.lightBackground,
        borderColor: colors.border,
        minHeight: 50,
    },
    icon: {
        marginRight: wp('2%'),
    },
    pickerButtonText: {
        flex: 1,
        fontSize: RFPercentage(1.8),
        fontFamily: 'Sora-Regular',
        color: '#333',
    },
    errorText: {
        color: colors.error,
        fontSize: RFValue(12),
        marginTop: hp('0.5%'),
        marginLeft: wp('1%'),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: wp('5%'),
        width: wp('90%'),
        maxHeight: hp('70%'),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: RFValue(18),
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: hp('2%'),
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.lightGray,
        borderRadius: 8,
        paddingHorizontal: wp('3%'),
        marginBottom: hp('2%'),
    },
    searchIcon: {
        marginRight: wp('2%'),
    },
    searchInput: {
        flex: 1,
        fontSize: RFValue(16),
        color: colors.textPrimary,
        height: hp('6%'),
    },
    modalList: {
        // flex: 1,
    },
    footerContainer: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: hp('1%'),
        marginTop: hp('1%'),
    },
    modalItem: {
        paddingVertical: hp('2%'),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalItemText: {
        fontSize: RFValue(16),
        color: colors.textPrimary,
    },
});

export default StyledPicker; 