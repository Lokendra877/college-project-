import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/lib/device-id';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google STUN servers (free, highly reliable)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Open Relay TURN servers (free, community-provided)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:80?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turns:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

type SignalMessage = {
  type: 'listener-join' | 'offer' | 'answer' | 'ice-candidate' | 'speaker-left' | 'speaker-ready';
  from: string;
  to?: string;
  payload?: any;
};

export type EQBand = 'bass' | 'mid' | 'treble';

export interface AudioEnhancementSettings {
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
}

const DEFAULT_ENHANCEMENTS: AudioEnhancementSettings = {
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
};

export function useWebRTC(sessionId: string | undefined, isSpeaking: boolean) {
  const deviceId = getDeviceId();
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<Record<EQBand, BiquadFilterNode | null>>({ bass: null, mid: null, treble: null });
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordableStreamRef = useRef<MediaStream | null>(null);
  const streamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [enhancements, setEnhancements] = useState<AudioEnhancementSettings>(DEFAULT_ENHANCEMENTS);
  const [inputLevel, setInputLevel] = useState(0);
  const isSpeakingRef = useRef(isSpeaking);
  const mountedRef = useRef(true);
  const enhancementsRef = useRef(enhancements);

  useEffect(() => {
    enhancementsRef.current = enhancements;
  }, [enhancements]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const safeSet = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    if (mountedRef.current) setter(value);
  };

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      // EQ filters
      const bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 200;
      bass.gain.value = 0;

      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1.0;
      mid.gain.value = 0;

      const treble = ctx.createBiquadFilter();
      treble.type = 'highshelf';
      treble.frequency.value = 3000;
      treble.gain.value = 0;

      filtersRef.current = { bass, mid, treble };

      // Dynamics compressor for auto-leveling
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      compressorRef.current = compressor;

      // Output gain for volume normalization
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0;
      gainNodeRef.current = gainNode;

      // Analyser for level metering
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
    }
    return audioContextRef.current;
  };

  const connectAudioPipeline = (audioEl: HTMLAudioElement) => {
    const ctx = initAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch {}
    }

    const source = ctx.createMediaElementSource(audioEl);
    sourceNodeRef.current = source;
    const { bass, mid, treble } = filtersRef.current;
    const compressor = compressorRef.current;
    const gainNode = gainNodeRef.current;
    const analyser = analyserRef.current;

    if (bass && mid && treble && compressor && gainNode && analyser) {
      // Chain: source -> bass -> mid -> treble -> compressor -> gain -> analyser -> destination
      source.connect(bass);
      bass.connect(mid);
      mid.connect(treble);
      treble.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(ctx.destination);

      // Create a recordable stream from the processed audio
      if (!streamDestRef.current) {
        streamDestRef.current = ctx.createMediaStreamDestination();
      }
      try { analyser.disconnect(streamDestRef.current); } catch {}
      analyser.connect(streamDestRef.current);
      recordableStreamRef.current = streamDestRef.current.stream;
    } else {
      source.connect(ctx.destination);
      // Fallback: create recordable stream from unprocessed source
      if (!streamDestRef.current) {
        streamDestRef.current = ctx.createMediaStreamDestination();
      }
      try { source.disconnect(streamDestRef.current); } catch {}
      source.connect(streamDestRef.current);
      recordableStreamRef.current = streamDestRef.current.stream;
    }

    // Start level metering
    startLevelMetering();
  };

  const startLevelMetering = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (!mountedRef.current || !analyserRef.current) return;
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
      safeSet(setInputLevel, Math.round((avg / 255) * 100));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const setEQ = (band: EQBand, gainDb: number) => {
    const filter = filtersRef.current[band];
    if (filter) filter.gain.value = gainDb;
  };

  const setVolume = (value: number) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = Math.max(0, Math.min(2, value));
    }
  };

  const updateEnhancement = (key: keyof AudioEnhancementSettings, value: boolean) => {
    setEnhancements(prev => ({ ...prev, [key]: value }));
    // Apply to active stream if exists
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        try {
          track.applyConstraints({
            noiseSuppression: key === 'noiseSuppression' ? value : enhancementsRef.current.noiseSuppression,
            echoCancellation: key === 'echoCancellation' ? value : enhancementsRef.current.echoCancellation,
            autoGainControl: key === 'autoGainControl' ? value : enhancementsRef.current.autoGainControl,
          });
        } catch {}
      }
    }
  };

  const createAudioElement = () => {
    if (!remoteAudioRef.current) {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.volume = 1.0;
      audio.crossOrigin = 'anonymous';
      audio.style.display = 'none';
      document.body.appendChild(audio);
      remoteAudioRef.current = audio;
    }
    return remoteAudioRef.current;
  };

  const cleanupPeer = (peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    pendingCandidatesRef.current.delete(peerId);
  };

  const cleanupAll = () => {
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch {}
      sourceNodeRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }

    safeSet(setIsStreaming, false);
    safeSet(setIsReceiving, false);
    safeSet(setMicError, null);
    safeSet(setInputLevel, 0);
  };

  const helpersRef = useRef({ createAudioElement, cleanupPeer, cleanupAll });
  helpersRef.current = { createAudioElement, cleanupPeer, cleanupAll };

  // Main signaling channel
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`webrtc-${sessionId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    const createOfferForListener = async (listenerId: string) => {
      if (!localStreamRef.current || !channelRef.current) return;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current.set(listenerId, pc);

      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.onicecandidate = (e) => {
        if (e.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              type: 'ice-candidate',
              from: deviceId,
              to: listenerId,
              payload: e.candidate.toJSON(),
            } as SignalMessage,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          helpersRef.current.cleanupPeer(listenerId);
        }
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'offer', from: deviceId, to: listenerId, payload: offer } as SignalMessage,
        });
      } catch (err) {
        console.warn('WebRTC: Failed to create offer:', err);
      }
    };

    const handleOffer = async (speakerId: string, offer: RTCSessionDescriptionInit) => {
      if (!channelRef.current) return;

      helpersRef.current.cleanupPeer(speakerId);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current.set(speakerId, pc);

      pc.ontrack = (e) => {
        const audio = helpersRef.current.createAudioElement();
        audio.srcObject = e.streams[0];
        remoteStreamRef.current = e.streams[0];
        if (!sourceNodeRef.current) {
          connectAudioPipeline(audio);
        }
        audio.play().catch(() => {});
        safeSet(setIsReceiving, true);
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              type: 'ice-candidate',
              from: deviceId,
              to: speakerId,
              payload: e.candidate.toJSON(),
            } as SignalMessage,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          helpersRef.current.cleanupPeer(speakerId);
          safeSet(setIsReceiving, false);
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Flush pending candidate queue
        const pending = pendingCandidatesRef.current.get(speakerId) || [];
        for (const cand of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        pendingCandidatesRef.current.delete(speakerId);

        channelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'answer', from: deviceId, to: speakerId, payload: answer } as SignalMessage,
        });
      } catch (err) {
        console.warn('WebRTC: Failed to handle offer:', err);
      }
    };

    channel.on('broadcast', { event: 'signal' }, ({ payload }: { payload: SignalMessage }) => {
      if (payload.to && payload.to !== deviceId) return;

      switch (payload.type) {
        case 'listener-join':
          if (isSpeakingRef.current && localStreamRef.current) {
            createOfferForListener(payload.from);
          }
          break;

        case 'speaker-ready':
          if (!isSpeakingRef.current) {
            helpersRef.current.cleanupPeer(payload.from);
            channelRef.current?.send({
              type: 'broadcast',
              event: 'signal',
              payload: { type: 'listener-join', from: deviceId } as SignalMessage,
            });
          }
          break;

        case 'offer':
          if (!isSpeakingRef.current) {
            handleOffer(payload.from, payload.payload);
          }
          break;

        case 'answer': {
          const pc = peerConnectionsRef.current.get(payload.from);
          if (pc && pc.signalingState === 'have-local-offer') {
            pc.setRemoteDescription(new RTCSessionDescription(payload.payload))
              .then(async () => {
                const pending = pendingCandidatesRef.current.get(payload.from) || [];
                for (const cand of pending) {
                  await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                }
                pendingCandidatesRef.current.delete(payload.from);
              })
              .catch(() => {});
          }
          break;
        }

        case 'ice-candidate': {
          const conn = peerConnectionsRef.current.get(payload.from);
          if (conn && conn.remoteDescription && conn.remoteDescription.type) {
            conn.addIceCandidate(new RTCIceCandidate(payload.payload)).catch(() => {});
          } else {
            const pending = pendingCandidatesRef.current.get(payload.from) || [];
            pending.push(payload.payload);
            pendingCandidatesRef.current.set(payload.from, pending);
          }
          break;
        }

        case 'speaker-left':
          helpersRef.current.cleanupPeer(payload.from);
          safeSet(setIsReceiving, false);
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
          }
          break;
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, deviceId]);

  // When user becomes/stops being speaker — capture mic with enhancements
  useEffect(() => {
    if (isSpeaking) {
      const settings = enhancementsRef.current;

      const requestMicStream = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Microphone requires a secure HTTPS connection when accessed from mobile devices.');
        }

        try {
          return await navigator.mediaDevices.getUserMedia({
            audio: {
              noiseSuppression: settings.noiseSuppression,
              echoCancellation: settings.echoCancellation,
              autoGainControl: settings.autoGainControl,
            },
          });
        } catch (err) {
          // Mobile browser fallback if advanced audio constraints fail
          return await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      };

      requestMicStream()
        .then((stream) => {
          if (!mountedRef.current) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          localStreamRef.current = stream;
          setIsStreaming(true);
          setMicError(null);

          setTimeout(() => {
            channelRef.current?.send({
              type: 'broadcast',
              event: 'signal',
              payload: { type: 'speaker-ready', from: deviceId } as SignalMessage,
            });
          }, 500);
        })
        .catch((err: any) => {
          if (!mountedRef.current) return;
          console.warn('Microphone access failed:', err);
          setMicError(err.message || 'Microphone access denied. Please grant permission.');
          setIsStreaming(false);
        });
    } else {
      if (localStreamRef.current) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'speaker-left', from: deviceId } as SignalMessage,
        });
      }
      helpersRef.current.cleanupAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking, deviceId]);

  // Initial listener announcement
  useEffect(() => {
    if (!sessionId || isSpeaking) return;

    const timeout = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { type: 'listener-join', from: deviceId } as SignalMessage,
      });
    }, 1500);

    return () => clearTimeout(timeout);
  }, [sessionId, isSpeaking, deviceId]);

  return {
    isStreaming,
    isReceiving,
    micError,
    cleanupAll,
    remoteAudioRef,
    remoteStreamRef,
    recordableStreamRef,
    setEQ,
    setVolume,
    enhancements,
    updateEnhancement,
    inputLevel,
    analyserRef,
  };
}
