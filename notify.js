import fetch from 'node-fetch';

const PUSHOVER_API_URL = 'https://api.pushover.net/1/messages.json';

async function sendPushoverNotification(message, title = 'Notification', priority = 0) {
    const token = process.env.PUSHOVER_APP_TOKEN; // Your Pushover application token
    const user = process.env.PUSHOVER_USER_KEY; // Your Pushover user key

    const params = new URLSearchParams();
    params.append('token', token);
    params.append('user', user);
    params.append('message', message);
    params.append('title', title);
    params.append('priority', priority);
    params.append('ttl', 86400); // expire messages after 1 day

    if (priority === 2) { // https://pushover.net/api#priority2
        params.append('retry', 60); // Notify user every minute
        params.append('expire', 1800); // Stop notifying after 30 minutes
    }

    try {
        const response = await fetch(PUSHOVER_API_URL, {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const data = await response.json();
        console.log('Notification sent:', data);
    } catch (error) {
        console.error('Failed to send notification:', error);
    }
}

export { sendPushoverNotification };
