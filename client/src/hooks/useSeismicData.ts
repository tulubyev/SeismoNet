import { useState, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { 
  WebSocketMessageType, 
  Station, 
  Event, 
  LiveWaveformData, 
  NetworkStatusUpdate,
  ResearchNetwork,
  DataExchangeUpdate,
  EventNotification,
  EpicenterCalculation
} from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

export function useSeismicData() {
  const { isConnected, onMessage, sendMessage } = useWebSocket();
  
  // State for seismic data
  const [stations, setStations] = useState<Station[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [waveformData, setWaveformData] = useState<Record<string, LiveWaveformData>>({});
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusUpdate>({
    activeStations: 0,
    totalStations: 0,
    dataProcessingHealth: 0,
    networkConnectivityHealth: 0,
    storageCapacityHealth: 0,
    apiPerformanceHealth: 0
  });
  const [researchNetworks, setResearchNetworks] = useState<ResearchNetwork[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [epicenterCalculation, setEpicenterCalculation] = useState<EpicenterCalculation | null>(null);
  
  // Load initial data from API
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch stations
        const stationsRes = await apiRequest('GET', '/api/stations');
        const stationsData = await stationsRes.json();
        setStations(stationsData);
        
        // Fetch recent events
        const eventsRes = await apiRequest('GET', '/api/events/recent');
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
        
        // Fetch research networks
        const networksRes = await apiRequest('GET', '/api/networks');
        const networksData = await networksRes.json();
        setResearchNetworks(networksData);
        
        // Set first event as selected
        if (eventsData.length > 0) {
          setSelectedEvent(eventsData[0]);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    
    fetchInitialData();
  }, []);
  
  // Register WebSocket event handlers
  useEffect(() => {
    if (!isConnected) return;
    
    // Handle station status updates
    const unsubscribeStations = onMessage(WebSocketMessageType.STATION_STATUS, (payload: Station[]) => {
      setStations(payload);
    });
    
    // Handle waveform data
    const unsubscribeWaveform = onMessage(WebSocketMessageType.WAVEFORM_DATA, (payload: LiveWaveformData) => {
      setWaveformData(prev => ({
        ...prev,
        [payload.stationId]: payload
      }));
    });
    
    // Handle network status updates
    const unsubscribeNetwork = onMessage(WebSocketMessageType.NETWORK_STATUS, (payload: NetworkStatusUpdate) => {
      setNetworkStatus(payload);
    });
    
    // Handle event notifications
    const unsubscribeEvents = onMessage(WebSocketMessageType.EVENT_NOTIFICATION, (payload: EventNotification | Event) => {
      if (Array.isArray(payload)) {
        setEvents(payload);
      } else {
        setEvents(prev => {
          // Check if event already exists
          const eventExists = prev.some(event => 
            'eventId' in payload && event.eventId === payload.eventId
          );
          
          if (eventExists) {
            // Update the existing event
            return prev.map(event => 
              'eventId' in payload && event.eventId === payload.eventId ? payload as Event : event
            );
          } else {
            // Add the new event to the beginning of the array
            return [payload as Event, ...prev];
          }
        });
      }
    });
    
    // Handle epicenter calculation updates
    const unsubscribeEpicenter = onMessage(WebSocketMessageType.EPICENTER_CALCULATION, (payload: EpicenterCalculation) => {
      setEpicenterCalculation(payload);
    });
    
    // Handle data exchange updates
    const unsubscribeDataExchange = onMessage(WebSocketMessageType.DATA_EXCHANGE, (payload: DataExchangeUpdate | ResearchNetwork[]) => {
      if (Array.isArray(payload)) {
        setResearchNetworks(payload);
      } else {
        setResearchNetworks(prev => {
          return prev.map(network => 
            network.networkId === payload.networkId 
              ? {
                  ...network,
                  connectionStatus: payload.connectionStatus,
                  syncedDataVolume: payload.dataTransferred,
                  lastSyncTimestamp: payload.lastSync ? new Date(payload.lastSync) : network.lastSyncTimestamp
                }
              : network
          );
        });
      }
    });
    
    // Clean up subscriptions
    return () => {
      unsubscribeStations();
      unsubscribeWaveform();
      unsubscribeNetwork();
      unsubscribeEvents();
      unsubscribeEpicenter();
      unsubscribeDataExchange();
    };
  }, [isConnected, onMessage]);
  
  // Select an event and request its calculation details
  const selectEvent = (eventId: string) => {
    const event = events.find(e => e.eventId === eventId);
    if (event) {
      setSelectedEvent(event);
      
      // Request epicenter calculation details
      sendMessage(WebSocketMessageType.EVENT_NOTIFICATION, { eventId });
    }
  };
  
  return {
    isConnected,
    stations,
    events,
    waveformData,
    networkStatus,
    researchNetworks,
    selectedEvent,
    epicenterCalculation,
    selectEvent
  };
}
