import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io } from "socket.io-client";
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  mediaDevices,
} from "react-native-webrtc";
import { SOCKET_URL } from "../api/api";

export default function LiveConnectScreen() {
  const [cameraPermission, requestCameraPermission] =
    useCameraPermissions();

  const [micPermission, setMicPermission] = useState(false);
  const [ready, setReady] = useState(false);
  const [searching, setSearching] = useState(false);
  const [connected, setConnected] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [micOff, setMicOff] = useState(false);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerIdRef = useRef(null);
  const nextPendingRef = useRef(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  // =====================================================
  // SOCKET.IO CONNECTION
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const connectSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");

        if (!token || !mounted) {
          return;
        }

        const socket = io(SOCKET_URL, {
          auth: {
            token,
          },
          transports: ["websocket"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("Live Connect socket connected");
        });

        socket.on("connect_error", (error) => {
          console.log(
            "Live Connect socket error:",
            error.message
          );
        });

        // =================================================
        // SEARCHING
        // =================================================

        socket.on("live-searching", () => {
          if (!mounted) return;

          setSearching(true);
          setConnected(false);
        });

        // =================================================
        // MATCHED
        // =================================================

        socket.on("live-matched", async ({
          peerId,
          peerUserId,
          initiator,
        }) => {
          if (!mounted) return;

          try {
            peerIdRef.current = peerId;

            await createPeerConnection(
              peerId,
              initiator
            );
          } catch (error) {
            console.log(
              "Match/WebRTC error:",
              error
            );

            Alert.alert(
              "Connection Error",
              "Video connection start nahi ho saki."
            );
          }
        });

        // =================================================
        // OFFER
        // =================================================

        socket.on(
          "live-offer",
          async ({ from, offer }) => {
            try {
              peerIdRef.current = from;

              if (!peerConnectionRef.current) {
                await createPeerConnection(
                  from,
                  false
                );
              }

              await peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription(offer)
              );

              const answer =
                await peerConnectionRef.current.createAnswer();

              await peerConnectionRef.current.setLocalDescription(
                answer
              );

              socket.emit("live-answer", {
                to: from,
                answer,
              });
            } catch (error) {
              console.log(
                "Offer error:",
                error
              );
            }
          }
        );

        // =================================================
        // ANSWER
        // =================================================

        socket.on(
          "live-answer",
          async ({ answer }) => {
            try {
              if (!peerConnectionRef.current) {
                return;
              }

              await peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription(answer)
              );
            } catch (error) {
              console.log(
                "Answer error:",
                error
              );
            }
          }
        );

        // =================================================
        // ICE CANDIDATE
        // =================================================

        socket.on(
          "live-ice-candidate",
          async ({ candidate }) => {
            try {
              if (
                !peerConnectionRef.current ||
                !candidate
              ) {
                return;
              }

              await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate(candidate)
              );
            } catch (error) {
              console.log(
                "ICE candidate error:",
                error
              );
            }
          }
        );

        // =================================================
        // CALL ENDED
        // =================================================

        socket.on("live-ended", async () => {
          await cleanupPeerConnection();

          if (!mounted) return;

          setConnected(false);

          if (nextPendingRef.current) {
            nextPendingRef.current = false;

            setSearching(true);

            setTimeout(() => {
              if (socket.connected) {
                socket.emit("live-join");
              }
            }, 300);

            return;
          }

          setSearching(false);
        });
      } catch (error) {
        console.log(
          "Socket setup error:",
          error
        );
      }
    };

    connectSocket();

    return () => {
      mounted = false;

      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      cleanupPeerConnection();
    };
  }, []);

  // =====================================================
  // CREATE WEBRTC CONNECTION
  // =====================================================

  const createPeerConnection = async (
    peerId,
    initiator
  ) => {
    try {
      if (peerConnectionRef.current) {
        await cleanupPeerConnection();
      }

      const stream =
        localStreamRef.current ||
        (await mediaDevices.getUserMedia({
          audio: true,
          video: {
            frameRate: 30,
            facingMode: "user",
          },
        }));

      if (!localStreamRef.current) {
        localStreamRef.current = stream;
        setLocalStream(stream);
      }

      const peerConnection =
        new RTCPeerConnection({
          iceServers: [
            {
              urls: "stun:stun.l.google.com:19302",
            },
            {
              urls: "stun:stun1.l.google.com:19302",
            },
          ],
        });

      peerConnectionRef.current =
        peerConnection;

      peerConnection.onicecandidate = (
        event
      ) => {
        if (
          event.candidate &&
          socketRef.current &&
          peerId
        ) {
          socketRef.current.emit(
            "live-ice-candidate",
            {
              to: peerId,
              candidate: event.candidate,
            }
          );
        }
      };

      peerConnection.ontrack = (event) => {
        if (
          event.streams &&
          event.streams[0]
        ) {
          setRemoteStream(event.streams[0]);

          setSearching(false);
          setConnected(true);
        }
      };

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(
          track,
          stream
        );
      });

      // Initiator offer banayega
      if (initiator) {
        const offer =
          await peerConnection.createOffer();

        await peerConnection.setLocalDescription(
          offer
        );

        socketRef.current?.emit(
          "live-offer",
          {
            to: peerId,
            offer,
          }
        );
      }

      setSearching(false);
      setConnected(true);
    } catch (error) {
      console.log(
        "Peer connection error:",
        error
      );

      await cleanupPeerConnection();

      setConnected(false);
      setSearching(false);

      Alert.alert(
        "Connection Error",
        "Camera/microphone stream start nahi ho saki."
      );
    }
  };

  // =====================================================
  // CLEAN WEBRTC
  // =====================================================

  const cleanupPeerConnection =
    async () => {
      try {
        if (
          peerConnectionRef.current
        ) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }

        setRemoteStream(null);
        peerIdRef.current = null;
      } catch (error) {
        console.log(
          "Peer cleanup error:",
          error
        );
      }
    };

  const requestPermissions = async () => {
    try {
      let cameraResult = cameraPermission;

      if (!cameraResult?.granted) {
        cameraResult =
          await requestCameraPermission();
      }

      const micResult =
        await Audio.requestPermissionsAsync();

      const cameraGranted =
        cameraResult?.granted === true;

      const microphoneGranted =
        micResult.status === "granted";

      setMicPermission(
        microphoneGranted
      );

      if (
        cameraGranted &&
        microphoneGranted
      ) {
        setReady(true);
      }
    } catch (error) {
      console.log(
        "Permission error:",
        error
      );

      Alert.alert(
        "Permission Error",
        "Camera aur microphone permission nahi mil saki."
      );
    }
  };

  // =====================================================
  // FIND SOMEONE
  // =====================================================

  const findSomeone = () => {
    if (
      !cameraPermission?.granted ||
      !micPermission
    ) {
      Alert.alert(
        "Permission Required",
        "Camera aur microphone permission allow karo."
      );
      return;
    }

    if (!socketRef.current?.connected) {
      Alert.alert(
        "Connection Error",
        "Server se connection nahi hai. Thoda wait karke dobara try karo."
      );
      return;
    }

    setSearching(true);

    socketRef.current.emit(
      "live-join"
    );
  };

  // =====================================================
  // STOP SEARCHING
  // =====================================================

  const stopSearching = () => {
    nextPendingRef.current = false;

    if (socketRef.current) {
      socketRef.current.emit(
        "live-leave"
      );
    }

    setSearching(false);
  };

  // =====================================================
  // END CONNECT
  // =====================================================

  const endConnect = async () => {
    nextPendingRef.current = false;

    if (socketRef.current) {
      socketRef.current.emit(
        "live-leave"
      );
    }

    await cleanupPeerConnection();

    setConnected(false);
    setSearching(false);
  };

  // =====================================================
  // NEXT PERSON
  // =====================================================

  const nextPerson = () => {
    if (!socketRef.current) {
      return;
    }

    nextPendingRef.current = true;

    socketRef.current.emit(
      "live-next"
    );

    setConnected(false);
    setSearching(true);
  };

  // =====================================================
  // CAMERA
  // =====================================================

  const toggleCamera = () => {
    const newValue = !cameraOff;

    setCameraOff(newValue);

    const stream =
      localStreamRef.current;

    if (!stream) return;

    const videoTracks =
      stream.getVideoTracks();

    videoTracks.forEach((track) => {
      track.enabled = !newValue;
    });
  };

  // =====================================================
  // MICROPHONE
  // =====================================================

  const toggleMic = () => {
    const newValue = !micOff;

    setMicOff(newValue);

    const stream =
      localStreamRef.current;

    if (!stream) return;

    const audioTracks =
      stream.getAudioTracks();

    audioTracks.forEach((track) => {
      track.enabled = !newValue;
    });
  };

  // =====================================================
  // PERMISSION SCREEN
  // =====================================================

  if (!ready) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>
          Live Connect
        </Text>

        <Text style={styles.description}>
          Live Connect ke liye camera aur microphone
          permission allow karo.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={requestPermissions}
        >
          <Text style={styles.buttonText}>
            Allow Camera & Mic
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // =====================================================
  // SEARCHING SCREEN
  // =====================================================

  if (searching && !connected) {
    return (
      <View style={styles.center}>
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>
            🔎
          </Text>
        </View>

        <Text style={styles.title}>
          Finding Someone...
        </Text>

        <Text style={styles.description}>
          Verified aur eligible users me se koi
          available hua to match kiya jayega.
        </Text>

        <Text style={styles.smallText}>
          Dono users ko Live Connect me active hona
          zaroori hai.
        </Text>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={stopSearching}
        >
          <Text style={styles.buttonText}>
            Stop
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // =====================================================
  // 50/50 CALL UI
  // =====================================================

  if (connected) {
    return (
      <View style={styles.callContainer}>
        {/* Remote user */}
        <View style={styles.remoteVideo}>
          {remoteStream ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.camera}
              objectFit="cover"
            />
          ) : (
            <View
              style={
                styles.remotePlaceholder
              }
            >
              <View
                style={styles.remoteAvatar}
              >
                <Text
                  style={
                    styles.remoteAvatarText
                  }
                >
                  ?
                </Text>
              </View>

              <Text
                style={styles.remoteText}
              >
                Connected User
              </Text>
            </View>
          )}
        </View>

        {/* Local user */}
        <View style={styles.localVideo}>
          {!cameraOff && localStream ? (
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.camera}
              objectFit="cover"
              mirror={true}
            />
          ) : (
            <View style={styles.cameraOff}>
              <Text
                style={
                  styles.cameraOffText
                }
              >
                Camera Off
              </Text>
            </View>
          )}

          <View style={styles.youLabel}>
            <Text style={styles.labelText}>
              You
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleMic}
          >
            <Text style={styles.controlText}>
              {micOff ? "🔇" : "🎙️"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={nextPerson}
          >
            <Text style={styles.nextText}>
              Next
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleCamera}
          >
            <Text style={styles.controlText}>
              {cameraOff ? "🚫" : "📹"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endButton}
            onPress={endConnect}
          >
            <Text style={styles.endText}>
              End
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // =====================================================
  // MAIN LIVE CONNECT SCREEN
  // =====================================================

  return (
    <View style={styles.center}>
      <View style={styles.liveIcon}>
        <Text style={styles.liveIconText}>
          ●
        </Text>
      </View>

      <Text style={styles.title}>
        Live Connect
      </Text>

      <Text style={styles.description}>
        Live Connect me available verified users ke
        saath connect karo.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>
          Before you start
        </Text>

        <Text style={styles.infoText}>
          • Camera aur microphone required
        </Text>

        <Text style={styles.infoText}>
          • Sirf eligible verified users
        </Text>

        <Text style={styles.infoText}>
          • Dono users Live Connect me active honge
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={findSomeone}
      >
        <Text style={styles.buttonText}>
          Find Someone
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#0B1020",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 15,
    textAlign: "center",
  },

  description: {
    color: "#AAB2C8",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 340,
  },

  smallText: {
    color: "#7F89A3",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    maxWidth: 320,
  },

  liveIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#635BFF",
    justifyContent: "center",
    alignItems: "center",
  },

  liveIconText: {
    color: "#FFFFFF",
    fontSize: 42,
  },

  searchIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#151C32",
    justifyContent: "center",
    alignItems: "center",
  },

  searchIconText: {
    fontSize: 36,
  },

  infoBox: {
    width: "100%",
    backgroundColor: "#151C32",
    borderRadius: 18,
    padding: 20,
    marginTop: 25,
    marginBottom: 20,
  },

  infoTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },

  infoText: {
    color: "#AAB2C8",
    fontSize: 14,
    marginTop: 7,
  },

  primaryButton: {
    backgroundColor: "#635BFF",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 22,
  },

  secondaryButton: {
    backgroundColor: "#30384F",
    paddingHorizontal: 35,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 28,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  callContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },

  remoteVideo: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#151C32",
  },

  localVideo: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#111827",
  },

  camera: {
    flex: 1,
  },

  remotePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  remoteAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#635BFF",
    justifyContent: "center",
    alignItems: "center",
  },

  remoteAvatarText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },

  remoteText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
  },

  cameraOff: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111111",
  },

  cameraOffText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  youLabel: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  labelText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  controls: {
    position: "absolute",
    bottom: 22,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  controlButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(20,20,30,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  controlText: {
    fontSize: 21,
  },

  nextButton: {
    backgroundColor: "#635BFF",
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 25,
  },

  nextText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  endButton: {
    backgroundColor: "#E53935",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
  },

  endText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});