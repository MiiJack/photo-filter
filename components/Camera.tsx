import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useState, useRef, useEffect} from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Alert, Dimensions } from 'react-native';
import {
  Canvas,
  Image,
  useImage,
  ColorMatrix,
} from '@shopify/react-native-skia';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
  }
}

const getToken = async()=> {
  const token = await messaging().getToken()
  console.log("Token = ", token)
}

const { width, height } = Dimensions.get('window');

// Filter matrices
const filters = {
  normal: [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0,
  ],
  sepia: [
    0.393, 0.769, 0.189, 0, 0,
    0.349, 0.686, 0.168, 0, 0,
    0.272, 0.534, 0.131, 0, 0,
    0, 0, 0, 1, 0,
  ],
  grayscale: [
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0, 0, 0, 1, 0,
  ],
  vintage: [
    0.9, 0.5, 0.1, 0, 0,
    0.3, 0.8, 0.1, 0, 0,
    0.2, 0.3, 0.5, 0, 0,
    0, 0, 0, 1, 0,
  ],
};

messaging().onMessage(async remoteMessage => {
    await Notifications.scheduleNotificationAsync({
        content:{
            title: remoteMessage.notification?.title || 'New Notification',
            body: remoteMessage.notification?.body || '',
            data: remoteMessage.data,
            },
        trigger: null,
        });
    });

function CameraApp() {
useEffect(() => {
  requestUserPermission()
  getToken()
},[])

  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const cameraRef = useRef<any>(null);

  const image = useImage(capturedImage);

  if (!cameraPermission || !mediaPermission) {
    return <View />;
  }

  if (!cameraPermission.granted || !mediaPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need camera and media library permissions</Text>
        <Button
          onPress={async () => {
            await requestCameraPermission();
            await requestMediaPermission();
          }}
          title="Grant permissions"
        />
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setCapturedImage(photo.uri);
      } catch (error) {
        Alert.alert('Error', 'Failed to take photo: ' + error.message);
      }
    }
  };

  const savePhoto = async () => {
    if (capturedImage) {
      try {
        const asset = await MediaLibrary.createAssetAsync(capturedImage);
        await MediaLibrary.createAlbumAsync('Camera App', asset, false);
        Alert.alert('Success', 'Photo saved to gallery!');
        setCapturedImage(null); // Reset to camera view
        // TODO: save filter
      } catch (error) {
        Alert.alert('Error', 'Failed to save photo: ' + error.message);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setSelectedFilter('normal');
  };

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  if (capturedImage && image) {
    const imageWidth = image.width();
    const imageHeight = image.height();
    const scale = Math.min(width / imageWidth, height / imageHeight);
    const scaledWidth = imageWidth * scale;
    const scaledHeight = imageHeight * scale;

    return (
      <View style={styles.container}>
        <Canvas style={styles.canvas}>
          <Image
            image={image}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="contain"
          >
            <ColorMatrix matrix={filters[selectedFilter]} />
          </Image>
        </Canvas>

        <View style={styles.editButtonsContainer}>
          <TouchableOpacity style={styles.editButton} onPress={retakePhoto}>
            <Text style={styles.editButtonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.editButton} onPress={savePhoto}>
            <Text style={styles.editButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          {Object.keys(filters).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonSelected,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={styles.filterButtonText}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Flip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={takePicture}>
            <View style={styles.captureButton}>
              <View style={styles.captureButtonInner} />
            </View>
          </TouchableOpacity>

          <View style={styles.button} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  canvas: {
    flex: 1,
    backgroundColor: 'black',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  button: {
    flex: 1,
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  filterButtonText: {
    color: 'white',
    fontSize: 12,
  },
});

export default CameraApp;