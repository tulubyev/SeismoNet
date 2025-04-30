import axios from 'axios';

interface TelegramMessage {
  chatId: string | number;
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2' | 'Markdown';
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  replyToMessageId?: number;
}

/**
 * Send a message to a Telegram chat using the Telegram Bot API
 * Documentation: https://core.telegram.org/bots/api#sendmessage
 */
export async function sendTelegramMessage(
  botToken: string,
  params: TelegramMessage
): Promise<boolean> {
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return false;
  }

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: params.chatId,
        text: params.text,
        parse_mode: params.parseMode,
        disable_web_page_preview: params.disableWebPagePreview,
        disable_notification: params.disableNotification,
        reply_to_message_id: params.replyToMessageId
      }
    );

    if (response.data.ok) {
      console.log('Telegram message sent successfully');
      return true;
    } else {
      console.error('Telegram API error:', response.data.description);
      return false;
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

/**
 * Send a seismic event notification to a Telegram chat
 */
export async function sendSeismicEventAlert(
  botToken: string,
  chatId: string | number,
  eventDetails: {
    eventId: string;
    region: string;
    location: string;
    magnitude: number;
    depth: number;
    timestamp: number;
  }
): Promise<boolean> {
  const date = new Date(eventDetails.timestamp);
  const formattedDate = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  // Create magnitude indicator with emoji based on severity
  let magnitudeEmoji = '🟢'; // Minor
  if (eventDetails.magnitude >= 5.0) {
    magnitudeEmoji = '🔴'; // Major
  } else if (eventDetails.magnitude >= 3.5) {
    magnitudeEmoji = '🟠'; // Moderate
  } else if (eventDetails.magnitude >= 2.0) {
    magnitudeEmoji = '🟡'; // Light
  }

  const message = `
🚨 *SEISMIC EVENT DETECTED* 🚨

*Event ID:* ${eventDetails.eventId}
*Magnitude:* ${magnitudeEmoji} ${eventDetails.magnitude.toFixed(1)}
*Location:* ${eventDetails.location}
*Region:* ${eventDetails.region}
*Depth:* ${eventDetails.depth.toFixed(1)} km
*Time:* ${formattedDate}

Check the dashboard for more information.
`;

  return sendTelegramMessage(botToken, {
    chatId,
    text: message,
    parseMode: 'Markdown',
    disableWebPagePreview: true,
    disableNotification: false
  });
}

/**
 * Send a maintenance notification to a Telegram chat
 */
export async function sendMaintenanceAlert(
  botToken: string,
  chatId: string | number,
  maintenanceDetails: {
    stationId: string;
    stationName: string;
    maintenanceType: string;
    scheduledAt: Date;
    description: string;
  }
): Promise<boolean> {
  const formattedDate = maintenanceDetails.scheduledAt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const message = `
🔧 *SCHEDULED MAINTENANCE* 🔧

*Station:* ${maintenanceDetails.stationName} (${maintenanceDetails.stationId})
*Maintenance Type:* ${maintenanceDetails.maintenanceType}
*Scheduled Time:* ${formattedDate}
*Description:* ${maintenanceDetails.description}

Check the maintenance schedule in the dashboard for more details.
`;

  return sendTelegramMessage(botToken, {
    chatId,
    text: message,
    parseMode: 'Markdown',
    disableWebPagePreview: true,
    disableNotification: false
  });
}

/**
 * Send a low battery alert to a Telegram chat
 */
export async function sendLowBatteryAlert(
  botToken: string,
  chatId: string | number,
  stationDetails: {
    stationId: string;
    stationName: string;
    batteryLevel: number;
    batteryVoltage: number;
    estimatedRuntime: number; // hours
  }
): Promise<boolean> {
  let alertEmoji = '⚠️'; // Warning
  let alertText = 'WARNING';
  
  if (stationDetails.batteryLevel < 20) {
    alertEmoji = '🔴'; // Critical
    alertText = 'CRITICAL';
  }

  const message = `
${alertEmoji} *${alertText}: LOW BATTERY* ${alertEmoji}

*Station:* ${stationDetails.stationName} (${stationDetails.stationId})
*Battery Level:* ${stationDetails.batteryLevel}%
*Battery Voltage:* ${stationDetails.batteryVoltage.toFixed(1)}V
*Estimated Runtime:* ${stationDetails.estimatedRuntime.toFixed(1)} hours

*Action Required:* ${stationDetails.batteryLevel < 20 ? 
  'Immediate attention required. Station may shutdown soon.' : 
  'Plan maintenance to recharge or replace batteries.'}

Check the station status in the dashboard for more information.
`;

  return sendTelegramMessage(botToken, {
    chatId,
    text: message,
    parseMode: 'Markdown',
    disableWebPagePreview: true,
    disableNotification: false
  });
}

/**
 * Send a network status update to a Telegram chat
 */
export async function sendNetworkStatusUpdate(
  botToken: string,
  chatId: string | number,
  statusDetails: {
    activeStations: number;
    totalStations: number;
    dataProcessingHealth: number;
    networkConnectivityHealth: number;
    storageCapacityHealth: number;
  }
): Promise<boolean> {
  // Calculate overall health percentage
  const overallHealth = Math.round(
    (statusDetails.dataProcessingHealth + 
     statusDetails.networkConnectivityHealth + 
     statusDetails.storageCapacityHealth) / 3
  );
  
  // Generate status indicators
  const stationStatus = `${statusDetails.activeStations}/${statusDetails.totalStations}`;
  const stationPercentage = Math.round((statusDetails.activeStations / statusDetails.totalStations) * 100);
  
  let statusEmoji = '🟢'; // Good
  if (overallHealth < 70) {
    statusEmoji = '🔴'; // Poor
  } else if (overallHealth < 90) {
    statusEmoji = '🟠'; // Fair
  }

  const message = `
📊 *NETWORK STATUS UPDATE* 📊

*Active Stations:* ${stationStatus} (${stationPercentage}%)
*Overall System Health:* ${statusEmoji} ${overallHealth}%

*Component Health:*
- Data Processing: ${statusDetails.dataProcessingHealth}%
- Network Connectivity: ${statusDetails.networkConnectivityHealth}%
- Storage Capacity: ${statusDetails.storageCapacityHealth}%

${new Date().toLocaleString('en-US')}
`;

  return sendTelegramMessage(botToken, {
    chatId,
    text: message,
    parseMode: 'Markdown',
    disableWebPagePreview: true,
    disableNotification: true
  });
}