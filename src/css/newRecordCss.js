import { StyleSheet, Platform } from 'react-native';
import { RFPercentage } from 'react-native-responsive-fontsize';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';


const colors = {
    primary: '#667eea',
    primaryDark: '#5a67d8',
    secondary: '#764ba2',
    success: '#48bb78',
    successLight: '#68d391',
    error: '#f56565',
    errorLight: '#fc8181',
    background: '#f7fafc',
    white: '#ffffff',
    gray: '#718096',
    lightGray: '#e2e8f0',
    darkGray: '#4a5568',
    border: '#e2e8f0',
    activeBorder: '#667eea',
    textPrimary: '#2d3748',
    textSecondary: '#718096',
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.4)',
    cardShadow: 'rgba(102, 126, 234, 0.15)',
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
        elevation: 8,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    backButton: {
        width: wp(10),
        height: wp(10),
        borderRadius: wp(5),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: RFPercentage(2.6),
        fontFamily: 'Sora-Bold',
        color: colors.white,
        flex: 1,
        textAlign: 'center',
        marginLeft: -wp(10),
    },
    placeholder: {
        width: wp(10),
    },
    scrollContent: {
        paddingTop: hp(2),
        paddingBottom: hp(12),
        paddingHorizontal: wp(4),
    },
    cardContainer: {
        backgroundColor: colors.white,
        borderRadius: wp(4),
        padding: wp(4),
        marginBottom: hp(2),
        elevation: 4,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    sectionTitle: {
        fontSize: RFPercentage(2.2),
        fontFamily: 'Sora-SemiBold',
        color: colors.textPrimary,
        marginBottom: hp(1.5),
    },
    required: {
        color: colors.error,
    },
    typeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: hp(1.5),
    },
    typeButton: {
        flex: 1,
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(3),
        borderRadius: wp(3),
        backgroundColor: colors.lightGray,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: wp(2),
    },
    typeButtonActive: {
        backgroundColor: 'transparent',
    },
    typeButtonText: {
        fontSize: RFPercentage(2),
        fontFamily: 'Sora-Medium',
        color: colors.textSecondary,
    },
    typeButtonTextActive: {
        color: colors.primary,
        fontFamily: 'Sora-Bold'
    },
    typeButtonContent: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: hp(1), // ~8px
        gap: wp(3), // ~12px
    },
    inputContainer: {
        flex: 1,
        marginBottom: hp(2.25), // ~18px
    },
    label: {
        fontSize: RFPercentage(2), // ~14px
        fontFamily: 'Sora-SemiBold',
        color: colors.gray,
        marginBottom: hp(0.75), // ~6px
    },
    required: {
        color: colors.error,
        fontSize: RFPercentage(2), // ~14px
    },
    dateTimeInput: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.5), // ~12px
        paddingHorizontal: wp(3.5), // ~14px
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: hp(0.125) }, // ~1px
    },
    inputFocused: {
        borderColor: colors.activeBorder,
        borderWidth: 2,
        elevation: 3,
        shadowOpacity: 0.15,
    },
    inputIcon: {
        marginRight: wp(2.5), // ~10px
    },
    dateTimeText: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        color: colors.textPrimary,
    },
    dropdownInput: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(4), // ~16px
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    dropdownText: {
        fontSize: RFPercentage(2.2), // ~16px
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    dropdownText: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        color: colors.gray,
        flex: 1,
    },
    dropdownItem: {
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dropdownItemText: {
        fontSize: 16,
        color: colors.textPrimary,
    },
    addMoreContactButton: {
        marginTop: hp(1), // ~8px
        paddingVertical: hp(1.25), // ~10px
        paddingHorizontal: wp(4), // ~16px
        borderWidth: 1,
        borderColor: colors.gray,
        borderRadius: wp(2.5), // ~10px
        borderStyle: 'dashed',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    addMoreText: {
        fontSize: RFPercentage(2), // ~14px
        fontFamily: 'Sora-Regular',
        color: colors.gray,
        fontWeight: '600',
    },
    input: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(4), // ~16px
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: hp(0.5), // ~4px
    },
    amountInput: {
        flex: 1,
        fontSize: RFPercentage(2.5), // ~18px
        marginRight: wp(2), // ~8px
    },
    currencyButton: {
        backgroundColor: colors.primary,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(4), // ~16px
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
    },
    currencyText: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Bold',
        color: colors.white,
        marginRight: wp(2), // ~8px
    },
    remarkInput: {
        height: hp(12.5), // ~100px
        textAlignVertical: 'top',
        marginTop: hp(1), // ~8px
    },
    attachmentButton: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        width: wp(17.5), // ~70px
        height: wp(17.5),
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        marginTop: hp(1), // ~8px
    },
    floatingButtonsWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'box-none',
        alignItems: 'center',
    },
    floatingButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: wp(3), // ~12px
        width: '100%',
        maxWidth: wp(90), // ~360px on a 400px width screen
        marginHorizontal: 'auto',
        paddingHorizontal: wp(4.5), // ~18px
        paddingBottom: Platform.OS === 'ios' ? hp(3.5) : hp(2), // ~28px or ~16px
        paddingTop: 0,
        backgroundColor: 'transparent',
    },
    floatingButton: {
        flex: 1,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: wp(1.5), // ~6px
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderWidth: 0,
        marginLeft: wp(1.5), // ~6px
    },
    deleteButton: {
        backgroundColor: 'transparent',
        borderColor: colors.error,
        marginRight: wp(1.5),
    },
    buttonText: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Bold',
        color: colors.white,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalButtonText: {
        marginLeft: 12,
        fontSize: 16,
    },
    cancelButton: {
        padding: 14,
        marginTop: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: colors.error,
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    bottomSheetContainer: {
        justifyContent: 'flex-end',
    },
    bottomSheetContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 16,
    },
    bottomSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: colors.gray,
        borderRadius: 2,
        alignSelf: 'center',
        marginVertical: 8,
    },
    bottomSheetTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 8,
    },
    bottomSheetOption: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    bottomSheetText: {
        fontSize: 16,
        textAlign: 'center',
    },
    bottomSheetCancel: {
        padding: 16,
        marginTop: 8,
    },
    bottomSheetCancelText: {
        fontSize: 16,
        color: colors.error,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    imageContainer: {
        width: wp(17.5),
        height: wp(17.5),
        borderRadius: wp(3),
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    removeImageButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: colors.error,
        padding: wp(1),
        borderRadius: wp(2),
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    addContactBtn: {
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
    contactItem: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    addContactButton: {
        padding: 16,
        backgroundColor: colors.primary,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    addContactText: {
        color: colors.white,
        fontWeight: 'bold',
    },
    bottomSheetContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 32,
    },
    bottomSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: colors.gray,
        borderRadius: 2,
        alignSelf: 'center',
        marginVertical: 8,
    },
    bottomSheetOption: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalOptionText: {
        flex: 1,
        marginLeft: 16,
        fontSize: 16,
        color: colors.textPrimary,
    },
    dropdownScroll: {
        maxHeight: 150,
    },
    addContactBtnText: {
        marginLeft: 8,
        color: colors.primary,
        fontWeight: '500',
    },
    selectInput: {
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(4), // ~16px
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
    },
    selectInputText: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        color: colors.textPrimary,
        flex: 1,
    },
    selectInputPlaceholder: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        color: colors.textSecondary,
        flex: 1,
    },
    modalItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    addNewButton: {
        padding: 16,
        backgroundColor: colors.background,
        alignItems: 'center',
    },
    addNewText: {
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Bold',
        color: colors.primary,
    },
    modalInput: {
        height: hp(12.5), // ~100px
        textAlignVertical: 'top',
        padding: 16,
        backgroundColor: colors.white,
        borderRadius: wp(3), // ~12px
        paddingVertical: hp(1.75), // ~14px
        paddingHorizontal: wp(4), // ~16px
        fontSize: RFPercentage(2.2), // ~16px
        fontFamily: 'Sora-Regular',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: hp(0.25) }, // ~2px
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    modalButton: {
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(5),
        borderRadius: wp(2),
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: wp(30),
    },
    cancelButton: {
        backgroundColor: colors.errorLight,
    },
    saveButton: {
        backgroundColor: colors.successLight,
    },
    modalButtonText: {
        color: colors.white,
        fontSize: RFPercentage(2),
        fontFamily: 'Sora-SemiBold',
    },
});
export default styles;