import axios from 'axios';

interface EmailParams {
  to: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

/**
 * Unisender email service for sending emails in Russia
 * Documentation: https://www.unisender.com/en/support/api/email/sendemail/
 */
export async function sendEmail(
  apiKey: string,
  params: EmailParams
): Promise<boolean> {
  if (!apiKey) {
    console.error('UNISENDER_API_KEY not set');
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('api_key', apiKey);
    formData.append('format', 'json');
    formData.append('email', params.to);
    formData.append('sender_name', params.fromName);
    formData.append('sender_email', params.fromEmail);
    formData.append('subject', params.subject);
    formData.append('body', params.body);
    formData.append('list_id', ''); // Optional, depends on your Unisender setup
    
    if (params.isHtml) {
      formData.append('wrap_type', 'html');
    }

    const response = await axios.post(
      'https://api.unisender.com/en/api/sendEmail',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (response.data.result && response.data.result.email_id) {
      console.log(`Email sent via Unisender. Email ID: ${response.data.result.email_id}`);
      return true;
    } else {
      console.error('Unisender API error:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('Error sending email via Unisender:', error);
    return false;
  }
}

/**
 * Sends a notification email about seismic event via Unisender
 */
export async function sendSeismicEventNotification(
  apiKey: string,
  recipients: string[],
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

  const subject = `Seismic Event Alert: M${eventDetails.magnitude.toFixed(1)} in ${eventDetails.region}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h1 style="color: #d32f2f; margin-top: 0;">Seismic Event Detected</h1>
      <p style="font-size: 18px;"><strong>Event ID:</strong> ${eventDetails.eventId}</p>
      <p style="font-size: 18px;"><strong>Magnitude:</strong> ${eventDetails.magnitude.toFixed(1)}</p>
      <p style="font-size: 18px;"><strong>Location:</strong> ${eventDetails.location}</p>
      <p style="font-size: 18px;"><strong>Region:</strong> ${eventDetails.region}</p>
      <p style="font-size: 18px;"><strong>Depth:</strong> ${eventDetails.depth.toFixed(1)} km</p>
      <p style="font-size: 18px;"><strong>Time:</strong> ${formattedDate}</p>
      <p style="font-size: 14px; color: #666; margin-top: 30px;">
        This is an automated notification from the Regional Seismic Network System.
        Please check the dashboard for more detailed information.
      </p>
    </div>
  `;

  // For each recipient
  const results = await Promise.all(
    recipients.map(recipient => 
      sendEmail(apiKey, {
        to: recipient,
        fromName: 'Seismic Monitoring Network',
        fromEmail: 'alerts@seismicmonitor.example.com',
        subject,
        body: htmlBody,
        isHtml: true
      })
    )
  );

  // Return true only if all emails were sent successfully
  return results.every(result => result === true);
}

/**
 * Sends a maintenance notification email via Unisender
 */
export async function sendMaintenanceNotification(
  apiKey: string,
  recipients: string[],
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

  const subject = `Scheduled Maintenance: ${maintenanceDetails.stationName} (${maintenanceDetails.stationId})`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h1 style="color: #1976d2; margin-top: 0;">Scheduled Station Maintenance</h1>
      <p style="font-size: 18px;"><strong>Station:</strong> ${maintenanceDetails.stationName} (${maintenanceDetails.stationId})</p>
      <p style="font-size: 18px;"><strong>Maintenance Type:</strong> ${maintenanceDetails.maintenanceType}</p>
      <p style="font-size: 18px;"><strong>Scheduled Time:</strong> ${formattedDate}</p>
      <p style="font-size: 18px;"><strong>Description:</strong> ${maintenanceDetails.description}</p>
      <p style="font-size: 14px; color: #666; margin-top: 30px;">
        This is an automated notification from the Regional Seismic Network System.
        Please check the maintenance schedule in the dashboard for more information.
      </p>
    </div>
  `;

  // For each recipient
  const results = await Promise.all(
    recipients.map(recipient => 
      sendEmail(apiKey, {
        to: recipient,
        fromName: 'Seismic Network Maintenance',
        fromEmail: 'maintenance@seismicmonitor.example.com',
        subject,
        body: htmlBody,
        isHtml: true
      })
    )
  );

  // Return true only if all emails were sent successfully
  return results.every(result => result === true);
}

/**
 * Sends a low battery alert email via Unisender
 */
export async function sendLowBatteryAlert(
  apiKey: string,
  recipients: string[],
  stationDetails: {
    stationId: string;
    stationName: string;
    batteryLevel: number;
    batteryVoltage: number;
    estimatedRuntime: number; // hours
  }
): Promise<boolean> {
  
  const batteryLevelClass = stationDetails.batteryLevel < 20 ? 'critical' : 'warning';
  const subject = `${batteryLevelClass === 'critical' ? 'CRITICAL' : 'WARNING'}: Low Battery on ${stationDetails.stationName} (${stationDetails.stationId})`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h1 style="color: ${batteryLevelClass === 'critical' ? '#d32f2f' : '#ff9800'}; margin-top: 0;">
        Station Low Battery Alert
      </h1>
      <p style="font-size: 18px;"><strong>Station:</strong> ${stationDetails.stationName} (${stationDetails.stationId})</p>
      <p style="font-size: 18px;"><strong>Battery Level:</strong> 
        <span style="color: ${batteryLevelClass === 'critical' ? '#d32f2f' : '#ff9800'};">
          ${stationDetails.batteryLevel}%
        </span>
      </p>
      <p style="font-size: 18px;"><strong>Battery Voltage:</strong> ${stationDetails.batteryVoltage.toFixed(1)}V</p>
      <p style="font-size: 18px;"><strong>Estimated Runtime:</strong> ${stationDetails.estimatedRuntime.toFixed(1)} hours</p>
      <p style="font-size: 18px;"><strong>Action Required:</strong> 
        ${batteryLevelClass === 'critical' ? 
          'Immediate attention required. Station may shutdown soon.' : 
          'Plan maintenance to recharge or replace batteries.'}
      </p>
      <p style="font-size: 14px; color: #666; margin-top: 30px;">
        This is an automated notification from the Regional Seismic Network System.
        Please check the station status in the dashboard for more information.
      </p>
    </div>
  `;

  // For each recipient
  const results = await Promise.all(
    recipients.map(recipient => 
      sendEmail(apiKey, {
        to: recipient,
        fromName: 'Seismic Network Alerts',
        fromEmail: 'alerts@seismicmonitor.example.com',
        subject,
        body: htmlBody,
        isHtml: true
      })
    )
  );

  // Return true only if all emails were sent successfully
  return results.every(result => result === true);
}