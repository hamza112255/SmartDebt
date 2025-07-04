import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { X } from 'lucide-react-native';
import CategoriesScreen from '../screens/categoriesScreen';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

const CategoryBottomSheet = ({
  visible,
  onClose,
  onSelectCategory,
  forBudget = false,
  forTransaction = false,
  transactionType = null
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(BOTTOM_SHEET_MAX_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        bounciness: 5,
        speed: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: BOTTOM_SHEET_MAX_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 1) {
          // Close the bottom sheet if dragged down past threshold
          onClose();
        } else {
          // Snap back to open position
          Animated.spring(slideAnim, {
            toValue: 0,
            bounciness: 5,
            speed: 10,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleSelectCategory = (selectedCategoryId) => {
    onSelectCategory(selectedCategoryId);
    onClose();
  };

  return (
    <Modal
      transparent={true}
      visible={modalVisible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      
      <Animated.View
        style={[
          styles.bottomSheet,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <View style={styles.header} {...panResponder.panHandlers}>
          <View style={styles.dragIndicator} />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <CategoriesScreen
            navigation={{ goBack: onClose }}
            route={{
              params: {
                onSelectCategoryRoute: null,
                forBudget,
                forTransaction,
                transactionType,
                onSelectCategory: handleSelectCategory
              }
            }}
            isBottomSheet
          />
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BOTTOM_SHEET_MAX_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    height: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
    marginTop: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 12,
    zIndex: 1,
  },
  content: {
    flex: 1,
  },
});

export default CategoryBottomSheet; 