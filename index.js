import { launch, TimeoutError } from 'puppeteer';
import { sendPushoverNotification } from './notify.js';

import dotenv from 'dotenv';
import path from 'path';

const env = process.env.NODE_ENV || 'development';
const sucessMessage = 'Appointments available! Go to https://bit.ly/4cFXN5E to schedule your appointment';
const failureMessage = 'No appointment slots available.';
const maxRetries = 5;
const timeOut = 30000; // 30 seconds
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });

const checkAppointmentAvailability = async () => {
    // Launch the browser
    const browser = await launch({
        headless: env !== 'development',
        timeout: 0, // This disables the default timeout for browser launch.
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        protocolTimeout: timeOut
    });
    try {
        const page = await browser.newPage();

        // Navigate to the URL
        await page.goto('https://www.exteriores.gob.es/Consulados/santiagodechile/es/ServiciosConsulares/Paginas/CitaPrevia.aspx');

        // Click on the "Solicitud de Cita" link
        const citaLink = 'https://www.citaconsular.es/es/hosteds/widgetdefault/24e329baaaf932b93de4fc7f95bc53535';
        await page.waitForSelector(`a[href="${citaLink}"]`);
        await page.click(`a[href="${citaLink}"]`);

        // Wait for the new page or tab to load
        const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
        const newPage = await newPagePromise;
        // Handle the alert by accepting it on the new page
        newPage.on('dialog', async dialog => {
            await dialog.accept();
        });
        // Wait for the button to be available and visible
        await newPage.waitForSelector('#idCaptchaButton', { visible: true, timeout: timeOut });
        // Click on the "Continue / Continuar" button
        await newPage.click('#idCaptchaButton');

        // Check for availability
        await newPage.waitForSelector('#idListServices', { visible: true, timeout: timeOut });
        const appointmentAvailable = await newPage.evaluate(() => {
            const widget = document.querySelector('#idListServices');
            return widget && widget.textContent.includes('LEY MEMORIA');
          });
       await browser.close();

       return appointmentAvailable;
    } catch (error) {
        browser.close(); // make sure we close even if we error, to avoid OOM
        throw error;
    }
}


const checkAppointmentAvailabilityAndNotify = async (maxRetries) => {
    let retries = maxRetries;
    let startTime;
    while (retries > 0) {
        try {
            startTime = Date.now();
            console.log(`Starting attempt #${maxRetries - retries + 1}`);
            const appointmentAvailable = await checkAppointmentAvailability();
            if (appointmentAvailable) {
                console.log('Appointment slots available!');
                await sendPushoverNotification(sucessMessage, 'Appointment Alert', 2);
                break; // Exit the loop if successful
            } else {
                console.log('No appointment slots available.');
                await sendPushoverNotification(failureMessage, 'Appointment Alert', -2);
                break; // Exit the loop if unsuccessful
            }
        } catch (error) {
            if (error instanceof TimeoutError) {
                console.log('A timeout error occurred:', error.message);
                retries--;
                if (retries === 0) {
                    console.log('Max retries reached, no more attempts.');
                }
            } else {
                console.error('An unexpected error occurred:', error);
                throw error;
            }
        } finally {
            const endTime = Date.now();
            console.log(`Time taken: ${(endTime - startTime) / 1000} seconds`);
        }
    }
}


(async () => {
    console.log('Starting App');
    console.log('Environment:', process.env.NODE_ENV);

    const spainTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', timeStyle: 'long', dateStyle: 'long' }).format(new Date());
    console.log('Current time in Spain:', spainTime);

    await checkAppointmentAvailabilityAndNotify(maxRetries);
})();
