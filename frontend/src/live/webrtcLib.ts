// Native (iOS/Android) implementation. On web, webrtcLib.web.ts is used instead
// so react-native-webrtc is never bundled for web (it has no web build).
let mod: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require('react-native-webrtc');
} catch (e) {
  mod = null;
}

export const RNWebRTC: any = mod;
export const isWebRTCAvailable = !!(mod && mod.RTCPeerConnection && mod.mediaDevices);
export const RTCViewComp: any = mod ? mod.RTCView : null;
