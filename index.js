import { launch, TimeoutError } from 'puppeteer';
import { sendPushoverNotification } from './notify.js';

import dotenv from 'dotenv';
import path from 'path';

const env = process.env.NODE_ENV || 'development';
const sucessMessage = 'Appointments available! Go to https://bit.ly/4cFXN5E to schedule your appointment';
const failureMessage = 'No appointment slots available.';
const maxRetries = 3;
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) });

const checkAppointmentAvailability = async () => {
     // Launch the browser
     const browser = await launch({ headless: process.env.headless || true});
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
     await newPage.waitForSelector('#idCaptchaButton', { visible: true });
     // Click on the "Continue / Continuar" button
     await newPage.click('#idCaptchaButton');

     // Check for availability
     await newPage.waitForSelector('#idDivBktServicesContainer > div:nth-child(2)', { visible: true });
     const noAvailability = await newPage.evaluate(() => {
         const widget = document.querySelector('#idDivBktServicesContainer > div:nth-child(2)');
         return widget && widget.textContent.includes('No hay horas disponibles.');
       });

    await browser.close();

    return noAvailability;
}


const checkAppointmentAvailabilityAndNotify = async (maxRetries) => {
    const startTime = Date.now();
    let retries = maxRetries;
    while (retries > 0) {
        try {
            console.log(`Starting attempt #${maxRetries - retries + 1}`);
            const noAvailability = await checkAppointmentAvailability();
            if (!noAvailability) {
                console.log('Appointment slots available!');
                await sendPushoverNotification(sucessMessage, 'Appointment Alert', 2);
                retries = 0;
                break; // Exit the loop if successful
            } else {
                console.log('No appointment slots available.');
                await sendPushoverNotification(failureMessage, 'Appointment Alert', -2);
                retries = 0;
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
        }
    }
    const endTime = Date.now();
    console.log(`Time taken: ${(endTime - startTime) / 1000} seconds`);
}


(async () => {
    console.log('Starting App');
    console.log('Environment:', process.env.NODE_ENV);

    const spainTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', timeStyle: 'long', dateStyle: 'long' }).format(new Date());
    console.log('Current time in Spain:', spainTime);

    await checkAppointmentAvailabilityAndNotify(maxRetries);
})();
